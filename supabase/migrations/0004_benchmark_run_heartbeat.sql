-- PicSearch Pro — benchmark run heartbeat (fixes stuck 'running' rows).
-- A run executes in a Worker `waitUntil` task whose survival is not guaranteed
-- (isolate eviction, waitUntil budget). A run that dies mid-way used to stay
-- 'running' forever, permanently blocking new runs via MAX_CONCURRENT_RUNS.
-- `updated_at` is a heartbeat bumped as the run progresses; a 'running' row with
-- a stale heartbeat is treated as abandoned (services/benchmark.ts).

alter table benchmark_runs
    add column updated_at timestamptz not null default timezone('utc', now());

create index idx_benchmark_runs_updated_at on benchmark_runs (updated_at desc);
