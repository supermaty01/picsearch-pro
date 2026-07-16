# Deployment Guide (production)

Take the app from "works on my machine" to a public URL at **$0/month** (NFR-1,
Phase 6). Do [09-setup-guide.md](./09-setup-guide.md) first — this guide assumes a
working Supabase project and a Cloudflare AI Gateway already exist.

Architecture in production:

```
Browser ──▶ Cloudflare Pages (React SPA)
                │  fetch /api/v1/*
                ▼
        Cloudflare Worker (Hono API)  ──▶ AI Gateway ──▶ Workers AI
                │  service role
                ▼
        Supabase (Postgres + Storage)
```

The Worker and Pages site are deployed separately. The SPA calls the API at
`/api/v1/*`; you wire that path to the Worker in step 4.

---

## 1. Deploy the API Worker

### 1a. Set production secrets (never committed)

Secrets are set with `wrangler secret put` — they are stored by Cloudflare, not in
the repo (AGENTS §7). Run each from `apps/api/`:

```bash
cd apps/api
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put AI_GATEWAY_ID
wrangler secret put SEED_KEY            # only if you'll seed production
# Set AFTER you know your Pages URL (step 4):
wrangler secret put ALLOWED_ORIGINS     # e.g. https://picsearch-pro.pages.dev
```

> `ENVIRONMENT` is a plain var in `wrangler.jsonc` (`"development"`); override it
> per-environment there if you want `"production"`. It's non-secret.

### 1b. Deploy

```bash
pnpm --filter @picsearch/api run deploy      # wrangler deploy
```

Note the deployed Worker URL: `https://picsearch-api.<your-subdomain>.workers.dev`.
Smoke-test it:

```bash
curl https://picsearch-api.<your-subdomain>.workers.dev/api/v1/health
```

All three checks should be `true`.

---

## 2. Deploy the web SPA to Cloudflare Pages

The web build is a static SPA (`apps/web/dist`).

### Option A — dashboard (Git-connected, recommended)

1. Cloudflare dashboard → _Workers & Pages_ → _Create_ → _Pages_ → connect your Git repo.
2. Build settings:
   - **Build command:** `pnpm install && pnpm --filter @picsearch/web build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** repository root
3. Deploy. Your site lands at `https://<project>.pages.dev`.

### Option B — direct upload

```bash
pnpm --filter @picsearch/web build
pnpm --filter @picsearch/api exec wrangler pages deploy ../web/dist --project-name picsearch-pro
```

### Web env vars: `.env.production` is the source of truth

`VITE_API_BASE_URL` is baked into the bundle at **build time**. With option B the
build runs on your machine, so env vars configured in the Pages dashboard never
reach it. The committed [`apps/web/.env.production`](../apps/web/.env.production)
carries the production API origin (public by definition — it ships in the bundle)
and Vite gives it priority over the gitignored `.env` in build mode. Result:
production builds are reproducible on any machine, and your local `.env` only
affects `pnpm dev`. If the Worker URL ever changes, update `.env.production` and
redeploy.

---

## 3. Point the SPA's `/api` at the Worker

In production the SPA and Worker are different origins, so `/api/v1/*` must reach
the Worker. Pick one:

- **Pages route / rewrite (simplest):** add a `apps/web/public/_redirects` proxy or
  a Pages Function that forwards `/api/*` to the Worker URL. A `_redirects` line:

  ```
  /api/*  https://picsearch-api.<your-subdomain>.workers.dev/api/:splat  200
  ```

- **Custom domain + Worker route:** put both behind your domain (step 5) and add a
  Worker route `yourdomain.com/api/*` → the Worker. Then the SPA's same-origin
  `/api/v1/*` calls just work and CORS is a non-issue.

> The web client only ever calls the relative path `/api/v1/...`
> ([`apps/web/src/lib/api.ts`](../apps/web/src/lib/api.ts)) — so wiring is purely
> a hosting concern, no code change.

---

## 4. Lock down CORS

Once you know the Pages URL, set it as the allowed origin on the Worker:

```bash
cd apps/api
wrangler secret put ALLOWED_ORIGINS   # https://<project>.pages.dev  (comma-separated for several)
```

With `ALLOWED_ORIGINS` set, the Worker rejects cross-origin requests from anywhere
else (NFR-5). Unset, it reflects any origin (fine for local dev, not for prod).
A Cloudflare Pages origin in the list implicitly allows its per-commit preview
deployments (`https://<hash>.<project>.pages.dev`); explicit wildcards like
`https://*.example.com` are also supported (see `apps/api/src/lib/cors.ts`).
If you use a same-origin custom domain (step 3, option 2), CORS is moot but setting
this is still good hygiene.

---

## 5. (Optional) Custom domain

- **Pages:** project → _Custom domains_ → add `picsearch.yourdomain.com`.
- **Worker:** _Triggers → Routes_ → add `yourdomain.com/api/*` (if proxying via your
  domain). Update `ALLOWED_ORIGINS` to the custom domain.

---

## 6. Seed production & run the benchmark

Point the seeder at the deployed Worker (needs the prod `SEED_KEY`):

```bash
SEED_KEY="<prod seed key>" API_URL="https://picsearch-api.<subdomain>.workers.dev" pnpm seed
```

Then open the live site → _Evaluation_ → _Run quality benchmark_ and capture the
numbers for the README results table.

---

## 7. Post-deploy verification checklist

- [ ] `GET /api/v1/health` on the Worker URL → `200`, all checks `true`.
- [ ] Live SPA loads; `/api/v1/*` calls succeed (Network tab, no CORS errors).
- [ ] Upload an image → appears in the gallery with AI metadata.
- [ ] Search a seeded image → results with an agent-decision badge + telemetry.
- [ ] An ambiguous query ("something nice from vacation") → clarifying question.
- [ ] Telemetry tab shows the latency waterfall for recent queries.
- [ ] Evaluation tab reproduces the benchmark; MRR(D) ≥ MRR(C).
- [ ] Lighthouse ≥ 90 on the SPA (Phase 6 target, NFR-10).

---

## 8. Cost & limits (staying at $0)

| Service               | Free-tier reality                                                              |
| --------------------- | ------------------------------------------------------------------------------ |
| Cloudflare Workers    | 100k requests/day.                                                             |
| Cloudflare Workers AI | Daily neuron allowance; AI Gateway caching stretches it far (benchmark reuse). |
| Cloudflare Pages      | Unlimited static requests, generous build minutes.                             |
| Supabase              | 500 MB DB + 1 GB storage; plenty for a demo gallery.                           |

Guardrails already in the code: per-IP rate limits on `/search` and `/images`
(30/min), max 2 concurrent benchmark runs, 10 MB upload cap, and AI Gateway in
front of every model call. If you expect a traffic spike (e.g. a shared demo
link), watch the Workers AI usage in the Cloudflare dashboard.

---

## 9. CI/CD

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs the full quality gate
(lint · format · typecheck · test · build) on every push/PR to `main`. It does
**not** auto-deploy — deployment is a manual `deploy` step (or Pages' own Git
integration for the SPA) so a green build never surprises production. To automate,
add a deploy job gated on `quality` succeeding, using a
`CLOUDFLARE_API_TOKEN` repo secret.
