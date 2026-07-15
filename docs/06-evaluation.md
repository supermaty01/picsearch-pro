# Evaluation Framework

The project's core thesis: **every layer must prove its value with metrics**. The in-app "Systematic Evaluation" panel runs a fixed ground-truth set against four strategies and shows exactly what each layer buys.

## 1. Strategies

| Strategy | Pipeline | Implementation detail |
|---|---|---|
| **A** | Vector search only | `hybrid_search(keyword_weight => 0)` — same SQL function, one code path |
| **B** | Hybrid (vector + FTS, RRF) | `hybrid_search` with default weights |
| **C** | Hybrid + cross-encoder rerank | B → `bge-reranker-base` over top 15 |
| **D** | Agent + hybrid + rerank (full) | Orchestrator routes first, then C |

**C vs D is the headline comparison**: it isolates the agent's contribution on ambiguous/noisy/multi-concept queries — concrete evidence the agentic layer adds measurable value.

## 2. Metrics

- **Recall@K** (K = 3, 5): fraction of queries whose ground-truth image appears in the top K.
- **MRR**: mean of `1 / rank_of_first_correct_result` (0 if absent from top K).

Computed per strategy, overall and per query category.

## 3. Ground-truth set

≥ 10 queries over the ~15 images in [`/test-dataset`](../test-dataset/), defined in `test-dataset/ground-truth.json`:

```jsonc
{
  "queries": [
    { "id": "q01", "category": "direct",        "query": "canal with medieval timber-framed houses", "expectedImageIds": ["colmar-canal"] },
    { "id": "q02", "category": "noisy",         "query": "that pic i took in frnace last summr",     "expectedImageIds": ["colmar-canal"] },
    { "id": "q03", "category": "multi-concept", "query": "beach sunset but also gothic architecture", "expectedImageIds": ["beach-sunset", "gothic-cathedral"] },
    { "id": "q04", "category": "ambiguous",     "query": "something nice from vacation",             "expectedImageIds": ["*"], "expectClarification": true }
    // ... ≥ 6 more, balanced across the 4 categories
  ]
}
```

Rules for the set: every agent route must be exercised by ≥ 2 queries; `expectedImageIds` reference stable slugs mapped at seed time; ambiguous queries score the *clarification behavior* for strategy D (a clarification counts as correct; strategies A–C are scored on whatever they return, which is the point).

## 4. Execution model

- `POST /api/v1/benchmark` → `202 { runId }`; the run executes async (Worker `waitUntil` in MVP; upgrade path: Queues/Workflows), progress polled by the UI.
- AI Gateway caching makes benchmark re-runs cheap and fast.
- Results persisted per run so the dashboard can show history/regressions.

## 5. Dashboard (FR-14)

Grouped bar chart: MRR and Recall@K per strategy; per-category breakdown; latency-vs-quality table (each strategy's p50 latency next to its MRR — honest cost/benefit); C vs D delta highlighted.

## 6. Reproducibility (FR-15)

`pnpm seed` ingests `/test-dataset` images through the real pipeline (not DB dumps) so a recruiter can clone, seed, and benchmark in minutes.
