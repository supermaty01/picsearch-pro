# Orchestrator Agent Design

The differentiator vs. a static RAG pipeline: queries never hit `hybrid_search` directly. A lightweight LLM with **function calling** decides _how_ to resolve each query first (the 2026 "Adaptive RAG" routing pattern). The agent is an orchestration layer on top of retrieval — ingestion and `hybrid_search` don't change.

## 1. Routes

```mermaid
flowchart TD
    Q[User query] --> AG{Agent<br/>glm-4.7-flash}
    AG -->|ambiguous| ASK[ask_for_context] --> UI1[Clarifying question to user]
    AG -->|noisy / malformed| REF[search_reformulated] --> HS[hybrid_search]
    AG -->|multi-concept| DEC[search_decomposed] --> HS1[hybrid_search q1] & HS2[hybrid_search q2]
    HS1 --> CE1[rerank vs q1] --> RR[round-robin interleave] --> UI2
    HS2 --> CE2[rerank vs q2] --> RR
    AG -->|clear| DIR[search_direct] --> HS
    HS --> CE[cross-encoder rerank] --> UI2[Top 5]
```

| Route                 | Trigger                                       | Example                                       | Action                                                                                                                   |
| --------------------- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `search_direct`       | Clear, specific                               | "canal with medieval timber-framed houses"    | Pass through unchanged — zero added overhead                                                                             |
| `search_reformulated` | Noisy, typos, vague phrasing but clear intent | "that pic i took in frnace last summr"        | Rewrite into a clean, semantically rich query                                                                            |
| `search_decomposed`   | 2+ independent concepts                       | "a beach sunset but also gothic architecture" | Split into 2–3 sub-queries, each independently retrieved AND reranked against its own text, then round-robin interleaved |
| `ask_for_context`     | Cannot form a retrievable query               | "something nice from vacation"                | Return a clarifying question; no DB call                                                                                 |

## 2. Tool schemas (function calling)

Defined once in `packages/shared` as Zod, converted to JSON Schema for the model:

```ts
search_direct:       { }                                    // no args
search_reformulated: { reformulatedQuery: string }          // min 3 chars
search_decomposed:   { subQueries: string[] }               // 2..3 items, each independently retrievable
ask_for_context:     { question: string }                   // one short question, offer 2-3 concrete options
```

The model MUST call exactly one tool (`tool_choice: "required"`). The tool-call arguments are Zod-parsed; on parse failure the call is retried once with the validation error appended; on second failure → `agent_fallback` route = `search_direct` with the raw query (degradation, never a 500).

## 3. System prompt (summary — canonical version lives in `apps/api/src/agent/prompt.ts`)

Instructs the model to: apply the four routes as first-match rules (clarify → decompose → reformulate → direct), with few-shot examples per route, so the specialized routes win over the pass-through; `search_direct` is reserved for queries that are already clean one-scene descriptions. Terse 1-3 word queries are reformulated (expanded with synonyms/visual context); reformulations stay faithful to intent (no invented details); sub-queries must be self-contained; the model never answers the query itself — only routes it. Temperature 0.1, max ~256 output tokens.

Hybrid nudge: glm-4.7-flash with reasoning disabled under-triggers `search_decomposed`, so when the query contains a multi-subject connector ("but also", "plus", "as well as"…) the system prompt appends an explicit hint toward rule 2 (`buildSystemPrompt`). The model still makes the final call.

Reranking is route-aware. For direct/reformulate, the cross-encoder scores the candidate pool against the single resolved query (the agent's cleaned intent) rather than the raw input. For decompose, each sub-query's candidates are reranked against THAT sub-query, then the per-sub-query rankings are round-robin interleaved (rank 1 of q1, rank 1 of q2, rank 2 of q1, …), so every sub-intent is represented near the top. Scoring the merged pool against the combined query instead makes every image a half-match — no single image is "a cat AND a pig" — which collapses the ranking to cross-encoder noise (`rerankResolved` in `services/search.ts`).

## 4. Guardrails & budgets

- Decision timeout: 5 s → fallback to `search_direct` (`agent_action = 'agent_fallback'`). Sized to the measured free-tier tail of glm-4.7-flash: ~1 s pass-through, up to ~4 s when generating a reformulation/clarifying question.
- Decomposition capped at 3 sub-queries (latency + free-tier budget).
- One clarification round max: a follow-up to `ask_for_context` is concatenated with the original query and re-routed, but `ask_for_context` is disabled on that second pass.
- Prompt-injection stance: the query is data, not instructions; the agent's only output channel is a constrained tool call, and its arguments are validated before use.

## 5. Telemetry (closes the loop with evaluation)

Every decision logs `agent_action`, `resolved_queries`, `agent_decision_ms`, `tokens_used`, `model_provider` (FR-11). The benchmark's C vs D comparison (06-evaluation.md) then measures whether reformulate/decompose actually lift MRR/Recall versus bypassing the agent — the agent must _earn_ its latency.
