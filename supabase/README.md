# Supabase

- `migrations/` — append-only SQL migrations (`NNNN_description.sql`). Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor in order.
- Storage: create a public-read bucket named `images` (Phase 1). Upload constraints are enforced by the Worker, not the bucket.
- Secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) live in Worker secrets / `.dev.vars` — never in this repo.
- Companion doc: [docs/03-data-model.md](../docs/03-data-model.md). If doc and migration diverge, the migration wins and the doc must be fixed in the same PR.
