import { MODELS } from '@picsearch/shared';
import { describe, expect, it, vi } from 'vitest';

import { routeQuery } from '../src/agent/orchestrator.js';
import { makeEnv } from './helpers.js';

/** Build an env whose agent model returns the given tool call(s) in sequence. */
function agentEnv(...calls: { name: string; arguments: unknown }[][]) {
  let i = 0;
  const run = vi.fn((model: string) => {
    if (model !== MODELS.agent) throw new Error(`unexpected model ${model}`);
    const tool_calls = calls[Math.min(i, calls.length - 1)] ?? [];
    i += 1;
    return { tool_calls, usage: { total_tokens: 7 } };
  });
  return makeEnv(run);
}

describe('routeQuery (FR-7 routes)', () => {
  it('search_direct passes the query through unchanged', async () => {
    const out = await routeQuery(agentEnv([{ name: 'search_direct', arguments: {} }]), 'red car');
    expect(out.action).toBe('direct');
    expect(out.decision).toEqual({ kind: 'search', queries: ['red car'] });
  });

  it('search_reformulated returns the cleaned query', async () => {
    const out = await routeQuery(
      agentEnv([
        { name: 'search_reformulated', arguments: { reformulatedQuery: 'photo in France' } },
      ]),
      'pic i took in frnace',
    );
    expect(out.action).toBe('reformulate');
    expect(out.decision).toEqual({ kind: 'search', queries: ['photo in France'] });
  });

  it('search_decomposed returns the sub-queries', async () => {
    const out = await routeQuery(
      agentEnv([
        {
          name: 'search_decomposed',
          arguments: { subQueries: ['beach sunset', 'gothic cathedral'] },
        },
      ]),
      'beach sunset but also gothic architecture',
    );
    expect(out.action).toBe('decompose');
    expect(out.decision).toEqual({
      kind: 'search',
      queries: ['beach sunset', 'gothic cathedral'],
    });
  });

  it('ask_for_context returns a clarification', async () => {
    const out = await routeQuery(
      agentEnv([
        { name: 'ask_for_context', arguments: { question: 'Beach, mountains, or city?' } },
      ]),
      'something nice',
    );
    expect(out.action).toBe('ask_context');
    expect(out.decision).toEqual({ kind: 'clarification', question: 'Beach, mountains, or city?' });
  });

  it('parses OpenAI chat-completions tool calls (glm-4.7-flash shape)', async () => {
    const run = vi.fn(() => ({
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'search_reformulated',
                  arguments: '{"reformulatedQuery":"eiffel tower at night"}',
                },
              },
            ],
          },
        },
      ],
      usage: { total_tokens: 42 },
    }));
    const out = await routeQuery(makeEnv(run), 'eifel towr nite');
    expect(out.action).toBe('reformulate');
    expect(out.decision).toEqual({ kind: 'search', queries: ['eiffel tower at night'] });
    expect(out.tokensUsed).toBe(42);
  });

  it('sends an OpenAI-compatible request (valid tool_choice, no reasoning)', async () => {
    const run = vi.fn((_model: string, _input: unknown) => ({
      tool_calls: [{ name: 'search_direct', arguments: {} }],
    }));
    await routeQuery(makeEnv(run), 'red car');
    const input = run.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(input.tool_choice).toBe('required');
    expect(input.max_completion_tokens).toBeDefined();
    expect(input.thinking).toEqual({ type: 'disabled' });
    expect(input.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it('adds a decompose router hint when the query has a multi-subject connector', async () => {
    const run = vi.fn((_model: string, input: unknown) => {
      const { messages } = input as { messages: { role: string; content: string }[] };
      const system = messages[0]?.content ?? '';
      const name = system.includes('Router hint') ? 'search_decomposed' : 'search_direct';
      const args = name === 'search_decomposed' ? { subQueries: ['a scene', 'b scene'] } : {};
      return { tool_calls: [{ name, arguments: args }] };
    });
    const out = await routeQuery(makeEnv(run), 'a snowman but also a tropical beach');
    expect(out.action).toBe('decompose');

    const plain = await routeQuery(makeEnv(run), 'a snowman in the snow');
    expect(plain.action).toBe('direct');
  });

  it('parses tool arguments delivered as a JSON string', async () => {
    const out = await routeQuery(
      agentEnv([{ name: 'search_reformulated', arguments: '{"reformulatedQuery":"clean query"}' }]),
      'msgy qry',
    );
    expect(out.decision).toEqual({ kind: 'search', queries: ['clean query'] });
  });

  it('retries once on an invalid tool call, then succeeds', async () => {
    const env = agentEnv(
      [{ name: 'search_decomposed', arguments: { subQueries: ['only one'] } }], // invalid: <2
      [{ name: 'search_direct', arguments: {} }],
    );
    const out = await routeQuery(env, 'cat');
    expect(out.action).toBe('direct');
  });

  it('falls back to direct search after two invalid calls (agent_fallback)', async () => {
    const env = agentEnv([{ name: 'nonsense', arguments: {} }]);
    const out = await routeQuery(env, 'blue bicycle');
    expect(out.action).toBe('agent_fallback');
    expect(out.decision).toEqual({ kind: 'search', queries: ['blue bicycle'] });
  });

  it('falls back when no tool is called at all', async () => {
    const env = agentEnv([]);
    const out = await routeQuery(env, 'sunset');
    expect(out.action).toBe('agent_fallback');
  });
});
