-- PicSearch Pro — initial schema (docs/03-data-model.md is the companion doc).
-- Applied via Supabase CLI (`supabase db push`) or the SQL editor.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- images: one row per ingested image (FR-1..FR-5)
-- NOTE: vector(384) must stay in sync with EMBEDDING_DIM in
--       packages/shared/src/models.ts (bge-small-en-v1.5).
-- ---------------------------------------------------------------------------
create table images (
    id                  uuid primary key default gen_random_uuid(),
    storage_path        text not null unique, -- idempotency key (FR-5)
    image_url           text not null,
    structured_metadata jsonb not null,
    dense_context       text not null,
    embedding           vector(384) not null,
    fts_tokens          tsvector generated always as (
        to_tsvector(
            'english',
            dense_context || ' ' ||
            coalesce(jsonb_path_query_array(structured_metadata, '$.keywords[*]')::text, '')
        )
    ) stored,
    created_at          timestamptz not null default timezone('utc', now())
);

create index idx_images_embedding on images using hnsw (embedding vector_cosine_ops);
create index idx_images_fts on images using gin (fts_tokens);

-- ---------------------------------------------------------------------------
-- query_telemetry: one row per search (FR-11)
-- ---------------------------------------------------------------------------
create table query_telemetry (
    id                uuid primary key default gen_random_uuid(),
    query_text        text not null,
    agent_action      text not null check (
        agent_action in ('direct', 'reformulate', 'decompose', 'ask_context', 'agent_fallback')
    ),
    resolved_queries  jsonb not null default '[]'::jsonb,
    agent_decision_ms integer not null,
    embedding_ms      integer not null default 0,
    vector_search_ms  integer not null,
    rerank_ms         integer not null,
    execution_time_ms integer not null,
    tokens_used       integer,
    model_provider    text not null,
    rerank_skipped    boolean not null default false,
    created_at        timestamptz not null default timezone('utc', now())
);

create index idx_query_telemetry_created_at on query_telemetry (created_at desc);

-- ---------------------------------------------------------------------------
-- hybrid_search: weighted Reciprocal Rank Fusion over vector + FTS rankings
-- (FR-8, ADR-0003). Strategy A of the evaluation framework calls this with
-- keyword_weight => 0 — one code path for all benchmark strategies.
-- ---------------------------------------------------------------------------
create or replace function hybrid_search(
    query_embedding vector(384),
    query_text      text,
    match_threshold float default 0.20,
    match_count     int   default 15,
    vector_weight   float default 0.5,
    keyword_weight  float default 0.5,
    rrf_k           int   default 60
)
returns table (
    id                  uuid,
    image_url           text,
    structured_metadata jsonb,
    dense_context       text,
    combined_score      float
)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
begin
    return query
    with vector_results as (
        select
            i.id,
            row_number() over (order by i.embedding <=> query_embedding) as rank
        from images i
        where (1 - (i.embedding <=> query_embedding)) > match_threshold
        order by i.embedding <=> query_embedding
        limit greatest(match_count * 2, 30)
    ),
    keyword_results as (
        select
            i.id,
            row_number() over (
                order by ts_rank_cd(i.fts_tokens, websearch_to_tsquery('english', query_text)) desc
            ) as rank
        from images i
        where i.fts_tokens @@ websearch_to_tsquery('english', query_text)
        limit greatest(match_count * 2, 30)
    )
    select
        i.id,
        i.image_url,
        i.structured_metadata,
        i.dense_context,
        coalesce(vector_weight / (rrf_k + vr.rank), 0) +
        coalesce(keyword_weight / (rrf_k + kr.rank), 0) as combined_score
    from images i
    left join vector_results vr on i.id = vr.id
    left join keyword_results kr on i.id = kr.id
    where vr.id is not null or kr.id is not null
    order by combined_score desc
    limit match_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (NFR-5): no anon access; the Worker's service role
-- bypasses RLS. The browser never talks to these tables directly.
-- ---------------------------------------------------------------------------
alter table images enable row level security;
alter table query_telemetry enable row level security;
