import { searchRequestSchema } from '@picsearch/shared';
import { Hono } from 'hono';

import { BadRequestError } from '../lib/problem.js';
import { rateLimit } from '../lib/rate-limit.js';
import { runSearch } from '../services/search.js';
import { type AppBindings } from '../types.js';

/** Search route (FR-6..FR-11). The agent orchestrates; the DB is never hit directly. */
export const search = new Hono<AppBindings>();

search.post('/', rateLimit({ limit: 30, windowMs: 60_000 }), async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('Request body must be { query: string } (2-500 chars).');
  }

  // Persist telemetry after the response flushes when a runtime ctx is available.
  let defer: ((p: Promise<unknown>) => void) | undefined;
  try {
    const ctx = c.executionCtx;
    defer = (p) => {
      ctx.waitUntil(p);
    };
  } catch {
    defer = undefined; // test / no-ctx environment: telemetry awaited inline
  }

  const response = await runSearch(c.env, parsed.data.query, { defer });
  return c.json(response);
});
