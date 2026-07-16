import { MODELS, searchResponseSchema } from '@picsearch/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase.js', () => ({
  createSupabase: vi.fn(),
  STORAGE_BUCKET: 'images',
}));

import { app } from '../src/index.js';
import { createSupabase } from '../src/lib/supabase.js';
import { candidateRow, makeEnv, makeFakeSupabase } from './helpers.js';

const ID_A = '00000000-0000-4000-8000-000000000001';
const ID_B = '00000000-0000-4000-8000-000000000002';
const candidates = [
  candidateRow(ID_A, 'a red car on a street', 0.4),
  candidateRow(ID_B, 'a blue bike', 0.2),
];

beforeEach(() => {
  vi.mocked(createSupabase).mockReturnValue(
    makeFakeSupabase({ rpcResult: { data: candidates, error: null } }) as ReturnType<
      typeof createSupabase
    >,
  );
});

interface AgentTool {
  name: string;
  arguments: unknown;
}

/** aiRun stub: fixed agent tool call + embedding + configurable rerank. */
function run(agentTool: AgentTool, rerankResponse: unknown) {
  return (model: string): unknown => {
    if (model === MODELS.agent) return { tool_calls: [agentTool], usage: { total_tokens: 10 } };
    if (model === MODELS.embedding) return { data: [new Array(384).fill(0.02) as number[]] };
    if (model === MODELS.reranker) return rerankResponse;
    throw new Error(`unexpected model ${model}`);
  };
}

async function post(env: ReturnType<typeof makeEnv>, query: string): Promise<Response> {
  return app.request(
    '/api/v1/search',
    {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'content-type': 'application/json' },
    },
    env,
  );
}

describe('POST /api/v1/search (FR-6..FR-11)', () => {
  it('direct route returns reranked results with telemetry', async () => {
    const env = makeEnv(
      run(
        { name: 'search_direct', arguments: {} },
        {
          response: [
            { id: 1, score: 0.95 },
            { id: 0, score: 0.5 },
          ],
        },
      ),
    );
    const res = await post(env, 'red car');
    expect(res.status).toBe(200);
    const body = searchResponseSchema.parse(await res.json());
    if (body.kind !== 'results') throw new Error(`expected results, got ${body.kind}`);
    expect(body.agent.action).toBe('direct');
    expect(body.agent.resolvedQueries).toEqual(['red car']);
    // rerank put id=1 (candidate B) first.
    expect(body.results[0]?.id).toBe(ID_B);
    expect(body.telemetry.rerankSkipped).toBe(false);
  });

  it('ambiguous query returns a clarification (no retrieval)', async () => {
    const env = makeEnv(
      run({ name: 'ask_for_context', arguments: { question: 'Beach or city?' } }, {}),
    );
    const res = await post(env, 'something nice');
    const body = searchResponseSchema.parse(await res.json());
    if (body.kind !== 'clarification') throw new Error(`expected clarification, got ${body.kind}`);
    expect(body.question).toBe('Beach or city?');
  });

  it('degrades to RRF order when the reranker returns garbage (rerankSkipped)', async () => {
    const env = makeEnv(
      run({ name: 'search_direct', arguments: {} }, { response: 'not-an-array' }),
    );
    const res = await post(env, 'red car');
    const body = searchResponseSchema.parse(await res.json());
    if (body.kind !== 'results') throw new Error(`expected results, got ${body.kind}`);
    expect(body.telemetry.rerankSkipped).toBe(true);
    // RRF order preserved: A (0.4) before B (0.2).
    expect(body.results.map((r) => r.id)).toEqual([ID_A, ID_B]);
  });

  it('rejects an invalid body → 400', async () => {
    const env = makeEnv(run({ name: 'search_direct', arguments: {} }, {}));
    const res = await app.request(
      '/api/v1/search',
      {
        method: 'POST',
        body: JSON.stringify({ q: 'wrong' }),
        headers: { 'content-type': 'application/json' },
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});
