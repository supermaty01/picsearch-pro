import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { type Env } from './env.js';
import { isOriginAllowed, parseAllowedOrigins } from './lib/cors.js';
import { renderProblem } from './lib/problem.js';
import { benchmark } from './routes/benchmark.js';
import { images } from './routes/images.js';
import { search } from './routes/search.js';
import { telemetry } from './routes/telemetry.js';
import { purgeExpiredUploads } from './services/cleanup.js';
import { checkHealth } from './services/health.js';
import { type AppBindings } from './types.js';

export const app = new Hono<AppBindings>().basePath('/api/v1');

/**
 * Correlation id for every request (docs/04): honor an inbound `x-request-id`
 * or mint one, expose it on the response, and stash it for error rendering.
 */
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  await next();
});

/**
 * CORS lockdown (NFR-5). `ALLOWED_ORIGINS` (comma-separated) whitelists the Pages
 * origin(s) in production — including their per-commit preview subdomains (see
 * lib/cors.ts); unset in local dev reflects any origin for convenience.
 */
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = (c.env as Env).ALLOWED_ORIGINS;
      if (!allowed) return origin;
      return isOriginAllowed(origin, parseAllowedOrigins(allowed)) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['content-type', 'x-request-id', 'x-seed-key'],
  }),
);

/** Central error boundary → RFC 9457 problem+json (AGENTS §5). */
app.onError((err, c) => renderProblem(c, err, c.get('requestId')));

/** Liveness + dependency checks (db/storage/ai). */
app.get('/health', async (c) => {
  const body = await checkHealth(c.env);
  return c.json(body, body.status === 'ok' ? 200 : 503);
});

app.route('/images', images);
app.route('/search', search);
app.route('/telemetry', telemetry);
app.route('/benchmark', benchmark);

/**
 * Worker entry: HTTP via Hono + the hourly retention cron (wrangler.jsonc
 * `triggers.crons`) that expires public uploads after 24 h.
 */
export default {
  fetch: app.fetch,
  scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(
      purgeExpiredUploads(env).catch((err: unknown) => {
        console.error('retention sweep failed', err);
      }),
    );
  },
};
