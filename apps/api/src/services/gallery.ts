import { imageMetadataSchema, type ImageListResponse } from '@picsearch/shared';

import { type Env } from '../env.js';
import { UpstreamError } from '../lib/problem.js';
import { createSupabase } from '../lib/supabase.js';

/**
 * Gallery listing (GET /images). Newest first, keyset pagination on `created_at`
 * (the cursor is the last row's timestamp). No offset — stable under inserts.
 */
export async function listImages(
  env: Env,
  limit: number,
  cursor: string | null,
): Promise<ImageListResponse> {
  const supabase = createSupabase(env);
  let query = supabase
    .from('images')
    .select('id, image_url, dense_context, structured_metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit + 1); // fetch one extra to compute nextCursor

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = (await query) as {
    data:
      | {
          id: string;
          image_url: string;
          dense_context: string;
          structured_metadata: unknown;
          created_at: string;
        }[]
      | null;
    error: { message: string } | null;
  };
  if (error) {
    throw new UpstreamError(`Gallery listing failed: ${error.message}`);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  return {
    items: page.map((r) => ({
      id: r.id,
      imageUrl: r.image_url,
      denseContext: r.dense_context,
      metadata: imageMetadataSchema.parse(r.structured_metadata),
      createdAt: r.created_at,
    })),
    nextCursor: hasMore && last ? last.created_at : null,
  };
}
