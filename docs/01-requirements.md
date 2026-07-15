# Requirements

Requirements use stable IDs (`FR-x` functional, `NFR-x` non-functional) so commits, tests, and PRs can reference them (e.g. `feat(api): implement FR-3 hybrid search endpoint`).

## 1. Functional requirements

### Ingestion

- **FR-1** — A user can upload an image (JPEG/PNG/WebP, ≤ 10 MB) from the web UI. The file is stored in Supabase Storage and served via a public URL.
- **FR-2** — On upload, the system extracts structured metadata from the image using a vision model. Output MUST validate against the `ImageMetadata` Zod schema (scene_description, objects, actions, mood, colors, weather, location_type, keywords). Invalid model output is retried once, then rejected with a clear error.
- **FR-3** — The metadata JSON is normalized into a single high-density semantic paragraph (`dense_context`) optimized for embedding models (never embed raw JSON).
- **FR-4** — An embedding (384-dim, bge-small-en-v1.5) is generated from `dense_context` and persisted together with the metadata, URL, and a generated `tsvector` column.
- **FR-5** — Ingestion is idempotent per storage object: re-processing the same object updates rather than duplicates.

### Retrieval

- **FR-6** — A user can search with free text. The query first passes through the **orchestrator agent**, never directly to the database.
- **FR-7** — The agent selects exactly one of four routes via function calling:
  - `search_direct` — clear query, pass through unchanged.
  - `search_reformulated` — noisy/misspelled/poorly formed query, rewrite first.
  - `search_decomposed` — multi-concept query, split into 2–3 independently retrievable sub-queries; run each, merge and deduplicate.
  - `ask_for_context` — ambiguous query, return a clarifying question to the user instead of results.
- **FR-8** — Retrieval executes the `hybrid_search` SQL function (weighted RRF over pgvector cosine + FTS), returning top 15 candidates.
- **FR-9** — Candidates are reranked by a cross-encoder (query vs `dense_context`); the top 5 are returned with scores.
- **FR-10** — The response includes the agent's decision, the (re)formulated query/queries, per-stage latencies, and the results.

### Observability

- **FR-11** — Every search writes one row to `query_telemetry` (agent action, per-stage ms, tokens, model provider).
- **FR-12** — The UI shows live per-query telemetry (agent decision + latency waterfall) and a JSON inspector for each image's AI metadata.

### Evaluation

- **FR-13** — A "Run Quality Benchmark" action runs a fixed ground-truth set (≥ 10 queries: direct, noisy, multi-concept, ambiguous) against 4 strategies:
  A = vector only · B = hybrid · C = hybrid + rerank · D = agent + hybrid + rerank.
- **FR-14** — The benchmark computes **Recall@3, Recall@5 and MRR** per strategy and renders a comparison dashboard highlighting C vs D (the agent's isolated contribution).
- **FR-15** — A seed script ingests the ~15 images in `/test-dataset` with one command, so any clone can reproduce the benchmark.

## 2. Non-functional requirements

- **NFR-1 Cost** — $0/month: Cloudflare Pages + Workers + Workers AI free tier, Supabase free tier. No paid API keys required to run the full pipeline.
- **NFR-2 Latency** — Direct-route search p50 < 1.5 s; agent decision < 600 ms; benchmark runs async without blocking the UI.
- **NFR-3 Type safety** — TypeScript `strict` everywhere; API contracts defined once in `packages/shared` as Zod schemas, inferred on both sides.
- **NFR-4 Validation** — All external inputs (HTTP bodies, LLM outputs, env vars) validated at the boundary with Zod. LLM output is untrusted input.
- **NFR-5 Security** — Supabase service-role key lives only in Worker secrets; RLS enabled on all tables; browser never talks to the DB directly; upload size/type enforced server-side.
- **NFR-6 Quality gates** — ESLint (flat config, type-checked rules) + Prettier + Vitest; CI blocks merge on any failure. No `any`, no unchecked `@ts-ignore`.
- **NFR-7 Model agility** — Model IDs centralized in one config module; swapping vision/embedding/agent/reranker model is a one-line change. Embedding dimension is a shared constant.
- **NFR-8 Reproducibility** — Fresh clone → `pnpm install && pnpm dev` works; `pnpm seed` populates the demo dataset; docs never drift from code (PRs touching behavior must update docs).
- **NFR-9 Observability** — Every pipeline stage timed; failures logged with structured context; AI calls routed through Cloudflare AI Gateway for caching, analytics and rate-limit protection.
- **NFR-10 Accessibility** — UI meets WCAG 2.1 AA basics: keyboard navigable, labeled inputs, sufficient contrast, `alt` text from `scene_description`.

## 3. Out of scope (explicit)

- User authentication / private galleries.
- Image editing or generation.
- Multilingual search (English-only FTS config; noted as future work).
- Pagination beyond top-5 results (benchmark needs fixed K).
