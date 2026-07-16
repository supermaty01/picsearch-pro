import { SEED_STORAGE_PREFIX, USER_UPLOAD_TTL_HOURS } from '@picsearch/shared';

import { type Env } from '../env.js';
import { UpstreamError } from '../lib/problem.js';
import { createSupabase, type DbResult, STORAGE_BUCKET } from '../lib/supabase.js';

/**
 * Retention sweep for public uploads: anything not under `seed/` older than
 * `USER_UPLOAD_TTL_HOURS` is removed — storage object first, then the row
 * (which carries the embedding). Runs from the Worker cron trigger; the seed
 * corpus is permanent.
 */
export async function purgeExpiredUploads(env: Env): Promise<number> {
  const supabase = createSupabase(env);
  const cutoff = new Date(Date.now() - USER_UPLOAD_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = (await supabase
    .from('images')
    .select('id, storage_path')
    .lt('created_at', cutoff)
    .not('storage_path', 'like', `${SEED_STORAGE_PREFIX}/%`)) as DbResult<
    { id: string; storage_path: string }[]
  >;
  if (error) {
    throw new UpstreamError(`Expired-upload lookup failed: ${error.message}`);
  }

  const expired = data ?? [];
  if (expired.length === 0) return 0;

  // Storage first: if this fails we keep the rows and retry next run, instead
  // of stranding orphaned objects that no row points to anymore.
  const removal = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(expired.map((row) => row.storage_path));
  if (removal.error) {
    throw new UpstreamError(`Expired-object removal failed: ${removal.error.message}`);
  }

  const deletion = (await supabase
    .from('images')
    .delete()
    .in(
      'id',
      expired.map((row) => row.id),
    )) as DbResult<null>;
  if (deletion.error) {
    throw new UpstreamError(`Expired-row deletion failed: ${deletion.error.message}`);
  }

  return expired.length;
}
