import { type MiddlewareHandler } from 'hono';

import { type AppBindings } from '../types.js';
import { RateLimitedError } from './problem.js';

/**
 * Best-effort per-IP fixed-window rate limit (docs/04 §Rate limits). State is
 * isolate-local (a Map), so it is approximate across the edge — adequate as an
 * abuse brake on a free-tier demo; a global limit would use Durable Objects.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: {
  limit: number;
  windowMs: number;
}): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'local';
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (bucket === undefined || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    } else {
      bucket.count += 1;
      if (bucket.count > options.limit) {
        throw new RateLimitedError('Rate limit exceeded. Please slow down and retry shortly.');
      }
    }
    await next();
  };
}
