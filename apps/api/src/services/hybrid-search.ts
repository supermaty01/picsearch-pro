import {
  DEFAULT_WEIGHTS,
  imageMetadataSchema,
  type ImageMetadata,
  RETRIEVAL,
  type SearchWeights,
} from '@picsearch/shared';

import { type Env } from '../env.js';
import { UpstreamError } from '../lib/problem.js';
import { createSupabase, type DbResult } from '../lib/supabase.js';

/** A retrieval candidate (pre- or post-rerank). `score` is RRF or rerank score. */
export interface Candidate {
  id: string;
  imageUrl: string;
  denseContext: string;
  metadata: ImageMetadata;
  score: number;
}

export interface HybridSearchParams {
  embedding: number[];
  queryText: string;
  weights?: SearchWeights;
}

/** One row returned by the `hybrid_search` SQL function (snake_case, PostgREST). */
interface HybridSearchRow {
  id: string;
  image_url: string;
  structured_metadata: unknown;
  dense_context: string;
  combined_score: number;
}

export async function hybridSearch(env: Env, params: HybridSearchParams): Promise<Candidate[]> {
  const supabase = createSupabase(env);
  const weights = params.weights ?? DEFAULT_WEIGHTS;

  const { data, error } = (await supabase.rpc('hybrid_search', {
    query_embedding: JSON.stringify(params.embedding), // pgvector text form
    query_text: params.queryText,
    match_count: RETRIEVAL.candidateCount,
    vector_weight: weights.vectorWeight,
    keyword_weight: weights.keywordWeight,
    rrf_k: RETRIEVAL.rrfK,
  })) as DbResult<HybridSearchRow[]>;

  if (error) {
    throw new UpstreamError(`hybrid_search failed: ${error.message}`);
  }

  const rows = data ?? [];
  return rows.map((r) => ({
    id: r.id,
    imageUrl: r.image_url,
    denseContext: r.dense_context,
    metadata: imageMetadataSchema.parse(r.structured_metadata),
    score: r.combined_score,
  }));
}
