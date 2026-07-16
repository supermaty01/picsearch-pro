import { describe, expect, it } from 'vitest';

import { interleaveCandidates, mergeCandidates } from '../src/lib/merge.js';
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

describe('interleaveCandidates (decomposed route round-robin)', () => {
  it('alternates the top of each sub-query ranking', () => {
    // "a cat image and a pig image": each sub-query's best must surface at the
    // top, not be buried by the other sub-query's weaker matches.
    const cats = [cand('cat1', 0.9), cand('cat2', 0.4)];
    const pigs = [cand('pig1', 0.8), cand('pig2', 0.3)];
    const merged = interleaveCandidates([cats, pigs], 5);
    expect(merged.map((c) => c.id)).toEqual(['cat1', 'pig1', 'cat2', 'pig2']);
  });

  it('deduplicates across lists, keeping the earliest (best) slot', () => {
    const q1 = [cand('shared', 0.9), cand('a', 0.5)];
    const q2 = [cand('b', 0.8), cand('shared', 0.2)];
    const merged = interleaveCandidates([q1, q2], 5);
    expect(merged.map((c) => c.id)).toEqual(['shared', 'b', 'a']);
  });

  it('respects the limit', () => {
    const q1 = [cand('a', 0.9), cand('c', 0.7)];
    const q2 = [cand('b', 0.8), cand('d', 0.6)];
    expect(interleaveCandidates([q1, q2], 3).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles uneven and empty lists', () => {
    expect(interleaveCandidates([[cand('a', 0.5)], []], 5).map((c) => c.id)).toEqual(['a']);
    expect(interleaveCandidates([], 5)).toEqual([]);
  });
});
