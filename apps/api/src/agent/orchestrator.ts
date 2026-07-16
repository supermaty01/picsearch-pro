import {
  AGENT_TOOL_ARGS,
  type AgentAction,
  type AgentToolName,
  isAgentToolName,
  MODELS,
  toAgentAction,
} from '@picsearch/shared';
import { z } from 'zod';

import { type Env } from '../env.js';
import { aiRun } from '../lib/ai.js';
import { withTimeout } from '../lib/timed.js';
import { buildSystemPrompt } from './prompt.js';
import { buildAgentTools } from './tools.js';

/** How the agent decided to resolve the query. */
export type RouteDecision =
  { kind: 'search'; queries: string[] } | { kind: 'clarification'; question: string };

export interface AgentOutcome {
  decision: RouteDecision;
  action: AgentAction;
  tokensUsed: number | null;
  ms: number;
}

/**
 * Decision budget; on timeout we fall back to a direct search (docs/05 §4).
 * 5 s (not 3): glm-4.7-flash needs ~1 s for pass-through decisions but up to
 * ~4 s when it writes a reformulation or clarifying question on the free tier —
 * a 3 s budget silently disabled those routes.
 */
const AGENT_TIMEOUT_MS = 5000;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * A tool call in either provider dialect: legacy Workers AI (`{ name, arguments }`)
 * or OpenAI chat-completions (`{ function: { name, arguments } }`, used by
 * glm-4.7-flash). Both are normalized to the flat shape before parsing.
 */
const toolCallSchema = z.union([
  z.object({ name: z.string(), arguments: z.unknown() }),
  z.object({ function: z.object({ name: z.string(), arguments: z.unknown() }) }),
]);
type ToolCall = z.infer<typeof toolCallSchema>;

const agentResponseSchema = z.object({
  tool_calls: z.array(toolCallSchema).optional(),
  choices: z
    .array(z.object({ message: z.object({ tool_calls: z.array(toolCallSchema).optional() }) }))
    .optional(),
  usage: z.object({ total_tokens: z.number() }).partial().optional(),
});

/**
 * Route a query through the orchestrator agent (FR-6, FR-7). Returns the chosen
 * route; never throws for model misbehavior — a malformed/absent tool call is
 * retried once, then degrades to `agent_fallback` = direct search with the raw
 * query. A timeout degrades the same way. Search must never 500 here (AGENTS §4).
 */
export async function routeQuery(
  env: Env,
  query: string,
  options: { allowClarification: boolean } = { allowClarification: true },
): Promise<AgentOutcome> {
  const start = Date.now();
  const tools = buildAgentTools(options.allowClarification);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(query) },
    { role: 'user', content: query },
  ];

  try {
    return await withTimeout(
      () => decide(env, query, messages, tools, start),
      AGENT_TIMEOUT_MS,
      () => new Error('agent decision timed out'),
    );
  } catch {
    // Timeout or transport error → degrade to direct search.
    return fallback(query, start, null);
  }
}

async function decide(
  env: Env,
  query: string,
  messages: ChatMessage[],
  tools: ReturnType<typeof buildAgentTools>,
  start: number,
): Promise<AgentOutcome> {
  const first = await callAgent(env, messages, tools);
  const firstParse = parseToolCall(first.name, first.args);
  if (firstParse.ok) {
    return finalize(firstParse.tool, firstParse.value, query, start, first.tokensUsed);
  }

  // One retry with the validation error fed back (docs/05 §2).
  const retryMessages: ChatMessage[] = [
    ...messages,
    {
      role: 'assistant',
      content: `Invalid tool call: ${firstParse.error}. I will correct it now.`,
    },
    { role: 'user', content: 'Your previous tool call was invalid. Call exactly one valid tool.' },
  ];
  const second = await callAgent(env, retryMessages, tools);
  const secondParse = parseToolCall(second.name, second.args);
  if (secondParse.ok) {
    return finalize(secondParse.tool, secondParse.value, query, start, second.tokensUsed);
  }

  return fallback(query, start, second.tokensUsed);
}

interface RawCall {
  name: string | null;
  args: unknown;
  tokensUsed: number | null;
}

async function callAgent(
  env: Env,
  messages: ChatMessage[],
  tools: ReturnType<typeof buildAgentTools>,
): Promise<RawCall> {
  // glm-4.7-flash exposes the OpenAI chat-completions schema: `tool_choice`
  // only accepts none/auto/required. Reasoning must be off to stay inside the
  // 3 s decision budget (docs/05 §4) — `thinking` is GLM's documented switch,
  // `chat_template_kwargs` the vLLM-style fallback; both are accepted.
  const raw = await aiRun(env, MODELS.agent, {
    messages,
    tools,
    tool_choice: 'required',
    temperature: 0.1,
    max_completion_tokens: 256,
    thinking: { type: 'disabled' },
    chat_template_kwargs: { enable_thinking: false },
  });
  const parsed = agentResponseSchema.safeParse(raw);
  if (!parsed.success) return { name: null, args: undefined, tokensUsed: null };

  const call = parsed.data.tool_calls?.[0] ?? parsed.data.choices?.[0]?.message.tool_calls?.[0];
  const flat = call === undefined ? undefined : flattenToolCall(call);
  return {
    name: flat?.name ?? null,
    args: flat?.arguments,
    tokensUsed: parsed.data.usage?.total_tokens ?? null,
  };
}

function flattenToolCall(call: ToolCall): { name: string; arguments: unknown } {
  return 'function' in call ? call.function : call;
}

type ParseResult = { ok: true; tool: AgentToolName; value: unknown } | { ok: false; error: string };

function parseToolCall(name: string | null, args: unknown): ParseResult {
  if (name === null || !isAgentToolName(name)) {
    return { ok: false, error: `unknown or missing tool "${name ?? '(none)'}"` };
  }
  // Arguments may arrive as a JSON string or an object.
  const coerced = typeof args === 'string' ? safeJsonParse(args) : (args ?? {});
  const result = AGENT_TOOL_ARGS[name].safeParse(coerced);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join('; ') };
  }
  return { ok: true, tool: name, value: result.data };
}

function finalize(
  tool: AgentToolName,
  value: unknown,
  query: string,
  start: number,
  tokensUsed: number | null,
): AgentOutcome {
  const action = toAgentAction(tool);
  const ms = Date.now() - start;
  switch (tool) {
    case 'search_direct':
      return { decision: { kind: 'search', queries: [query] }, action, tokensUsed, ms };
    case 'search_reformulated': {
      const { reformulatedQuery } = value as { reformulatedQuery: string };
      return { decision: { kind: 'search', queries: [reformulatedQuery] }, action, tokensUsed, ms };
    }
    case 'search_decomposed': {
      const { subQueries } = value as { subQueries: string[] };
      return { decision: { kind: 'search', queries: subQueries }, action, tokensUsed, ms };
    }
    case 'ask_for_context': {
      const { question } = value as { question: string };
      return { decision: { kind: 'clarification', question }, action, tokensUsed, ms };
    }
  }
}

function fallback(query: string, start: number, tokensUsed: number | null): AgentOutcome {
  return {
    decision: { kind: 'search', queries: [query] },
    action: 'agent_fallback',
    tokensUsed,
    ms: Date.now() - start,
  };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
