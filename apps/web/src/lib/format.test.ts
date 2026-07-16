import { describe, expect, it } from 'vitest';

import { formatScore } from './format.js';

describe('formatScore', () => {
  it('keeps three decimals for scores at or above 0.001', () => {
    expect(formatScore(0.912)).toBe('0.912');
    expect(formatScore(0.027)).toBe('0.027');
    expect(formatScore(0.001)).toBe('0.001');
  });

  it('preserves one significant digit for tiny positive scores', () => {
    expect(formatScore(0.0004)).toBe('0.0004');
    expect(formatScore(0.00003)).toBe('0.00003');
  });

  it('renders zero and negatives as a flat zero', () => {
    expect(formatScore(0)).toBe('0.000');
    expect(formatScore(-0.5)).toBe('0.000');
  });
});
