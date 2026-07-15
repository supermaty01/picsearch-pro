import { type HealthResponse } from '@picsearch/shared';

import { type Env } from '../env.js';
import { createSupabase, STORAGE_BUCKET } from '../lib/supabase.js';

/**
 * Dependency health checks (docs/04 GET /health). DB and Storage are probed
 * cheaply; the AI binding is only checked for presence (a real inference call
 * would cost budget on every liveness probe).
 */
export async function checkHealth(env: Env): Promise<HealthResponse> {
  const [db, storage] = await Promise.all([checkDb(env), checkStorage(env)]);
  const ai = typeof (env.AI as { run?: unknown } | undefined)?.run === 'function';
  const allOk = db && storage && ai;
  return {
    status: allOk ? 'ok' : 'degraded',
    service: 'picsearch-api',
    version: '0.1.0',
    checks: { db, storage, ai },
  };
}

async function checkDb(env: Env): Promise<boolean> {
  try {
    const supabase = createSupabase(env);
    const { error } = await supabase.from('images').select('id', { head: true, count: 'exact' });
    return !error;
  } catch {
    return false;
  }
}

async function checkStorage(env: Env): Promise<boolean> {
  try {
    const supabase = createSupabase(env);
    const { error } = await supabase.storage.getBucket(STORAGE_BUCKET);
    return !error;
  } catch {
    return false;
  }
}
