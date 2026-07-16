# Data Model

Single source of truth: SQL migrations in [`supabase/migrations/`](../supabase/migrations/). This document explains them; if they diverge, the migration wins and this doc must be fixed in the same PR.

## 1. Tables

### `images`

| Column                | Type                 | Notes                                                                |
| --------------------- | -------------------- | -------------------------------------------------------------------- |
| `id`                  | `uuid` PK            | `gen_random_uuid()`                                                  |
| `storage_path`        | `text` UNIQUE        | Object path in the bucket — idempotency key (FR-5)                   |
| `image_url`           | `text`               | Public URL                                                           |
| `structured_metadata` | `jsonb`              | Vision model output, validated against `ImageMetadata` before insert |
| `dense_context`       | `text`               | Normalized semantic paragraph — the _only_ text that gets embedded   |
| `embedding`           | `vector(384)`        | bge-small-en-v1.5                                                    |
| `fts_tokens`          | `tsvector` GENERATED | english config over `dense_context` + `keywords`                     |
| `created_at`          | `timestamptz`        | UTC default                                                          |

Indexes: HNSW `vector_cosine_ops` on `embedding`; GIN on `fts_tokens`.

### `query_telemetry`

| Column              | Type          | Notes                                                                 |
| ------------------- | ------------- | --------------------------------------------------------------------- |
| `id`                | `uuid` PK     |                                                                       |
| `query_text`        | `text`        | Raw user query                                                        |
| `agent_action`      | `text` CHECK  | `direct \| reformulate \| decompose \| ask_context \| agent_fallback` |
| `resolved_queries`  | `jsonb`       | The query/queries actually executed                                   |
| `agent_decision_ms` | `int`         |                                                                       |
| `embedding_ms`      | `int`         |                                                                       |
| `vector_search_ms`  | `int`         | hybrid_search round trip                                              |
| `rerank_ms`         | `int`         |                                                                       |
| `execution_time_ms` | `int`         | End-to-end                                                            |
| `tokens_used`       | `int` NULL    |                                                                       |
| `model_provider`    | `text`        | e.g. `workers-ai/glm-4.7-flash`                                       |
| `rerank_skipped`    | `boolean`     | Degradation flag                                                      |
| `created_at`        | `timestamptz` |                                                                       |

## 2. Hybrid search function (weighted RRF)

Signature (full body in migration `0001_init.sql`):

```sql
hybrid_search(
  query_embedding vector(384),
  query_text      text,
  match_threshold float DEFAULT 0.20,
  match_count     int   DEFAULT 15,
  vector_weight   float DEFAULT 0.5,
  keyword_weight  float DEFAULT 0.5,
  rrf_k           int   DEFAULT 60
) RETURNS TABLE (id uuid, image_url text, structured_metadata jsonb,
                 dense_context text, combined_score float)
```

Design points:

- **Two ranked CTEs** — vector ranking (cosine, thresholded) and FTS ranking (`ts_rank_cd` over `websearch_to_tsquery`) — fused with `score = w_v/(k + rank_v) + w_k/(k + rank_k)`.
- `websearch_to_tsquery` (not `plainto_tsquery`): tolerates quoted phrases and `-negation`, safer with raw user input.
- Weights are parameters so the evaluation framework (strategies A/B) can call the same function with `keyword_weight => 0` — one code path for all benchmark strategies.
- `rrf_k` exposed for experimentation; 60 is the canonical literature default.
- `SET search_path = public` and `SECURITY INVOKER`; the Worker's service role is the only caller.

## 3. Row Level Security

- `images`: RLS on. No anon policies — reads/writes only via service role (Worker). Public sees images through Storage URLs, not table access.
- `query_telemetry`: RLS on, service-role only.

## 4. Storage

Bucket `images`, public read, created by `migrations/0002_storage.sql` (bucket + a public-read policy on `storage.objects`; the service-role Worker bypasses RLS for writes). Server-generated object names: `<uuid>.<ext>`. Upload constraints enforced in the Worker (MIME allow-list JPEG/PNG/WebP, ≤ 10 MB) — never trust client-side checks; the bucket's own `file_size_limit`/`allowed_mime_types` are defense in depth.

## 5. Migration policy

- Migrations are append-only, numbered `NNNN_description.sql`, applied via Supabase CLI (`supabase db push`) or SQL editor.
- Every schema change ships with: migration + updated shared types + updated docs, in one PR.
- `EMBEDDING_DIM` (384) appears in exactly two places by necessity — SQL and `packages/shared/src/models.ts` — and a comment in each points at the other.
