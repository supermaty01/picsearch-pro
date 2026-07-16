import { describe, expect, it } from 'vitest';

import { mergeCandidates } from '../src/lib/merge.js';
import { type Candidate } from '../src/services/hybrid-search.js';
import { validMetadata } from './helpers.js';

function cand(id: string, score: number): Candidate {
  return {
    id,
    imageUrl: `https://cdn.test/${id}.jpg`,
    denseContext: `context ${id}`,
    metadata: validMetadata,
    score,
  };
}

describe('mergeCandidates (decomposed route merge/dedupe)', () => {
  it('deduplicates by id keeping the max score', () => {
    const merged = mergeCandidates([
      [cand('a', 0.3), cand('b', 0.1)],
      [cand('a', 0.9), cand('c', 0.2)],
    ]);
    expect(merged.map((c) => c.id)).toEqual(['a', 'c', 'b']);
    expect(merged.find((c) => c.id === 'a')?.score).toBe(0.9);
  });

  it('is stable on score ties (orders by id)', () => {
    const merged = mergeCandidates([[cand('z', 0.5), cand('a', 0.5)]]);
    expect(merged.map((c) => c.id)).toEqual(['a', 'z']);
  });

  it('returns [] for empty input', () => {
    expect(mergeCandidates([])).toEqual([]);
    expect(mergeCandidates([[], []])).toEqual([]);
  });
});
