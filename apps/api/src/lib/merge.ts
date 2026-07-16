import { type Candidate } from '../services/hybrid-search.js';

/**
 * Merge candidate lists from decomposed sub-queries, deduplicating by image id
 * and keeping the MAX score per image (docs/02 §5). Pure and dependency-free so
 * it can be unit-tested directly (AGENTS §5). Stable order: score desc, then id
 * for deterministic ties.
 */
export function mergeCandidates(lists: Candidate[][]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const list of lists) {
    for (const candidate of list) {
      const existing = best.get(candidate.id);
      if (existing === undefined || candidate.score > existing.score) {
        best.set(candidate.id, candidate);
      }
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/**
 * Round-robin interleave of per-sub-query rankings for the decomposed route.
 * Each list is already ordered best-first FOR ITS OWN sub-query; taking one from
 * each list in turn guarantees every sub-intent is represented near the top
 * (rank 1 of q1, rank 1 of q2, rank 2 of q1, …). Deduplicated by id — an image
 * matching two sub-queries keeps its earliest (best) slot. Capped at `limit`.
 *
 * This is why decomposed queries rerank per sub-query and interleave instead of
 * scoring the merged pool against the combined query: no single image satisfies
 * "a cat AND a pig", so a combined-query rerank scores every candidate as a
 * half-match and collapses the ranking to noise.
 */
export function interleaveCandidates(lists: Candidate[][], limit: number): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const maxLen = lists.reduce((max, list) => Math.max(max, list.length), 0);

  for (let rank = 0; rank < maxLen && out.length < limit; rank++) {
    for (const list of lists) {
      const candidate = list[rank];
      if (candidate === undefined || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      out.push(candidate);
      if (out.length >= limit) break;
    }
  }
  return out;
}
