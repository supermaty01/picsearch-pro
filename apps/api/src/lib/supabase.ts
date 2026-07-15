import { createClient } from '@supabase/supabase-js';

import { type Env } from '../env.js';

/**
 * Service-role Supabase client (NFR-5). This key bypasses RLS and lives ONLY in
 * Worker secrets — never in the browser bundle. The web app talks to the Worker,
 * never to Supabase directly (AGENTS §4).
 *
 * A fresh client per request keeps Worker isolates stateless; the client is a
 * thin fetch wrapper, so construction is cheap.
 */
export function createSupabase(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Bucket that stores uploaded images (see supabase/migrations/0002_storage.sql). */
export const STORAGE_BUCKET = 'images';
