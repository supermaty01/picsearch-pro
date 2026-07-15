import { Hono } from 'hono';

import { listTelemetry } from '../services/telemetry.js';
import { type AppBindings } from '../types.js';

/** Recent query telemetry for the observability panel (FR-12). */
export const telemetry = new Hono<AppBindings>();

telemetry.get('/', async (c) => {
  const raw = Number(c.req.query('limit') ?? '20');
  const limit = Number.isFinite(raw) ? Math.min(Math.max(1, raw), 100) : 20;
  return c.json(await listTelemetry(c.env, limit));
});
