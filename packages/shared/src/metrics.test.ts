import { describe, expect, it } from 'vitest';

import { aggregateMetrics, queryMetrics, recallAtK, reciprocalRankAtK } from './metrics.js';

const ranked = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('recallAtK', () => {
  it('is 1 when the single expected id is within K', () => {
    expect(recallAtK(ranked, ['c'], 3)).toBe(1); // c is rank 3
  });
  it('is 0 when the expected id is outside K', () => {
    expect(recallAtK(ranked, ['f'], 3)).toBe(0);
    expect(recallAtK(ranked, ['f'], 5)).toBe(0);
  });
  it('is fractional for multi-concept queries', () => {
    expect(recallAtK(ranked, ['a', 'd'], 3)).toBe(0.5); // a in, d out
    expect(recallAtK(ranked, ['a', 'd'], 5)).toBe(1); // both in
  });
  it('is 0 with no expected ids', () => {
    expect(recallAtK(ranked, [], 5)).toBe(0);
  });
});

describe('reciprocalRankAtK', () => {
  it('is 1 / rank of the first expected id', () => {
    expect(reciprocalRankAtK(ranked, ['c'], 5)).toBeCloseTo(1 / 3);
    expect(reciprocalRankAtK(ranked, ['a', 'd'], 5)).toBe(1); // first hit at rank 1
  });
  it('is 0 when no expected id is within K', () => {
    expect(reciprocalRankAtK(ranked, ['f'], 5)).toBe(0);
  });
});

describe('aggregateMetrics', () => {
  it('averages per-query metrics (MRR = mean reciprocal rank)', () => {
    const perQuery = [queryMetrics(ranked, ['c']), queryMetrics(ranked, ['f'])];
    const agg = aggregateMetrics(perQuery);
    expect(agg.recallAt3).toBe(0.5); // (1 + 0) / 2
    expect(agg.recallAt5).toBe(0.5);
    expect(agg.mrr).toBeCloseTo((1 / 3 + 0) / 2); // 1/6
  });
  it('is all zero for an empty run', () => {
    expect(aggregateMetrics([])).toEqual({ recallAt3: 0, recallAt5: 0, mrr: 0 });
  });
});
