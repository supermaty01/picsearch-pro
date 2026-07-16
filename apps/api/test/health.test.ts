import { healthResponseSchema } from '@picsearch/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase.js', () => ({
  createSupabase: vi.fn(),
  STORAGE_BUCKET: 'images',
}));

import { app } from '../src/index.js';
import { createSupabase } from '../src/lib/supabase.js';
import { defaultAiRun, makeEnv, makeFakeSupabase } from './helpers.js';

const env = makeEnv((model) => defaultAiRun(model));

beforeEach(() => {
  vi.mocked(createSupabase).mockReturnValue(
    makeFakeSupabase() as ReturnType<typeof createSupabase>,
  );
});

describe('GET /api/v1/health', () => {
  it('returns ok with dependency checks when all pass', async () => {
    const res = await app.request('/api/v1/health', {}, env);
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body.status).toBe('ok');
    expect(body.service).toBe('picsearch-api');
    expect(body.checks).toEqual({ db: true, storage: true, ai: true });
  });

  it('reports degraded (503) when a dependency fails', async () => {
    vi.mocked(createSupabase).mockReturnValue(
      makeFakeSupabase({ bucketResult: { error: { message: 'no bucket' } } }) as ReturnType<
        typeof createSupabase
      >,
    );
    const res = await app.request('/api/v1/health', {}, env);
    expect(res.status).toBe(503);
    const body = healthResponseSchema.parse(await res.json());
    expect(body.status).toBe('degraded');
    expect(body.checks.storage).toBe(false);
  });

  it('404s outside the base path', async () => {
    const res = await app.request('/health', {}, env);
    expect(res.status).toBe(404);
  });
});
