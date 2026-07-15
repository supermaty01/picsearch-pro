-- PicSearch Pro — benchmark run persistence (FR-13, FR-14, docs/06 §4).
-- Runs execute async (Worker `waitUntil`); status/report live here so polling
-- survives Worker isolate boundaries and the dashboard can show run history.

create table benchmark_runs (
    id           uuid primary key default gen_random_uuid(),
    status       text not null default 'running'
                 check (status in ('running', 'done', 'error')),
    strategies   jsonb not null default '[]'::jsonb, -- requested strategy ids
    progress     real not null default 0,            -- 0..1
    report       jsonb,                              -- BenchmarkReport when done
    detail       text,                               -- error detail when status='error'
    created_at   timestamptz not null default timezone('utc', now())
);

create index idx_benchmark_runs_status on benchmark_runs (status);
create index idx_benchmark_runs_created_at on benchmark_runs (created_at desc);

-- RLS on; service-role Worker only (NFR-5).
alter table benchmark_runs enable row level security;
