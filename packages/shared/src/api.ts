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

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
