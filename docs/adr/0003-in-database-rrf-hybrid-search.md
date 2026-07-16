# ADR-0003: Hybrid retrieval fused in-database with weighted RRF

- **Status:** Accepted (2026-07-15)

## Context

Need vector similarity + lexical precision. Alternatives: fuse in application code, use an external search engine (Typesense/Meilisearch), or fuse in Postgres.

## Decision

One plpgsql function `hybrid_search` combining a pgvector cosine ranking (HNSW) and an FTS ranking (GIN, `websearch_to_tsquery`) via weighted Reciprocal Rank Fusion (k=60). Weights are parameters.

## Consequences

- Single round trip; testable from the SQL editor in isolation; benchmark strategies A and B reuse the same function via weights — one code path.
- No extra infrastructure (NFR-1).
  − plpgsql is less unit-testable than TS; mitigated by SQL-level test cases in Phase 1 acceptance criteria.
