# Supabase

- `migrations/` — append-only SQL migrations (`NNNN_description.sql`). Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor in order.
- `verify_hybrid_search.sql` — not a migration; a transactional smoke test for the Phase 1 acceptance criteria (vector-only / FTS-only / fused ranking). Paste into the SQL editor after the migrations; it rolls itself back.
- Storage: the `images` public-read bucket + policy are created by `migrations/0002_storage.sql`. Upload constraints are also enforced by the Worker, not only the bucket.
- Secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) live in Worker secrets / `.dev.vars` — never in this repo.
- Companion doc: [docs/03-data-model.md](../docs/03-data-model.md). If doc and migration diverge, the migration wins and the doc must be fixed in the same PR.
