# ADR-0006: AI-driven development governed by AGENTS.md

- **Status:** Accepted (2026-07-15)

## Context

100% of the code will be written by AI coding agents (Claude Code and possibly others). By 2026, `AGENTS.md` is the de facto cross-tool standard (Linux Foundation-stewarded, read natively by 30+ agents); `CLAUDE.md` remains Claude-specific.

## Decision

One canonical rules file, `AGENTS.md`, at the repo root; `CLAUDE.md` contains only a pointer to it. Rules encode: architecture boundaries, quality gates, definition of done, commit conventions, and verification commands agents must run before declaring work complete.

## Consequences

- Any agent tool gets identical context; no duplicated, drifting rule files.
- Rules reference requirement IDs, making agent work auditable against the spec.
  − Rules must be maintained like code: PRs that change conventions must update AGENTS.md in the same commit.
