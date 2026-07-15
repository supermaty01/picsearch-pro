import { imageMetadataSchema, type ImageMetadata, RETRIEVAL } from '@picsearch/shared';

import { type Env } from '../env.js';
import { UpstreamError } from '../lib/problem.js';
import { createSupabase } from '../lib/supabase.js';

/** A retrieval candidate (pre- or post-rerank). `score` is RRF or rerank score. */
export interface Candidate {
  id: string;
  imageUrl: string;
  denseContext: string;
  metadata: ImageMetadata;
  score: number;
}

/** Weights select the benchmark strategy over ONE SQL code path (ADR-0003). */
export interface SearchWeights {
  vectorWeight: number;
  keywordWeight: number;
}

export const DEFAULT_WEIGHTS: SearchWeights = { vectorWeight: 0.5, keywordWeight: 0.5 };
/** Strategy A (vector only): keyword_weight => 0. */
export const VECTOR_ONLY_WEIGHTS: SearchWeights = { vectorWeight: 1, keywordWeight: 0 };

export async function hybridSearch(
  env: Env,
  params: { embedding: number[]; queryText: string; weights?: SearchWeights },
): Promise<Candidate[]> {
  const supabase = createSupabase(env);
  const weights = params.weights ?? DEFAULT_WEIGHTS;

  const { data, error } = (await supabase.rpc('hybrid_search', {
    query_embedding: JSON.stringify(params.embedding), // pgvector text form
    query_text: params.queryText,
    match_count: RETRIEVAL.candidateCount,
    vector_weight: weights.vectorWeight,
    keyword_weight: weights.keywordWeight,
    rrf_k: RETRIEVAL.rrfK,
  })) as {
    data:
      | {
          id: string;
          image_url: string;
          structured_metadata: unknown;
          dense_context: string;
          combined_score: number;
        }[]
      | null;
    error: { message: string } | null;
  };

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
