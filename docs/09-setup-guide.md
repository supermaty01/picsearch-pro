# Setup Guide (local development)

This guide is the **human checklist** for taking a fresh clone to a working local
app. The code is done; these are the accounts, keys, and one-time steps only you
can perform. Everything here is free — no paid plans required (NFR-1).

When you finish, `pnpm dev` serves the full app locally against your own Supabase
project and Cloudflare Workers AI. For putting it on the public internet, continue
to [10-deployment.md](./10-deployment.md).

> **Time budget:** ~30–45 minutes, most of it waiting on account sign-ups.

---

## 0. Prerequisites

| Tool                 | Version           | Notes                                         |
| -------------------- | ----------------- | --------------------------------------------- |
| Node.js              | ≥ 22              | `.nvmrc` pins it; `nvm use` if you use nvm.   |
| pnpm                 | 10.x              | `corepack enable` (ships with Node).          |
| A Cloudflare account | free              | Workers AI + AI Gateway + Pages.              |
| A Supabase account   | free              | Postgres + Storage.                           |
| Supabase CLI         | latest (optional) | For `supabase db push`; SQL editor works too. |

```bash
corepack enable
git clone <your-fork-url> picsearch-pro && cd picsearch-pro
pnpm install
```

Verify the toolchain before touching any cloud service:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

All five must pass on a clean clone (Phase 0 acceptance). They need **no**
cloud credentials — the tests mock the AI and DB bindings.

---

## 1. Supabase project (the data layer — Phase 1)

