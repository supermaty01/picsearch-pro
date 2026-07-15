import { healthResponseSchema } from '@picsearch/shared';
import { Hono } from 'hono';

import { type Env } from './env.js';

const app = new Hono<{ Bindings: Env }>().basePath('/api/v1');

/**
 * Liveness endpoint. Dependency checks (db/storage/ai) are added in Phase 2+
 * when those clients exist — see docs/04-api-contract.md.
 */
app.get('/health', (c) => {
  const body = healthResponseSchema.parse({
    status: 'ok',
    service: 'picsearch-api',
    version: '0.1.0',
  });
  return c.json(body);
});

export default app;
