/**
 * Central model registry (NFR-7). This is the ONLY place model IDs may appear.
 * All models run on Cloudflare Workers AI free tier (see docs/adr/0002).
 * Verified against the Workers AI catalog and the 2026-05-30 deprecation list.
 */
export const MODELS = {
  /** Vision: image -> structured JSON metadata (ingestion, FR-2). */
  vision: '@cf/meta/llama-4-scout-17b-16e-instruct',
  /** Embeddings: dense_context -> 384-dim vector (FR-4). */
  embedding: '@cf/baai/bge-small-en-v1.5',
  /** Orchestrator agent: query routing via function calling (FR-7). */
  agent: '@cf/zai-org/glm-4.7-flash',
  /** Cross-encoder reranker (FR-9). */
  reranker: '@cf/baai/bge-reranker-base',
} as const;

export type ModelRole = keyof typeof MODELS;

/**
 * Embedding dimension of MODELS.embedding.
 * MUST stay in sync with `vector(384)` in supabase/migrations/0001_init.sql.
 */
export const EMBEDDING_DIM = 384;

/** Retrieval constants shared by API, SQL callers, and the evaluation framework. */
export const RETRIEVAL = {
  /** Candidates fetched from hybrid_search before reranking. */
  candidateCount: 15,
  /** Final results returned to the client after reranking. */
  resultCount: 5,
  /** RRF constant (literature default). */
  rrfK: 60,
  /** Max sub-queries the agent may decompose into (ADR-0004). */
  maxSubQueries: 3,
} as const;
