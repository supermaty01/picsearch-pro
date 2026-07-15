import { z } from 'zod';

import { imageMetadataSchema } from './image-metadata.js';

/** Route chosen by the orchestrator agent (FR-7). */
export const agentActionSchema = z.enum([
  'direct',
  'reformulate',
  'decompose',
  'ask_context',
  'agent_fallback',
]);
export type AgentAction = z.infer<typeof agentActionSchema>;

export const searchRequestSchema = z.object({
  query: z.string().trim().min(2).max(500),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const searchResultItemSchema = z.object({
  id: z.uuid(),
  imageUrl: z.url(),
  denseContext: z.string(),
  score: z.number(),
  metadata: imageMetadataSchema,
});
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;

export const searchTelemetrySchema = z.object({
  agentDecisionMs: z.number().int().nonnegative(),
  embeddingMs: z.number().int().nonnegative(),
  vectorSearchMs: z.number().int().nonnegative(),
  rerankMs: z.number().int().nonnegative(),
  executionTimeMs: z.number().int().nonnegative(),
  rerankSkipped: z.boolean(),
});
export type SearchTelemetry = z.infer<typeof searchTelemetrySchema>;

/**
 * Discriminated union: a search either returns results or a clarifying
 * question (agent route `ask_for_context`). The UI must switch on `kind`
 * exhaustively (docs/08).
 */
export const searchResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('results'),
    agent: z.object({
      action: agentActionSchema,
      resolvedQueries: z.array(z.string()).min(1),
    }),
    results: z.array(searchResultItemSchema),
    telemetry: searchTelemetrySchema,
  }),
  z.object({
    kind: z.literal('clarification'),
    agent: z.object({ action: z.literal('ask_context') }),
    question: z.string().min(1),
  }),
]);
export type SearchResponse = z.infer<typeof searchResponseSchema>;

// --- Telemetry (FR-11, FR-12) -----------------------------------------------

export const telemetryRecordSchema = z.object({
  id: z.uuid(),
  queryText: z.string(),
  agentAction: agentActionSchema,
  resolvedQueries: z.array(z.string()),
  agentDecisionMs: z.number().int().nonnegative(),
  embeddingMs: z.number().int().nonnegative(),
  vectorSearchMs: z.number().int().nonnegative(),
  rerankMs: z.number().int().nonnegative(),
  executionTimeMs: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative().nullable(),
  modelProvider: z.string(),
  rerankSkipped: z.boolean(),
  createdAt: z.string(),
});
export type TelemetryRecord = z.infer<typeof telemetryRecordSchema>;

export const telemetryListResponseSchema = z.object({
  items: z.array(telemetryRecordSchema),
});
export type TelemetryListResponse = z.infer<typeof telemetryListResponseSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  version: z.string(),
  checks: z.object({
    db: z.boolean(),
    storage: z.boolean(),
    ai: z.boolean(),
  }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/**
 * RFC 9457 problem+json body returned at every API error boundary (AGENTS §5).
 * `type` is a stable slug the UI can switch on; `detail` is human-readable.
 */
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  requestId: z.string(),
});
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

// --- Ingestion (FR-1..FR-5) -------------------------------------------------

export const ingestTimingsSchema = z.object({
  visionMs: z.number().int().nonnegative(),
  embeddingMs: z.number().int().nonnegative(),
  totalMs: z.number().int().nonnegative(),
});
export type IngestTimings = z.infer<typeof ingestTimingsSchema>;

export const ingestResponseSchema = z.object({
  id: z.uuid(),
  imageUrl: z.url(),
  metadata: imageMetadataSchema,
  denseContext: z.string(),
  timings: ingestTimingsSchema,
});
export type IngestResponse = z.infer<typeof ingestResponseSchema>;

// --- Gallery listing (GET /images) ------------------------------------------

export const imageSummarySchema = z.object({
  id: z.uuid(),
  imageUrl: z.url(),
  denseContext: z.string(),
  metadata: imageMetadataSchema,
  createdAt: z.string(),
});
export type ImageSummary = z.infer<typeof imageSummarySchema>;

export const imageListResponseSchema = z.object({
  items: z.array(imageSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ImageListResponse = z.infer<typeof imageListResponseSchema>;
