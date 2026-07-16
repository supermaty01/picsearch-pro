import { AGENT_TOOL_ARGS, AGENT_TOOL_NAMES, type AgentToolName } from '@picsearch/shared';
import { z } from 'zod';

import { AGENT_TOOL_DESCRIPTIONS } from './prompt.js';

/**
 * Build the OpenAI-style function-calling tool list for the agent model from the
 * shared Zod schemas (one source of truth, NFR-7). `ask_for_context` is dropped
 * on the second clarification pass so the agent cannot loop (docs/05 §4).
 */
export interface AgentToolDef {
  type: 'function';
  function: {
    name: AgentToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export function buildAgentTools(allowClarification: boolean): AgentToolDef[] {
  const names = allowClarification
    ? AGENT_TOOL_NAMES
    : AGENT_TOOL_NAMES.filter((n) => n !== 'ask_for_context');

  return names.map((name) => ({
    type: 'function',
    function: {
      name,
      description: AGENT_TOOL_DESCRIPTIONS[name],
      parameters: z.toJSONSchema(AGENT_TOOL_ARGS[name]),
    },
  }));
}
