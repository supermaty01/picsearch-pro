import { describe, expect, it } from 'vitest';

import app from '../src/index.js';

describe('GET /api/v1/health', () => {
  it('returns ok with service identity', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      service: 'picsearch-api',
      version: '0.1.0',
    });
  });

  it('404s outside the base path', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(404);
  });
});
