# API Contract

Base path: `/api/v1`. All schemas live in `packages/shared/src/api.ts` (Zod) — this doc describes them; the code is authoritative. Errors follow RFC 9457 (`application/problem+json`).

## Conventions

- Request/response bodies validated with shared Zod schemas on both sides (`@hono/zod-validator` on the Worker, inferred types in the client).
- Every response carries `x-request-id`; search responses embed telemetry.
- Errors: `{ type, title, status, detail, requestId }`.

## Endpoints

### `GET /api/v1/health`

Liveness + dependency check. → `200 { status: "ok", checks: { db, storage, ai } }`

### `POST /api/v1/images` (FR-1..FR-5)

Multipart upload (`file`). Validates MIME/size, stores object, runs the ingestion pipeline.

→ `201`:

```jsonc
{
  "id": "uuid",
  "imageUrl": "https://...",
  "metadata": {/* ImageMetadata */},
  "denseContext": "Scene: ...",
  "timings": { "visionMs": 0, "embeddingMs": 0, "totalMs": 0 },
}
```

Errors: `413` too large · `415` bad type · `422` vision output failed validation
after retry · `422 unsafe-content` the moderation check (piggybacked on the vision
call, `content_rating`) flagged the image as adult/graphic — nothing is stored.

Retention: public uploads expire after 24 h — an hourly Worker cron
(`services/cleanup.ts`) deletes the storage object and the row (embedding
included). The `seed/` corpus is permanent.

### `GET /api/v1/images?limit&cursor`

Gallery listing, newest first, cursor pagination. → `200 { items: ImageSummary[], nextCursor }`

### `POST /api/v1/search` (FR-6..FR-10)

```jsonc
// request
{ "query": "that pic i took in frnace last summr" }
```

→ `200` (results):

```jsonc
{
  "kind": "results",
  "agent": { "action": "reformulate", "resolvedQueries": ["photo taken in France last summer"] },
  "results": [
    { "id": "uuid", "imageUrl": "...", "denseContext": "...", "score": 0.93, "metadata": {} },
  ],
  "telemetry": {
    "agentDecisionMs": 0,
    "embeddingMs": 0,
    "vectorSearchMs": 0,
    "rerankMs": 0,
    "executionTimeMs": 0,
    "rerankSkipped": false,
  },
}
```

→ `200` (clarification — FR-7 `ask_for_context`):

```jsonc
{
  "kind": "clarification",
  "agent": { "action": "ask_context" },
  "question": "Beach, mountains, or city?",
}
```

The discriminated union (`kind`) is a shared Zod schema; the UI switches on it exhaustively.

### `POST /api/v1/benchmark` (FR-13..FR-14)

Body: `{ strategies?: ("A"|"B"|"C"|"D")[] }` (default all). Runs the ground-truth set; long-running → returns `202 { runId }`, progress polled via:

### `GET /api/v1/benchmark/:runId`

→ `200 { status: "running" | "done", results?: BenchmarkReport }` where `BenchmarkReport` contains per-strategy `{ recallAt3, recallAt5, mrr, perQuery: [...] }`.

### `GET /api/v1/telemetry?limit`

Recent `query_telemetry` rows for the observability panel (FR-12).

## Rate limits

`/search` and `/images` POST: 30 req/min/IP (Worker-side). Benchmark: 2 concurrent runs max.
