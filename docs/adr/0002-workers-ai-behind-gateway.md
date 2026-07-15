# ADR-0002: All inference on Cloudflare Workers AI, behind AI Gateway

- **Status:** Accepted (2026-07-15)

## Context
The stack requires an LLM with vision, embeddings, a function-calling agent model and a reranker at $0/month. OpenAI was considered but has no free tier.

## Decision
Run all four roles on Workers AI (native `env.AI` binding), fronted by Cloudflare AI Gateway for caching, analytics, retries and rate limiting. Models (verified against the July 2026 catalog and the 2026-05-30 deprecation list):
vision `@cf/meta/llama-4-scout-17b-16e-instruct` · embeddings `@cf/baai/bge-small-en-v1.5` (384-dim) · agent `@cf/zai-org/glm-4.7-flash` · reranker `@cf/baai/bge-reranker-base`.

## Consequences
+ Zero keys to leak, zero vendors to bill, lowest latency (same edge as the Worker), benchmark re-runs cached by the Gateway.
+ Model IDs centralized in `packages/shared/src/models.ts`; swapping is one line (NFR-7).
− Open-weight models trail frontier closed models in raw quality — acceptable: the project measures relative layer impact, not absolute SOTA.
− Free-tier neuron quota bounds benchmark frequency; mitigated by Gateway caching.
