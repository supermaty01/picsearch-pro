import { z } from 'zod';

/**
 * Evaluation contracts (FR-13..FR-15, docs/06). Four strategies isolate each
 * layer's contribution; C vs D is the headline (the agent's measured value).
 */
export const STRATEGY_IDS = ['A', 'B', 'C', 'D'] as const;
export const strategyIdSchema = z.enum(STRATEGY_IDS);
export type StrategyId = z.infer<typeof strategyIdSchema>;

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  A: 'Vector only',
  B: 'Hybrid (vector + FTS)',
  C: 'Hybrid + rerank',
  D: 'Agent + hybrid + rerank',
};

export const queryCategorySchema = z.enum(['direct', 'noisy', 'multi-concept', 'ambiguous']);
export type QueryCategory = z.infer<typeof queryCategorySchema>;

/** One ground-truth query (test-dataset/ground-truth.json). */
export const groundTruthQuerySchema = z.object({
  id: z.string(),
  category: queryCategorySchema,
  query: z.string().min(1),
  /** Stable image slugs (mapped to real ids at seed time). `*` = no target. */
  expectedImageIds: z.array(z.string()).min(1),
  expectClarification: z.boolean().optional(),
});
export type GroundTruthQuery = z.infer<typeof groundTruthQuerySchema>;

export const groundTruthSchema = z.object({
  queries: z.array(groundTruthQuerySchema).min(1),
});
export type GroundTruth = z.infer<typeof groundTruthSchema>;

// --- API payloads -----------------------------------------------------------

export const benchmarkRequestSchema = z.object({
  strategies: z.array(strategyIdSchema).min(1).optional(),
});
export type BenchmarkRequest = z.infer<typeof benchmarkRequestSchema>;

export const benchmarkStartResponseSchema = z.object({ runId: z.uuid() });
export type BenchmarkStartResponse = z.infer<typeof benchmarkStartResponseSchema>;

export const perQueryResultSchema = z.object({
  queryId: z.string(),
  queryText: z.string(),
  category: queryCategorySchema,
  recallAt3: z.number(),
  recallAt5: z.number(),
  reciprocalRank: z.number(),
  clarified: z.boolean(),
});
export type PerQueryResult = z.infer<typeof perQueryResultSchema>;

export const strategyReportSchema = z.object({
  strategy: strategyIdSchema,
  label: z.string(),
  recallAt3: z.number(),
  recallAt5: z.number(),
  mrr: z.number(),
  p50LatencyMs: z.number().int().nonnegative(),
  perQuery: z.array(perQueryResultSchema),
});
export type StrategyReport = z.infer<typeof strategyReportSchema>;

export const benchmarkReportSchema = z.object({
  runId: z.uuid(),
  startedAt: z.string(),
  completedAt: z.string(),
  strategies: z.array(strategyReportSchema),
});
export type BenchmarkReport = z.infer<typeof benchmarkReportSchema>;

export const benchmarkStatusResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('running'), progress: z.number().min(0).max(1) }),
  z.object({ status: z.literal('done'), results: benchmarkReportSchema }),
  z.object({ status: z.literal('error'), detail: z.string() }),
]);
export type BenchmarkStatusResponse = z.infer<typeof benchmarkStatusResponseSchema>;
