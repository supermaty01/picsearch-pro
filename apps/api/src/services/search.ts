import { MODELS, type SearchResponse, type SearchResultItem } from '@picsearch/shared';

import { type Env } from '../env.js';
import { timed } from '../lib/timed.js';
import { mergeCandidates } from '../lib/merge.js';
import { routeQuery } from '../agent/orchestrator.js';
import { embed } from './embedding.js';
import {
  type Candidate,
  DEFAULT_WEIGHTS,
  hybridSearch,
  type SearchWeights,
} from './hybrid-search.js';
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
 */
export async function retrieve(
  env: Env,
  queries: string[],
  weights: SearchWeights = DEFAULT_WEIGHTS,
): Promise<RetrieveResult> {
  let embeddingMs = 0;
  let vectorSearchMs = 0;
  const lists: Candidate[][] = [];

  for (const q of queries) {
    const embedding = await timed(() => embed(env, q));
    embeddingMs += embedding.ms;
    const search = await timed(() =>
      hybridSearch(env, { embedding: embedding.value, queryText: q, weights }),
    );
    vectorSearchMs += search.ms;
    lists.push(search.value);
  }

  return { candidates: mergeCandidates(lists), embeddingMs, vectorSearchMs };
}

export interface SearchOptions {
  /** Defer a fire-and-forget side effect (telemetry) via `ctx.waitUntil`. */
  defer?: (promise: Promise<unknown>) => void;
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
  const reranked = await timed(() => rerank(env, query, candidates));

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
