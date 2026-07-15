# ADR-0001: pnpm workspace monorepo

- **Status:** Accepted (2026-07-15)

## Context
Frontend (React SPA), backend (Cloudflare Worker) and shared contracts must stay in lockstep; the project is developed entirely by AI agents that benefit from seeing the whole system in one repo.

## Decision
Single repo with pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`. No Turborepo/Nx — at 3 packages, plain `pnpm -r` scripts are simpler and equally fast.

## Consequences
+ One PR can change contract + producer + consumer atomically; single toolchain (ESLint/Prettier/TS) at the root.
+ Shared Zod schemas imported as `@picsearch/shared` — no type drift.
− Slightly more root config than a single app; deploys are per-app (Pages vs Worker) and must be documented.
