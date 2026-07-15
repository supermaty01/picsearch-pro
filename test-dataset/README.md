# Test Dataset

~15 curated images + ground truth powering the evaluation framework (FR-13..FR-15, docs/06-evaluation.md).

Populated in Phase 5:

- `images/` — the test images (small, license-safe: Unsplash/Pexels or own photos; note source per image in `sources.md`).
- `ground-truth.json` — ≥ 10 benchmark queries with expected image slugs, balanced across the 4 agent-route categories (direct, noisy, multi-concept, ambiguous).
- `pnpm seed` ingests everything through the real pipeline so any clone can reproduce the benchmark.
