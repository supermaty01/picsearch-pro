/**
 * Display a relevance score without flattening the cross-encoder's small-value
 * range to "0.000": bge-reranker confidences for semantic (non-lexical) matches
 * routinely land below 0.001, where fixed 3-decimal formatting erases the
 * ordering the user is meant to see.
 */
export function formatScore(score: number): string {
  if (score >= 0.001) return score.toFixed(3);
  if (score > 0) return score.toPrecision(1);
  return '0.000';
}
