import {
  DEFAULT_WEIGHTS,
  MODELS,
  type SearchResponse,
  type SearchResultItem,
  type SearchWeights,
} from '@picsearch/shared';

import { type Env } from '../env.js';
import { timed } from '../lib/timed.js';
import { mergeCandidates } from '../lib/merge.js';
import { routeQuery } from '../agent/orchestrator.js';
import { embed } from './embedding.js';
import { type Candidate, hybridSearch } from './hybrid-search.js';
import { rerank } from './rerank.js';
import { insertTelemetry } from './telemetry.js';

/** `workers-ai/<short model id>` for telemetry (docs/03). */
const AGENT_PROVIDER = `workers-ai/${MODELS.agent.split('/').pop() ?? MODELS.agent}`;

export interface RetrieveResult {
  candidates: Candidate[];
  embeddingMs: number;
  vectorSearchMs: number;
}

/**
 * Embed each query and run `hybrid_search`, merging results (FR-8). Shared by the
 * user search path and the benchmark strategies — the ONLY difference between
 * strategies is `weights` and whether rerank runs (docs/06). One code path.
 *
 * Sub-queries run concurrently (at most `RETRIEVAL.maxSubQueries`), so a
 * decomposed query costs roughly one retrieval round-trip, not three. The
 * telemetry fields keep summing per-stage time across sub-queries.
 */
export async function retrieve(
  env: Env,
  queries: string[],
  weights: SearchWeights = DEFAULT_WEIGHTS,
): Promise<RetrieveResult> {
  const perQuery = await Promise.all(
    queries.map(async (q) => {
      const embedding = await timed(() => embed(env, q));
      const search = await timed(() =>
        hybridSearch(env, { embedding: embedding.value, queryText: q, weights }),
      );
      return { list: search.value, embeddingMs: embedding.ms, vectorSearchMs: search.ms };
    }),
  );

  return {
    candidates: mergeCandidates(perQuery.map((r) => r.list)),
    embeddingMs: perQuery.reduce((sum, r) => sum + r.embeddingMs, 0),
    vectorSearchMs: perQuery.reduce((sum, r) => sum + r.vectorSearchMs, 0),
  };
}

export interface SearchOptions {
  /** Defer a fire-and-forget side effect (telemetry) via `ctx.waitUntil`. */
  defer?: (promise: Promise<unknown>) => void;
}

/**
 * The text the cross-encoder scores against. A single resolved query (direct or
 * reformulated) is the cleaned statement of intent — scoring the raw query
 * instead would undo the agent's typo/slang/terseness fixes at the rerank
 * stage. Decomposed queries diverge from each other, so the original query is
 * the only text that covers the merged candidate set.
 */
export function rerankQueryFor(originalQuery: string, resolvedQueries: string[]): string {
  return resolvedQueries.length === 1 ? (resolvedQueries[0] ?? originalQuery) : originalQuery;
}

/**
 * User-facing search (FR-6..FR-11): agent route → retrieve → rerank → telemetry.
 * Always returns a valid `SearchResponse`; optional layers degrade rather than
 * fail (AGENTS §4). Telemetry is written for every search, including
 * clarifications and fallbacks.
 */
export async function runSearch(
  env: Env,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const start = Date.now();
  const agent = await routeQuery(env, query);

  // Clarification path — no retrieval, but still logged (FR-11).
  if (agent.decision.kind === 'clarification') {
    persist(env, options, {
      queryText: query,
      agentAction: agent.action,
      resolvedQueries: [],
      agentDecisionMs: agent.ms,
      embeddingMs: 0,
      vectorSearchMs: 0,
      rerankMs: 0,
      executionTimeMs: Date.now() - start,
      tokensUsed: agent.tokensUsed,
      modelProvider: AGENT_PROVIDER,
      rerankSkipped: false,
    });
    return {
      kind: 'clarification',
      agent: { action: 'ask_context' },
      question: agent.decision.question,
    };
  }

  const resolvedQueries = agent.decision.queries;
  const { candidates, embeddingMs, vectorSearchMs } = await retrieve(env, resolvedQueries);
  const reranked = await timed(() =>
    rerank(env, rerankQueryFor(query, resolvedQueries), candidates),
  );

  const results: SearchResultItem[] = reranked.value.results.map((c) => ({
    id: c.id,
    imageUrl: c.imageUrl,
    denseContext: c.denseContext,
    score: c.score,
    metadata: c.metadata,
  }));

  const executionTimeMs = Date.now() - start;
  persist(env, options, {
    queryText: query,
    agentAction: agent.action,
    resolvedQueries,
    agentDecisionMs: agent.ms,
    embeddingMs,
    vectorSearchMs,
    rerankMs: reranked.ms,
    executionTimeMs,
    tokensUsed: agent.tokensUsed,
    modelProvider: AGENT_PROVIDER,
    rerankSkipped: reranked.value.skipped,
  });

  return {
    kind: 'results',
    agent: { action: agent.action, resolvedQueries },
    results,
    telemetry: {
      agentDecisionMs: agent.ms,
      embeddingMs,
      vectorSearchMs,
      rerankMs: reranked.ms,
      executionTimeMs,
      rerankSkipped: reranked.value.skipped,
    },
  };
}

function persist(
  env: Env,
  options: SearchOptions,
  row: Parameters<typeof insertTelemetry>[1],
): void {
  const promise = insertTelemetry(env, row);
  if (options.defer) options.defer(promise);
  else void promise;
}
