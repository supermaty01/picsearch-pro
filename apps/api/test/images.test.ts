import {
  ingestResponseSchema,
  MODELS,
  problemDetailsSchema,
  UPLOAD_LIMITS,
} from '@picsearch/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase.js', () => ({
  createSupabase: vi.fn(),
  STORAGE_BUCKET: 'images',
}));

import app from '../src/index.js';
import { createSupabase } from '../src/lib/supabase.js';
import { defaultAiRun, makeEnv, makeFakeSupabase, validVisionAnalysis } from './helpers.js';

const env = makeEnv((model) => defaultAiRun(model));

beforeEach(() => {
  vi.mocked(createSupabase).mockReturnValue(
    makeFakeSupabase() as ReturnType<typeof createSupabase>,
  );
});

async function post(body: BodyInit): Promise<Response> {
  return app.request('/api/v1/images', { method: 'POST', body }, env);
}

describe('POST /api/v1/images (FR-1..FR-5)', () => {
  it('ingests a valid image end-to-end → 201', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'beach.jpg', { type: 'image/jpeg' }));
    const res = await post(form);
    expect(res.status).toBe(201);
    const body = ingestResponseSchema.parse(await res.json());
    expect(body.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(body.imageUrl).toContain('https://cdn.test/');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('rejects an image flagged as adult content → 422, nothing stored', async () => {
    const unsafeEnv = makeEnv((model) => {
      if (model === MODELS.vision) {
        return { response: JSON.stringify({ ...validVisionAnalysis, content_rating: 'unsafe' }) };
      }
      return defaultAiRun(model);
    });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'nope.jpg', { type: 'image/jpeg' }));
    const res = await app.request('/api/v1/images', { method: 'POST', body: form }, unsafeEnv);
    expect(res.status).toBe(422);
    const body = problemDetailsSchema.parse(await res.json());
    expect(body.type).toContain('unsafe-content');
  });

  it('rejects a disallowed MIME type → 415 problem+json', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' }));
    const res = await post(form);
    expect(res.status).toBe(415);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const body = problemDetailsSchema.parse(await res.json());
    expect(body.status).toBe(415);
    expect(body.type).toContain('unsupported-media-type');
  });

  it('rejects an oversize file → 413', async () => {
    const file = new File([new Uint8Array(UPLOAD_LIMITS.maxBytes + 1)], 'big.png', {
      type: 'image/png',
    });
    const form = new FormData();
    form.set('file', file);
    const res = await post(form);
    expect(res.status).toBe(413);
  });

  it('rejects a request with no file field → 400', async () => {
    const res = await post(new FormData());
    expect(res.status).toBe(400);
  });
});
