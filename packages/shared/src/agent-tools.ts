import { z } from 'zod';

import { type AgentAction } from './api.js';
import { RETRIEVAL } from './models.js';

/**
 * Orchestrator agent tool schemas (FR-7, docs/05). Defined once as Zod and
 * converted to JSON Schema for the model on the Worker side. The model MUST call
 * exactly one tool; its arguments are Zod-parsed before use (untrusted, NFR-4).
 */
export const AGENT_TOOL_ARGS = {
  /** Clear query — pass through unchanged (no args). */
  search_direct: z.object({}),
  /** Noisy/misspelled query — rewrite into a clean, semantically rich query. */
  search_reformulated: z.object({
    reformulatedQuery: z.string().trim().min(3).max(500),
  }),
  /** Multi-concept query — 2..3 independently retrievable sub-queries. */
  search_decomposed: z.object({
    subQueries: z.array(z.string().trim().min(3).max(500)).min(2).max(RETRIEVAL.maxSubQueries),
  }),
  /** Ambiguous query — return a clarifying question instead of results. */
  ask_for_context: z.object({
    question: z.string().trim().min(1).max(300),
  }),
} as const;

export type AgentToolName = keyof typeof AGENT_TOOL_ARGS;

export const AGENT_TOOL_NAMES = Object.keys(AGENT_TOOL_ARGS) as AgentToolName[];

export function isAgentToolName(name: string): name is AgentToolName {
  return name in AGENT_TOOL_ARGS;
}

/** Map a tool name to its persisted telemetry action (docs/03). */
export function toAgentAction(tool: AgentToolName): AgentAction {
  switch (tool) {
    case 'search_direct':
      return 'direct';
    case 'search_reformulated':
      return 'reformulate';
    case 'search_decomposed':
      return 'decompose';
    case 'ask_for_context':
      return 'ask_context';
  }
}
