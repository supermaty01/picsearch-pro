import { buildRerankContext, MODELS, RETRIEVAL } from '@picsearch/shared';
import { z } from 'zod';

import { type Env } from '../env.js';
import { aiRun } from '../lib/ai.js';
import { withTimeout } from '../lib/timed.js';
import { type Candidate } from './hybrid-search.js';

/**
 * Cross-encoder reranking (FR-9). Scores (query, dense_context) jointly and
 * returns the top-K. Degradation ladder (AGENTS §4): any failure or timeout →
 * return the RRF order unchanged with `skipped: true`. Search never fails
 * because the reranker did.
 */
const RERANK_TIMEOUT_MS = 3000;

const rerankResponseSchema = z.object({
  response: z.array(z.object({ id: z.number().int(), score: z.number() })),
});

export interface RerankOutcome {
  results: Candidate[];
  skipped: boolean;
}

export async function rerank(
  env: Env,
  query: string,
  candidates: Candidate[],
): Promise<RerankOutcome> {
  if (candidates.length === 0) return { results: [], skipped: false };

  try {
    return await withTimeout(
      () => scoreAndOrder(env, query, candidates),
      RERANK_TIMEOUT_MS,
      () => new Error('rerank timed out'),
    );
  } catch {
    // Degrade: keep RRF order, flag it (docs/02 §6).
    return { results: candidates.slice(0, RETRIEVAL.resultCount), skipped: true };
  }
}

async function scoreAndOrder(
  env: Env,
  query: string,
  candidates: Candidate[],
): Promise<RerankOutcome> {
  // The cross-encoder scores a purpose-built compact document, not the full
  // dense_context: shorter input (quadratic cost) without losing the
  // discriminative style/keywords fields that sit at the END of dense_context.
  const raw = await aiRun(env, MODELS.reranker, {
    query,
    contexts: candidates.map((c) => ({
      text: buildRerankContext(c.metadata).slice(0, RETRIEVAL.rerankContextChars),
    })),
    top_k: RETRIEVAL.resultCount,
  });

  const parsed = rerankResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { results: candidates.slice(0, RETRIEVAL.resultCount), skipped: true };
  }

  const reordered = parsed.data.response
    .filter((r) => r.id >= 0 && r.id < candidates.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVAL.resultCount)
    .map((r) => {
      const candidate = candidates[r.id];
      if (candidate === undefined) throw new Error('rerank index out of range');
      return { ...candidate, score: r.score };
    });

  // A valid-but-empty ranking is treated as a skip so callers still get results.
  if (reordered.length === 0) {
    return { results: candidates.slice(0, RETRIEVAL.resultCount), skipped: true };
  }
  return { results: reordered, skipped: false };
}
