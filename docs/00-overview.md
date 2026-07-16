# PicSearch Pro — Project Overview

> **Status:** Phases 1–6 implemented — ingestion, agentic retrieval, reranking, telemetry, evaluation, and the React UI are built and pass the full quality gate. Live deployment requires the human cloud setup in [09-setup-guide.md](./09-setup-guide.md).
> **Last updated:** 2026-07-15

## What it is

A production-grade **image semantic search engine** built as a portfolio showcase of modern AI Engineering. Users upload images; a vision model extracts structured metadata; a hybrid retrieval pipeline (vector + full-text) serves queries that are first routed through an **orchestrator agent** which decides _how_ to resolve each query. A **cross-encoder reranker** refines results, and a built-in **evaluation framework** (MRR, Recall@K) proves the measurable impact of every layer.

## Why it stands out

Most portfolio RAG projects are static pipelines. This one demonstrates:

1. **Agentic orchestration** — an LLM agent with function calling routes each query (direct / reformulate / decompose / ask-for-context) _before_ retrieval. This matches the 2026 industry pattern known as Adaptive RAG: classify query complexity, route to the appropriate retrieval strategy.
2. **Hybrid retrieval** — pgvector cosine similarity fused with Postgres full-text search via weighted Reciprocal Rank Fusion (RRF), in a single SQL function.
3. **Cross-encoder reranking** — a genuine two-stage retrieval architecture.
4. **Evaluation-driven engineering** — an in-app benchmark compares 4 strategies (vector-only → full agentic pipeline) with MRR and Recall@K, isolating the contribution of each layer. The agent's value is _measured_, not asserted.
5. **Observability** — per-query telemetry (agent decision, latency per stage, tokens, model) persisted and visualized live.
6. **Zero-cost production hosting** — everything runs on free tiers (Cloudflare Pages/Workers/Workers AI, Supabase).

## Goals

- G1: End-to-end working product deployed publicly on free tiers.
- G2: Every architectural layer justified by a measurable quality metric.
- G3: Codebase impeccable enough to be reviewed line-by-line by a technical recruiter.
- G4: 100% AI-driven development, governed by the rules in [`AGENTS.md`](../AGENTS.md).

## Non-goals

- Multi-tenant auth / user accounts (single public demo gallery).
- Mobile apps.
- Fine-tuning models.
- Handling millions of images (design scales conceptually; free tiers bound practice).

## Success criteria

| Criterion                                  | Target                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| Benchmark shows layer-by-layer improvement | MRR(D) > MRR(C) > MRR(B) > MRR(A) on the ground-truth set |
| Search latency (direct route, p50)         | < 1.5 s end-to-end                                        |
| Ingestion latency (p50)                    | < 8 s upload → searchable                                 |
| CI                                         | Lint + typecheck + tests green on every commit            |
| Cost                                       | $0/month hosting                                          |

## Document map

| Doc                                                      | Content                                               |
| -------------------------------------------------------- | ----------------------------------------------------- |
| [01-requirements.md](./01-requirements.md)               | Functional & non-functional requirements (with IDs)   |
| [02-architecture.md](./02-architecture.md)               | System architecture, components, model selection      |
| [03-data-model.md](./03-data-model.md)                   | Database schema, indexes, `hybrid_search` function    |
| [04-api-contract.md](./04-api-contract.md)               | REST API endpoints and payloads                       |
| [05-agent-design.md](./05-agent-design.md)               | Orchestrator agent: routes, tools, prompts, telemetry |
| [06-evaluation.md](./06-evaluation.md)                   | Metrics, benchmark strategies A–D, ground truth       |
| [07-implementation-plan.md](./07-implementation-plan.md) | Phased plan with acceptance criteria                  |
| [08-frontend-and-mockup.md](./08-frontend-and-mockup.md) | UI structure; slot for the Claude Design mockup       |
| [09-setup-guide.md](./09-setup-guide.md)                 | Human setup checklist: accounts, Supabase, secrets    |
| [10-deployment.md](./10-deployment.md)                   | Production deployment: Worker + Pages, CORS, domain   |
| [adr/](./adr/)                                           | Architecture Decision Records                         |
