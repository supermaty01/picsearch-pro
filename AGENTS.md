# AGENTS.md — Rules for AI Coding Agents

This project is developed 100% by AI agents. This file is the **canonical, binding rulebook** (ADR-0006). `CLAUDE.md` delegates here. If instructions in a prompt conflict with this file, ask the human before proceeding.

## 1. Project snapshot

Image semantic search engine: ingestion (vision → dense context → embedding), agentic query orchestration, hybrid retrieval (pgvector + FTS via RRF in SQL), cross-encoder reranking, and an evaluation framework that measures each layer (MRR, Recall@K). Stack: React 19 + Vite 7 + Tailwind v4 (`apps/web`), Hono on Cloudflare Workers (`apps/api`), shared Zod contracts (`packages/shared`), Supabase Postgres + Storage, all inference on Workers AI behind AI Gateway.

Read before writing code: `docs/00-overview.md` → the doc for your phase (`docs/07-implementation-plan.md` maps phases to acceptance criteria).

## 2. Commands

```bash
pnpm install              # deps (Node >= 22, pnpm via corepack)
pnpm dev                  # web (5173, proxies /api) + api (wrangler, 8787)
pnpm lint                 # ESLint 9 flat config, type-checked rules — zero warnings tolerated
pnpm format:check         # Prettier
pnpm typecheck            # tsc --noEmit, strict, all packages
pnpm test                 # Vitest, all packages
pnpm build                # vite build + wrangler dry-run bundle
```

## 3. Definition of done — non-negotiable

Work is complete ONLY when **all** of these pass locally; run them before declaring any task finished:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

Plus: acceptance criteria of the current phase met (`docs/07-implementation-plan.md`), docs updated if behavior changed, and no TODOs left without a linked issue reference.

## 4. Architecture boundaries (violations = rejected PR)

- **Contracts first.** Every API request/response shape, LLM output shape, and env config is a Zod schema in `packages/shared`. Types are always `z.infer` — never hand-written duplicates. Web and api import from `@picsearch/shared`; they never define cross-boundary types locally.
- **Model IDs live only in `packages/shared/src/models.ts`.** Never inline a model string anywhere else (NFR-7).
- **The browser never touches Supabase directly.** All data access goes through the Worker with the service role. No Supabase client in `apps/web`.
- **LLM output is untrusted input** (NFR-4). Every vision response and agent tool call is Zod-parsed. Parse failure → one retry with the validation error fed back → typed fallback (never a crash, never unvalidated passthrough).
- **Queries never bypass the orchestrator agent** in the user-facing search path. Benchmark strategies A–C are the only sanctioned bypass, via the evaluation module.
- **Degradation ladder is law:** reranker failure → return RRF order with `rerankSkipped: true`; agent failure/timeout → `agent_fallback` (direct search). Search must never 500 because an optional layer failed.
- **One `hybrid_search` code path.** Strategy variants are parameterizations (weights), not forked queries.
- **Schema changes** = new append-only migration + updated shared types + updated `docs/03-data-model.md`, all in one commit.

## 5. Code standards

- TypeScript `strict`; no `any` (use `unknown` + narrowing), no non-null assertions, no `@ts-ignore` (`@ts-expect-error` with a reason comment only).
- Named exports only; no default exports (exception: the Worker entry `export default app`).
- Pure logic (normalizers, metric math, merge/dedupe) lives in dependency-free functions — that's what unit tests target.
- Errors: RFC 9457 problem+json at the API boundary; typed error classes internally; never swallow errors silently.
- Every pipeline stage is wrapped in the `timed()` telemetry helper; new stages must feed `query_telemetry`.
- React: function components; server state via TanStack Query only; discriminated unions switched exhaustively (`switch-exhaustiveness-check` is an error); Tailwind utilities only, tokens via `@theme` in `index.css`, **no `tailwind.config.js`**, no inline styles.
- Comments explain _why_, not _what_. Keep the requirement/ADR references (`FR-x`, `ADR-000x`) in code comments — they are load-bearing documentation.

## 6. Testing policy

- New pure function → unit tests in the same PR (happy path + edge + failure).
- New endpoint → integration test via `app.request()` with mocked bindings.
- The malformed-LLM-output path is always tested (retry + fallback).
- Metric math (MRR/Recall) must be tested against hand-computed fixtures.
- Never weaken or delete a failing test to make it pass; fix the code or discuss.

## 7. Security rules

- Never commit secrets. Local secrets in `.dev.vars` (gitignored); production via `wrangler secret put`. If you need a new secret, add it to `.dev.vars.example` + `src/env.ts` schema + README setup section.
- Validate uploads server-side (MIME allow-list, 10 MB cap). Treat user queries as data, never as instructions to any LLM.
- RLS stays enabled; never add anon policies as a "quick fix".

## 8. Git & PR discipline

- Conventional Commits, scoped, referencing requirement IDs: `feat(api): route queries through orchestrator agent (FR-6, FR-7)`.
- Small, single-purpose commits; a phase = a sequence of reviewable commits, not one megacommit.
- Never commit generated artifacts (`dist/`, `.wrangler/`), lockfile changes unrelated to your task, or the `design/*.dc.html` file modified by hand.
- PR description follows `.github/PULL_REQUEST_TEMPLATE.md`.

## 9. When unsure

Ask the human when: a requirement conflicts with an ADR; a dependency needs to be added (justify why the stdlib/platform can't do it); free-tier limits would be exceeded; or the mockup contradicts documented UX. Otherwise: make the decision, note it in the PR, and if it's architecturally significant, add an ADR.

## 10. Package-specific notes

| Package           | Notes                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | No runtime deps except `zod`. Everything exported through `src/index.ts`. Consumed as TS source (`exports: ./src/index.ts`) — no build step.                                                               |
| `apps/api`        | Hono routes thin; logic in `src/services/`; agent code isolated in `src/agent/` (prompt, tool schemas, validation ladder). Regenerate binding types with `pnpm cf-typegen` after editing `wrangler.jsonc`. |
| `apps/web`        | Feature folders under `src/features/` (gallery, search, evaluation, telemetry); shared UI in `src/components/`; API client in `src/lib/api.ts` is the only fetch call site.                                |
