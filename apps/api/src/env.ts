import { z } from 'zod';

/**
 * Worker environment bindings. Secrets are set via `wrangler secret put`
 * (production) or `.dev.vars` (local); see .dev.vars.example.
 */
export interface Env {
  AI: Ai;
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AI_GATEWAY_ID: string;
}

/**
 * Runtime validation of non-binding env vars (NFR-4): fail fast and loud on
 * misconfiguration instead of failing deep inside a pipeline.
 */
export const envSchema = z.object({
  ENVIRONMENT: z.enum(['development', 'production']),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AI_GATEWAY_ID: z.string().min(1),
});
