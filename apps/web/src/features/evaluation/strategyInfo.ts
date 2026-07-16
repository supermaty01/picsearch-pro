import { type StrategyId } from '@picsearch/shared';

/**
 * Explanatory copy for the benchmark dashboard (FR-14). Layer tables and metric
 * definitions live here so the chart components stay purely presentational.
 */
export interface StrategyInfo {
  /** Which pipeline layers this strategy exercises. */
  layers: { agent: boolean; keyword: boolean; rerank: boolean };
  /** What the strategy isolates, in one sentence. */
  purpose: string;
}

export const STRATEGY_INFO: Record<StrategyId, StrategyInfo> = {
  A: {
    layers: { agent: false, keyword: false, rerank: false },
    purpose: 'Baseline: embedding similarity alone, no keyword signal, no reranking.',
  },
  B: {
    layers: { agent: false, keyword: true, rerank: false },
    purpose: 'Adds keyword full-text search fused with vectors via RRF — measures hybrid gain.',
  },
  C: {
    layers: { agent: false, keyword: true, rerank: true },
    purpose: 'Adds the cross-encoder on top of hybrid — measures reranking gain.',
  },
  D: {
    layers: { agent: true, keyword: true, rerank: true },
    purpose: 'The full pipeline: the agent routes/rewrites the query first — measures agent gain.',
  },
};

export interface MetricInfo {
  name: string;
  definition: string;
}

export const METRIC_INFO: MetricInfo[] = [
  {
    name: 'MRR',
    definition:
      'Mean Reciprocal Rank: averages 1/rank of the first expected image across all queries. 1.00 = always first; 0.50 = second on average; 0 = never found.',
  },
  {
    name: 'Recall@5',
    definition:
      'Share of queries whose expected image appears anywhere in the top 5 results. 1.00 = every query finds its target.',
  },
  {
    name: 'p50 latency',
    definition:
      'Median end-to-end time per query for the strategy — the price paid for each extra layer.',
  },
];