1. **Create the project.** [app.supabase.com](https://app.supabase.com) → _New project_.
   Pick a region near you and a strong database password (save it). Wait for it to
   finish provisioning.

2. **Apply the migrations, in order.** Open _SQL Editor_ and run each file's
   contents (or use the CLI, step 1a):
   - `supabase/migrations/0001_init.sql` — pgvector, `images`, `query_telemetry`,
     the `hybrid_search` RRF function, indexes, RLS.
   - `supabase/migrations/0002_storage.sql` — the public `images` bucket + read policy.
   - `supabase/migrations/0003_benchmark_runs.sql` — benchmark run persistence.

   **1a. (Alternative) Supabase CLI:**

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

3. **Verify `hybrid_search` works** (Phase 1 acceptance criterion). Paste
   `supabase/verify_hybrid_search.sql` into the SQL editor and run it. It inserts
   three fixtures inside a transaction, prints vector-only / FTS-only / fused
   rankings, then **rolls itself back**. You should see sensible fused ordering.

4. **Confirm RLS blocks anonymous access.** With RLS enabled and no policies, the
   `anon` role can run a query but sees **zero rows** (RLS filters silently — it is
   _not_ a "permission denied" error; Supabase grants `anon` the table privilege by
   default, and RLS is what gates the rows). First confirm RLS is actually on:

   ```sql
   -- Expect relrowsecurity = true for both tables:
   select relname, relrowsecurity
   from pg_class
   where relname in ('images', 'query_telemetry')
     and relnamespace = 'public'::regnamespace;

   -- Expect ZERO rows (no anon policies):
   select tablename, policyname, roles, cmd
   from pg_policies
   where schemaname = 'public' and tablename in ('images', 'query_telemetry');
   ```

   To prove the row-filtering with data — note `set local role` only applies inside
   a transaction, so keep it all in one block:

   ```sql
   begin;
     insert into images (storage_path, image_url, structured_metadata, dense_context, embedding)
     values ('rls-probe', 'http://x', '{}', 'probe', array_fill(0.1::float8, array[384])::vector);
     select count(*) as as_postgres from images;   -- 1 (service role sees it)
     set local role anon;
     select count(*) as as_anon from images;        -- 0 (RLS hides it from anon)
   rollback;
   ```

   The browser never talks to these tables — only the Worker (service role) does.

5. **Grab your keys.** Project _Settings → API_:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY`
     ⚠️ This key bypasses RLS. It lives ONLY in Worker secrets / `.dev.vars`.
     Never put it in the web app or commit it.

---

## 2. Cloudflare: Workers AI + AI Gateway (the inference layer — ADR-0002)

1. **Sign in / create an account** at [dash.cloudflare.com](https://dash.cloudflare.com).

2. **Authenticate Wrangler locally:**

   ```bash
   pnpm --filter @picsearch/api exec wrangler login
   ```

3. **Create an AI Gateway.** Dashboard → _AI_ → _AI Gateway_ → _Create Gateway_.
   Name it (e.g. `picsearch-gateway`). The **gateway name/id** is your
   `AI_GATEWAY_ID`. All model calls route through it for caching, analytics, and
   rate-limit protection (NFR-9) — this is what makes benchmark re-runs cheap.

   > Workers AI itself needs no API key locally: the `AI` binding is provided by
   > the platform when you run `wrangler dev` (after `wrangler login`).

---

## 3. Local secrets (`.dev.vars`)

Copy the example and fill it in — this file is **gitignored**, never commit it:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

```ini
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ...your service_role key..."
AI_GATEWAY_ID="picsearch-gateway"
# ALLOWED_ORIGINS is optional locally (unset = allow any origin).
SEED_KEY="pick-any-random-string"     # needed to run `pnpm seed`
```

`SEED_KEY` authorizes the deterministic `seed/<slug>` uploads the benchmark relies
on; any random string works locally as long as it matches what `pnpm seed` sends.

---

## 4. Run it

```bash
pnpm dev
```

- Web: <http://localhost:5173> (Vite, proxies `/api` → the Worker)
- API: <http://localhost:8787> (Wrangler)

Smoke-test the API:

```bash
curl http://localhost:8787/api/v1/health
# {"status":"ok","service":"picsearch-api","version":"0.1.0","checks":{"db":true,"storage":true,"ai":true}}
```

If `checks.db` or `checks.storage` is `false`, re-check `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` and that the migrations ran.

Now open the web app, upload an image, and search for it. First model calls are
slower (cold); AI Gateway caches subsequent identical calls.

---

## 5. Seed the benchmark dataset (Phase 5 — FR-15)

The benchmark needs a known set of images. You supply ~15 license-safe images.

1. **Add the images.** Put files in `test-dataset/images/` named `<slug>.<ext>`,
   using the slugs in [`test-dataset/sources.md`](../test-dataset/sources.md)
   (the first 12 are referenced by `ground-truth.json`; the rest are distractors).
   Record each image's source + license in `sources.md`.

2. **Run the seeder** against your running Worker:

   ```bash
   pnpm seed
   ```

   The script reads `SEED_KEY`/`API_URL` from the environment, falling back to
   `apps/api/.dev.vars` — so the key you already configured for the Worker is
   enough. To seed a deployed Worker, override the target:

   ```bash
   SEED_KEY="prod-secret" API_URL="https://your-worker.workers.dev" pnpm seed
   ```

   It ingests each image through the **real** pipeline (vision → dense context →
   embedding → row), storing it at `seed/<slug>.<ext>`. It's idempotent — re-run
   any time; images update rather than duplicate.

3. **Run the benchmark.** In the web app, open the _Evaluation_ tab → _Run quality
   benchmark_. It runs all four strategies (A–D) and shows MRR / Recall@K with the
   C-vs-D delta highlighting the agent's measured contribution.

---

## 6. Troubleshooting

| Symptom                                  | Likely cause / fix                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `health` shows `db: false`               | Wrong `SUPABASE_URL`/key, or migrations not applied.                                   |
| `health` shows `storage: false`          | `0002_storage.sql` not applied (no `images` bucket).                                   |
| Upload returns `422`                     | Vision model output failed validation twice — usually a transient model hiccup; retry. |
| `pnpm seed` says "SEED_KEY is required"  | Set `SEED_KEY` in `apps/api/.dev.vars` (the script reads it) or export it.             |
| Search is slow the first time            | Cold model calls; AI Gateway caches repeats. Direct-route p50 target is < 1.5 s.       |
| `wrangler dev` can't find the AI binding | Run `wrangler login`; the `AI` binding needs an authenticated account.                 |

Next: ship it publicly → [10-deployment.md](./10-deployment.md).
