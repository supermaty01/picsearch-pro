-- PicSearch Pro — manual acceptance test for Phase 1 (docs/07-implementation-plan.md).
-- NOT a migration. Paste into the Supabase SQL editor after applying 0001/0002
-- to prove hybrid_search fuses vector + FTS sensibly, then ROLL BACK.
--
-- Run the whole file inside a transaction so the fixtures never persist:
--   begin;  <this file>  rollback;
-- (Wrapped below for you.)

begin;

-- ---------------------------------------------------------------------------
-- Fixtures: three rows with hand-made 384-dim embeddings. We only need the
-- first few dimensions to differ; the rest are 0. Embedding "A" is closest to
-- our probe vector, "B" is farther, "C" is orthogonal but matches keywords.
-- ---------------------------------------------------------------------------
with probe as (
    select ('[' || array_to_string(
        array(select case when g = 1 then 1.0 when g = 2 then 0.2 else 0.0 end
              from generate_series(1, 384) g), ',') || ']')::vector(384) as v
)
insert into images (storage_path, image_url, structured_metadata, dense_context, embedding)
select
    p.path, p.url, p.meta::jsonb, p.ctx,
    ('[' || array_to_string(
        array(select case when g = 1 then p.d1 when g = 2 then p.d2 else 0.0 end
              from generate_series(1, 384) g), ',') || ']')::vector(384)
from (values
    -- (path, url, metadata, dense_context, dim1, dim2)
    ('verify/a.jpg', 'https://example.test/a.jpg',
     '{"keywords":["beach","sunset"]}',
     'Scene: a golden beach sunset over the ocean. Keywords: beach, sunset.', 1.0, 0.2),
    ('verify/b.jpg', 'https://example.test/b.jpg',
     '{"keywords":["mountain"]}',
     'Scene: a snowy mountain peak at dawn. Keywords: mountain, snow.', 0.6, 0.1),
    -- NOTE: use a SMALL non-zero embedding for C. A zero vector makes pgvector's
    -- cosine distance (<=>) undefined (NaN), which drops the row from the vector
    -- ranking — real embeddings are never zero, so keep fixtures non-degenerate.
    ('verify/c.jpg', 'https://example.test/c.jpg',
     '{"keywords":["beach","surfing"]}',
     'Scene: surfers riding waves on a sandy beach. Keywords: beach, surfing.', 0.1, 0.05)
) as p(path, url, meta, ctx, d1, d2);

-- Build the same probe vector for the queries below.
create temporary table _probe on commit drop as
select ('[' || array_to_string(
    array(select case when g = 1 then 1.0 when g = 2 then 0.2 else 0.0 end
          from generate_series(1, 384) g), ',') || ']')::vector(384) as v;

-- Case 1 — vector only (strategy A): keyword_weight => 0. Expect A first (closest).
select 'vector-only' as case, id, dense_context, round(combined_score::numeric, 6) as score
from hybrid_search(
    (select v from _probe), 'anything',
    match_threshold => 0.0, vector_weight => 1.0, keyword_weight => 0.0
);

-- Case 2 — FTS only: vector_weight => 0, query 'surfing'. Expect C (only match).
select 'fts-only' as case, id, dense_context, round(combined_score::numeric, 6) as score
from hybrid_search(
    (select v from _probe), 'surfing',
    match_threshold => 0.0, vector_weight => 0.0, keyword_weight => 1.0
);

-- Case 3 — fused (strategy B): default weights, query 'beach'. Expect A and C
-- ranked above B (A wins on vector, both A and C match the keyword).
select 'fused' as case, id, dense_context, round(combined_score::numeric, 6) as score
from hybrid_search(
    (select v from _probe), 'beach',
    match_threshold => 0.0
);

-- RLS check: with RLS on and no policies, anon SELECTs return 0 rows (silently
-- filtered — NOT a "permission denied" error), even when rows exist (NFR-5).
-- `set local role` only applies inside a transaction, so keep it in one block:
--   begin;
--     set local role anon; select count(*) from images;  -- expect: 0
--   rollback;
-- Confirm RLS is enabled: select relrowsecurity from pg_class where relname='images';

rollback;
