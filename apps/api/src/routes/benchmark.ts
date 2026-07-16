import { benchmarkRequestSchema } from '@picsearch/shared';
import { Hono } from 'hono';

import { BadRequestError } from '../lib/problem.js';
import {
  ALL_STRATEGIES,
  getBenchmark,
  runBenchmark,
  startBenchmark,
} from '../services/benchmark.js';
import { type AppBindings } from '../types.js';

/** Benchmark runner (FR-13, FR-14). Long-running: 202 + poll (docs/04, docs/06). */
export const benchmark = new Hono<AppBindings>();

benchmark.post('/', async (c) => {
  const raw: unknown = await c.req.json().catch(() => ({}));
  const parsed = benchmarkRequestSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new BadRequestError('Body must be { strategies?: ("A"|"B"|"C"|"D")[] }.');
  }
  const strategies = parsed.data.strategies ?? ALL_STRATEGIES;
  const runId = await startBenchmark(c.env, strategies);

  try {
    const ctx = c.executionCtx;
    ctx.waitUntil(runBenchmark(c.env, runId, strategies));
  } catch {
    // No runtime ctx (test env): run inline so polling returns a result.
    await runBenchmark(c.env, runId, strategies);
  }

  return c.json({ runId }, 202);
});

benchmark.get('/:runId', async (c) => {
  return c.json(await getBenchmark(c.env, c.req.param('runId')));
});
