import {
  aggregateMetrics,
  type BenchmarkReport,
  type BenchmarkStatusResponse,
  benchmarkReportSchema,
  DEFAULT_WEIGHTS,
  type GroundTruthQuery,
  groundTruthSchema,
  type PerQueryResult,
  queryMetrics,
  RETRIEVAL,
  SEED_STORAGE_PREFIX,
  STRATEGY_IDS,
  STRATEGY_LABELS,
  type StrategyId,
  type StrategyReport,
  VECTOR_ONLY_WEIGHTS,
} from '@picsearch/shared';

import groundTruthJson from '../../../../test-dataset/ground-truth.json';
import { type Env } from '../env.js';
import { NotFoundError, RateLimitedError, UpstreamError } from '../lib/problem.js';
import { createSupabase, type DbCountResult, type DbResult } from '../lib/supabase.js';
import { routeQuery } from '../agent/orchestrator.js';
import { mergeCandidates } from '../lib/merge.js';
import { type Candidate } from './hybrid-search.js';
import { rerank } from './rerank.js';
import { rerankResolved, retrieve } from './search.js';

/** Ground truth is bundled and validated once at module load (fail fast). */
const GROUND_TRUTH = groundTruthSchema.parse(groundTruthJson);

/** At most 2 concurrent benchmark runs (docs/04 §Rate limits). */
const MAX_CONCURRENT_RUNS = 2;

/**
 * A 'running' row whose heartbeat (`updated_at`) is older than this is treated
 * as abandoned: its Worker `waitUntil` task died (isolate eviction, budget) and
 * it will never finish. Such rows must not block new runs, and a client polling
 * one must be told it failed instead of waiting forever. The heartbeat is bumped
 * before/after every strategy, so the window only needs to exceed the slowest
 * single strategy over the ground-truth set (14 queries) with margin.
 */
const STALE_RUN_MS = 3 * 60 * 1000;

/** `benchmark_runs.status` values (docs/03). */
const RUN_STATUS = {
  running: 'running',
  done: 'done',
  error: 'error',
} as const;

const STALE_DETAIL = 'Run interrupted (worker stopped before completion).';

function staleCutoff(): string {
  return new Date(Date.now() - STALE_RUN_MS).toISOString();
}

/**
 * Start a benchmark run (FR-13): reserve a row and return its id. The heavy work
 * runs via `runBenchmark` (caller defers it with `ctx.waitUntil`); progress is
 * polled through `getBenchmark`.
 */
export async function startBenchmark(env: Env, strategies: StrategyId[]): Promise<string> {
  const supabase = createSupabase(env);

  // Reap abandoned runs first so a dead run can never permanently block new ones.
  await sweepStaleRuns(supabase);

  const running = (await supabase
    .from('benchmark_runs')
    .select('id', { head: true, count: 'exact' })
    .eq('status', RUN_STATUS.running)
    .gt('updated_at', staleCutoff())) as DbCountResult;
  if (running.error) throw new UpstreamError(`benchmark check failed: ${running.error.message}`);
  if ((running.count ?? 0) >= MAX_CONCURRENT_RUNS) {
    throw new RateLimitedError('Too many benchmark runs in progress. Try again shortly.');
  }

  const { data, error } = (await supabase
    .from('benchmark_runs')
    .insert({ status: RUN_STATUS.running, strategies, progress: 0 })
    .select('id')
    .single()) as DbResult<{ id: string }>;
  if (error || !data)
    throw new UpstreamError(`benchmark start failed: ${error?.message ?? 'no row'}`);
  return data.id;
}

