# ADR-0005: On-platform cross-encoder reranker (bge-reranker-base)

- **Status:** Accepted (2026-07-15)

## Context

Cross-encoder reranking needs a model scoring (query, passage) pairs jointly. Options: Cohere Rerank (best quality, trial-tier limits, external key), Jina (free tier, external key), Workers AI `@cf/baai/bge-reranker-base` (free, on-platform).

## Decision

`@cf/baai/bge-reranker-base` on Workers AI.

## Consequences

- No external vendor/key; same edge → lowest added latency; consistent with ADR-0002.
- Failure degradation is trivial to own: on error, return RRF order flagged `rerankSkipped`.
  − Lower ceiling than Cohere v3.5; acceptable because the benchmark measures the rerank layer's relative lift, and the interface (`rerank(query, docs) → scores`) allows swapping via NFR-7 if results disappoint.
