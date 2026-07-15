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