/** Execute all requested strategies over the ground-truth set and persist the report. */
export async function runBenchmark(
  env: Env,
  runId: string,
  strategies: StrategyId[],
): Promise<void> {
  const supabase = createSupabase(env);
  const startedAt = new Date().toISOString();
  try {
    const seedMap = await loadSeedMap(env);
    const reports: StrategyReport[] = [];
    for (const [index, strategy] of strategies.entries()) {
      // Heartbeat before the strategy's long work so an in-progress run is never
      // mistaken for abandoned (staleCutoff), and after with the new progress.
      await heartbeat(supabase, runId);
      reports.push(await runStrategy(env, strategy, seedMap));
      await supabase
        .from('benchmark_runs')
        .update({ progress: (index + 1) / strategies.length, updated_at: nowIso() })
        .eq('id', runId);
    }

    const report: BenchmarkReport = {
      runId,
      startedAt,
      completedAt: new Date().toISOString(),
      strategies: reports,
    };
    await supabase
      .from('benchmark_runs')
      .update({ status: RUN_STATUS.done, progress: 1, report, updated_at: nowIso() })
      .eq('id', runId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown error';
    await supabase
      .from('benchmark_runs')
      .update({ status: RUN_STATUS.error, detail, updated_at: nowIso() })
      .eq('id', runId);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Bump a run's heartbeat so an active run is never swept as stale. */
async function heartbeat(
  supabase: ReturnType<typeof createSupabase>,
  runId: string,
): Promise<void> {
  await supabase.from('benchmark_runs').update({ updated_at: nowIso() }).eq('id', runId);
}

/**
 * Mark abandoned runs (status 'running', heartbeat older than STALE_RUN_MS) as
 * errored. Idempotent and best-effort: keeps the history honest and frees the
 * concurrency slot so a dead run can never block new ones.
 */
async function sweepStaleRuns(supabase: ReturnType<typeof createSupabase>): Promise<void> {
  const { error } = (await supabase
    .from('benchmark_runs')
    .update({ status: RUN_STATUS.error, detail: STALE_DETAIL, updated_at: nowIso() })
    .eq('status', RUN_STATUS.running)
    .lt('updated_at', staleCutoff())) as DbResult<unknown>;
  if (error) throw new UpstreamError(`benchmark sweep failed: ${error.message}`);
}

export async function getBenchmark(env: Env, runId: string): Promise<BenchmarkStatusResponse> {
  const supabase = createSupabase(env);
  const { data, error } = (await supabase
    .from('benchmark_runs')
    .select('status, progress, report, detail, updated_at')
    .eq('id', runId)
    .maybeSingle()) as DbResult<{
    status: string;
    progress: number;
    report: unknown;
    detail: string | null;
    updated_at: string;
  }>;
  if (error) throw new UpstreamError(`benchmark lookup failed: ${error.message}`);
  if (!data) throw new NotFoundError(`No benchmark run with id ${runId}.`);

  if (data.status === RUN_STATUS.done) {
    return { status: 'done', results: benchmarkReportSchema.parse(data.report) };
  }
  if (data.status === RUN_STATUS.error) {
    return { status: 'error', detail: data.detail ?? 'Benchmark failed.' };
  }
  // A 'running' row with a stale heartbeat is abandoned — its worker died. Tell
  // the client it failed (so polling stops and the button re-enables) instead of
  // reporting perpetual progress it will never advance past.
  if (data.updated_at <= staleCutoff()) {
    return { status: 'error', detail: STALE_DETAIL };
  }
  return { status: 'running', progress: data.progress };
}

// --- Internals --------------------------------------------------------------

async function runStrategy(
  env: Env,
  strategy: StrategyId,
  seedMap: Map<string, string>,
): Promise<StrategyReport> {
  const perQuery: PerQueryResult[] = [];
  const latencies: number[] = [];

  for (const q of GROUND_TRUTH.queries) {
    const start = Date.now();
    const { rankedSlugs, clarified } = await evaluateStrategy(env, strategy, q, seedMap);
    latencies.push(Date.now() - start);
    perQuery.push(scoreQuery(q, rankedSlugs, clarified));
  }

  const agg = aggregateMetrics(
    perQuery.map((p) => ({
      recallAt3: p.recallAt3,
      recallAt5: p.recallAt5,
      reciprocalRank: p.reciprocalRank,
    })),
  );

  return {
    strategy,
    label: STRATEGY_LABELS[strategy],
    recallAt3: agg.recallAt3,
    recallAt5: agg.recallAt5,
    mrr: agg.mrr,
    p50LatencyMs: percentile50(latencies),
    perQuery,
  };
}

async function evaluateStrategy(
  env: Env,
  strategy: StrategyId,
  query: GroundTruthQuery,
  seedMap: Map<string, string>,
): Promise<{ rankedSlugs: string[]; clarified: boolean }> {
  let candidates: Candidate[] = [];
  let clarified = false;

  switch (strategy) {
    case 'A': {
      const r = await retrieve(env, [query.query], VECTOR_ONLY_WEIGHTS);
      candidates = mergeCandidates(r.lists).slice(0, RETRIEVAL.resultCount);
      break;
    }
    case 'B': {
      const r = await retrieve(env, [query.query], DEFAULT_WEIGHTS);
      candidates = mergeCandidates(r.lists).slice(0, RETRIEVAL.resultCount);
      break;
    }
    case 'C': {
      const r = await retrieve(env, [query.query], DEFAULT_WEIGHTS);
      candidates = (await rerank(env, query.query, mergeCandidates(r.lists))).results;
      break;
    }
    case 'D': {
      const agent = await routeQuery(env, query.query);
      if (agent.decision.kind === 'clarification') {
        clarified = true;
      } else {
        // Same retrieve → per-sub-query rerank + interleave path as the live
        // search, so the C→D delta measures the agent's real contribution.
        const r = await retrieve(env, agent.decision.queries, DEFAULT_WEIGHTS);
        candidates = (await rerankResolved(env, query.query, agent.decision.queries, r.lists))
          .results;
      }
      break;
    }
  }

  return { rankedSlugs: candidates.map((c) => seedMap.get(c.id) ?? c.id), clarified };
}

function scoreQuery(
  query: GroundTruthQuery,
  rankedSlugs: string[],
  clarified: boolean,
): PerQueryResult {
  // Ambiguous queries: a clarification is the correct behavior (only D can do it).
  if (query.expectClarification && clarified) {
    return {
      queryId: query.id,
      queryText: query.query,
      category: query.category,
      recallAt3: 1,
      recallAt5: 1,
      reciprocalRank: 1,
      clarified: true,
    };
  }
  const m = queryMetrics(rankedSlugs, query.expectedImageIds);
  return {
    queryId: query.id,
    queryText: query.query,
    category: query.category,
    recallAt3: m.recallAt3,
    recallAt5: m.recallAt5,
    reciprocalRank: m.reciprocalRank,
    clarified,
  };
}

async function loadSeedMap(env: Env): Promise<Map<string, string>> {
  const supabase = createSupabase(env);
  const { data, error } = (await supabase
    .from('images')
    .select('id, storage_path')
    .like('storage_path', `${SEED_STORAGE_PREFIX}/%`)) as DbResult<
    { id: string; storage_path: string }[]
  >;
  if (error) throw new UpstreamError(`seed map load failed: ${error.message}`);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const slug = row.storage_path
      .replace(new RegExp(`^${SEED_STORAGE_PREFIX}/`), '')
      .replace(/\.[^.]+$/, '');
    map.set(row.id, slug);
  }
  return map;
}

function percentile50(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** All strategy ids, for the default "run everything" request. */
export const ALL_STRATEGIES: StrategyId[] = [...STRATEGY_IDS];
