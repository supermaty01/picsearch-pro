import { EMBEDDING_DIM, MODELS } from '@picsearch/shared';
import { z } from 'zod';

import { type Env } from '../env.js';
import { aiRun } from '../lib/ai.js';
import { UpstreamError } from '../lib/problem.js';

/**
 * Embedding generation (FR-4). Embeds `dense_context` (never raw JSON, FR-3)
 * into a 384-dim vector with bge-small-en-v1.5. The dimension is asserted
 * against `EMBEDDING_DIM` so a model swap that changes the width fails loudly
 * instead of silently corrupting the index (NFR-7).
 */

const embeddingResponseSchema = z.object({
  data: z.array(z.array(z.number())).min(1),
});

export async function embed(env: Env, text: string): Promise<number[]> {
  const raw = await aiRun(env, MODELS.embedding, { text });
  const parsed = embeddingResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new UpstreamError('Embedding model returned an unexpected response shape.');
  }
  const vector = parsed.data.data[0];
  if (vector?.length !== EMBEDDING_DIM) {
    throw new UpstreamError(
      `Embedding dimension mismatch: expected ${String(EMBEDDING_DIM)}, got ${String(vector?.length ?? 0)}.`,
    );
  }
  return vector;
}
