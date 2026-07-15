# Phased Implementation Plan

Each phase has explicit **acceptance criteria** mapped to requirement IDs. A phase is done only when its criteria pass and CI is green. Never start phase N+1 with phase N red.

## Phase 0 — Scaffold & governance ✅ (this commit)

Monorepo, tooling, CI, docs, agent rules, DB migration, minimal runnable apps.

**Accepted when:** `pnpm install && pnpm lint && pnpm typecheck && pnpm build && pnpm test` all pass on a fresh clone.

## Phase 1 — Data layer (NFR-5)

- Create Supabase project; apply `0001_init.sql` (pgvector, tables, indexes, `hybrid_search`, RLS).
- Verify `hybrid_search` from SQL editor with hand-inserted rows (vector-only, FTS-only, fused cases).
- Configure `images` bucket + policies.

**Accepted when:** manual SQL tests return sensible fused rankings; RLS blocks anon table access; secrets set via `wrangler secret` (never committed).

## Phase 2 — Ingestion pipeline (FR-1..FR-5, NFR-4)

- `POST /images`: upload validation → Storage → vision (JSON mode) → Zod-validate → normalizer → embedding → insert.
- Unit tests: normalizer (pure), metadata validation incl. malformed LLM output + retry path.
- Integration test with mocked AI binding.

**Accepted when:** a real photo uploads end-to-end in < 8 s p50; invalid files rejected with correct RFC 9457 errors; re-ingesting same object doesn't duplicate (FR-5).

## Phase 3 — Retrieval + agent + rerank (FR-6..FR-11)

- Agent module: prompt, 4 tool schemas, validation + retry + fallback ladder.
- `POST /search`: route → hybrid_search (1..n) → merge/dedupe → rerank → telemetry insert.
- Unit tests per route with recorded/mocked tool calls; degradation tests (agent timeout → direct; reranker failure → RRF order + flag).

**Accepted when:** all 4 routes demonstrably fire on the example queries in 05-agent-design.md; telemetry rows complete; p50 direct-route latency < 1.5 s (NFR-2).

## Phase 4 — Frontend (FR-12, NFR-10)

- Gallery + upload with progress; search box handling both response kinds (results / clarification follow-up flow).
- Result cards with score + metadata JSON inspector; telemetry waterfall panel.
- Component tests for the discriminated-union rendering; a11y pass.

**Accepted when:** full user journey works against the deployed Worker; keyboard-only navigation possible; mockup design tokens applied (see 08-frontend-and-mockup.md).

## Phase 5 — Evaluation framework (FR-13..FR-15)

- Ground-truth set authored (≥ 10 queries, all categories); `pnpm seed` command.
- Benchmark runner (4 strategies, async run + polling), metrics module (pure, unit-tested against hand-computed MRR/Recall fixtures).
- Dashboard with C vs D highlight.

**Accepted when:** benchmark reproduces on a fresh clone; metrics match hand-computed values; README shows the resulting table.

## Phase 6 — Polish & launch

- Rate limiting, CORS lockdown, final a11y/perf pass (Lighthouse ≥ 90).
- README results section with real benchmark numbers + demo GIF; deploy Pages + Worker; custom domain optional.

**Accepted when:** public URL live at $0/month; README tells the full story (problem → architecture → measured results).

## Standing rules (all phases)

- Conventional Commits referencing requirement IDs.
- Docs updated in the same PR as behavior changes (NFR-8).
- New external input ⇒ new Zod schema at the boundary (NFR-4).
- Model IDs only ever referenced from `packages/shared/src/models.ts` (NFR-7).
