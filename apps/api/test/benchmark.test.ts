import { benchmarkStartResponseSchema, benchmarkStatusResponseSchema } from '@picsearch/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase.js', () => ({
  createSupabase: vi.fn(),
  STORAGE_BUCKET: 'images',
}));

import { app } from '../src/index.js';
import { createSupabase } from '../src/lib/supabase.js';
import { defaultAiRun, makeEnv, makeFakeSupabase } from './helpers.js';

const env = makeEnv((model) => defaultAiRun(model));

const doneReport = {
  runId: '22222222-2222-4222-8222-222222222222',
  startedAt: '2026-07-15T00:00:00.000Z',
  completedAt: '2026-07-15T00:01:00.000Z',
  strategies: [
    {
      strategy: 'D',
      label: 'Agent + hybrid + rerank',
      recallAt3: 1,
      recallAt5: 1,
      mrr: 1,
      p50LatencyMs: 12,
      perQuery: [
        {
          queryId: 'q01',
          queryText: 'notre dame cathedral gothic facade lit up at night',
          category: 'direct',
          recallAt3: 1,
          recallAt5: 1,
          reciprocalRank: 1,
          clarified: false,
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.mocked(createSupabase).mockReturnValue(
    makeFakeSupabase({
      runRow: {
        data: { status: 'done', progress: 1, report: doneReport, detail: null },
        error: null,
      },
    }) as ReturnType<typeof createSupabase>,
  );
});

describe('Benchmark endpoints (FR-13, FR-14)', () => {
  it('POST /benchmark starts a run and returns 202 + runId', async () => {
    const res = await app.request(
      '/api/v1/benchmark',
      {
        method: 'POST',
        body: JSON.stringify({ strategies: ['A'] }),
        headers: { 'content-type': 'application/json' },
      },
      env,
    );
    expect(res.status).toBe(202);
    const body = benchmarkStartResponseSchema.parse(await res.json());
    expect(body.runId).toBeTruthy();
  });

  it('GET /benchmark/:runId returns a done report', async () => {
    const res = await app.request(`/api/v1/benchmark/${doneReport.runId}`, {}, env);
    expect(res.status).toBe(200);
    const status = benchmarkStatusResponseSchema.parse(await res.json());
    expect(status.status).toBe('done');
    if (status.status !== 'done') throw new Error('expected done');
    expect(status.results.strategies[0]?.strategy).toBe('D');
  });

  it('GET reports a fresh running run as running', async () => {
    vi.mocked(createSupabase).mockReturnValue(
      makeFakeSupabase({
        runRow: {
          data: {
            status: 'running',
            progress: 0.4,
            report: null,
            detail: null,
            updated_at: new Date().toISOString(),
          },
          error: null,
        },
      }) as ReturnType<typeof createSupabase>,
    );
    const res = await app.request(`/api/v1/benchmark/${doneReport.runId}`, {}, env);
    const status = benchmarkStatusResponseSchema.parse(await res.json());
    expect(status.status).toBe('running');
  });

  it('GET reports an abandoned running run (stale heartbeat) as error, not running', async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    vi.mocked(createSupabase).mockReturnValue(
      makeFakeSupabase({
        runRow: {
          data: { status: 'running', progress: 0.4, report: null, detail: null, updated_at: stale },
          error: null,
        },
      }) as ReturnType<typeof createSupabase>,
    );
    const res = await app.request(`/api/v1/benchmark/${doneReport.runId}`, {}, env);
    const status = benchmarkStatusResponseSchema.parse(await res.json());
    expect(status.status).toBe('error');
    if (status.status !== 'error') throw new Error('expected error');
    expect(status.detail).toMatch(/interrupted/i);
  });
});
