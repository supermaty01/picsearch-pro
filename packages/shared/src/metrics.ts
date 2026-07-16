/**
 * Retrieval metrics (FR-14, docs/06). Pure, dependency-free functions — the unit
 * of truth the benchmark is judged by, so they are tested against hand-computed
 * fixtures (AGENTS §6). All functions treat ids as opaque strings.
 */

/**
 * Recall@K for one query: fraction of the query's expected images that appear in
 * the top-K ranked results. Binary for single-target queries; fractional for
 * multi-concept ones (e.g. 1 of 2 found → 0.5).
 */
export function recallAtK(rankedIds: string[], expectedIds: string[], k: number): number {
  if (expectedIds.length === 0) return 0;
  const topK = new Set(rankedIds.slice(0, k));
  const found = expectedIds.filter((id) => topK.has(id)).length;
  return found / expectedIds.length;
}

/**
 * Reciprocal rank for one query: 1 / (1-based rank of the first expected image)
 * within the top-K, or 0 if none appears.
 */
export function reciprocalRankAtK(rankedIds: string[], expectedIds: string[], k: number): number {
  const expected = new Set(expectedIds);
  const limit = Math.min(k, rankedIds.length);
  for (let i = 0; i < limit; i += 1) {
    const id = rankedIds[i];
    if (id !== undefined && expected.has(id)) return 1 / (i + 1);
  }
  return 0;
}

export interface QueryMetrics {
  recallAt3: number;
  recallAt5: number;
  reciprocalRank: number;
}

/** Per-query metric bundle (Recall@3, Recall@5, RR@5). */
export function queryMetrics(rankedIds: string[], expectedIds: string[]): QueryMetrics {
  return {
    recallAt3: recallAtK(rankedIds, expectedIds, 3),
    recallAt5: recallAtK(rankedIds, expectedIds, 5),
    reciprocalRank: reciprocalRankAtK(rankedIds, expectedIds, 5),
  };
}

export interface AggregateMetrics {
  recallAt3: number;
  recallAt5: number;
  mrr: number;
}

/** Mean of per-query metrics across a strategy's run (MRR = mean RR). */
export function aggregateMetrics(perQuery: QueryMetrics[]): AggregateMetrics {
  if (perQuery.length === 0) return { recallAt3: 0, recallAt5: 0, mrr: 0 };
  const sum = perQuery.reduce(
    (acc, m) => ({
      recallAt3: acc.recallAt3 + m.recallAt3,
      recallAt5: acc.recallAt5 + m.recallAt5,
      mrr: acc.mrr + m.reciprocalRank,
    }),
    { recallAt3: 0, recallAt5: 0, mrr: 0 },
  );
  const n = perQuery.length;
  return { recallAt3: sum.recallAt3 / n, recallAt5: sum.recallAt5 / n, mrr: sum.mrr / n };
}
