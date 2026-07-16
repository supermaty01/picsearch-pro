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
  /**
   * Hard cap on the rerank document (`buildRerankContext`) per candidate.
   * Cross-encoder attention is quadratic in sequence length; the compact
   * document keeps latency roughly half of scoring the full dense_context
   * while preserving the discriminative fields (FR-9).
   */
  rerankContextChars: 1200,
} as const;

/** Hybrid-search weight presets. Strategy variants parameterize ONE SQL code path (ADR-0003). */
export interface SearchWeights {
  vectorWeight: number;
  keywordWeight: number;
}

/** Strategy B–D: balanced vector + keyword fusion. */
export const DEFAULT_WEIGHTS: SearchWeights = { vectorWeight: 0.5, keywordWeight: 0.5 };
/** Strategy A (vector only): keyword_weight => 0. */
export const VECTOR_ONLY_WEIGHTS: SearchWeights = { vectorWeight: 1, keywordWeight: 0 };
