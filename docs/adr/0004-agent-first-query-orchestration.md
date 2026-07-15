# ADR-0004: Agent-first query orchestration with four fixed routes

- **Status:** Accepted (2026-07-15)

## Context
Static pipelines fail on ambiguous, noisy or multi-concept queries. 2026 production pattern ("Adaptive RAG"): classify/route each query to an appropriate strategy instead of one-size-fits-all retrieval. A free-form ReAct loop would be flexible but unbounded in latency/cost and hard to evaluate.

## Decision
A single-turn function-calling agent that must choose exactly one of four tools: `search_direct`, `search_reformulated`, `search_decomposed` (≤3 sub-queries), `ask_for_context` (≤1 round). Tool args are Zod-validated; failure ladder: retry once → fall back to direct search.

## Consequences
+ Bounded latency and cost; every decision is a categorical label → directly benchmarkable (C vs D isolates agent value).
+ Prompt-injection surface minimized: user query is data; the model's only output is a constrained tool call.
− Less flexible than iterative agent loops; documented as future work (self-critique loop behind a flag) once the simple router's value is proven.
