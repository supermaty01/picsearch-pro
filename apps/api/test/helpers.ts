import { type ImageMetadata, MODELS } from '@picsearch/shared';

import { type Env } from '../src/env.js';

/** A valid ImageMetadata fixture — the "happy path" vision output. */
export const validMetadata: ImageMetadata = {
  scene_description:
    'A golden beach at sunset with gentle waves rolling onto the sand. The sun sits low on the horizon, casting warm light across the water. A few silhouetted figures walk along the shoreline.',
  setting: 'a wide sandy beach on a coastline at sunset',
  objects: ['beach', 'ocean', 'sun', 'sand', 'waves', 'people'],
  actions: ['waves rolling', 'people walking'],
  mood: 'calm and warm',
  colors: ['orange', 'gold', 'blue'],
  weather: 'clear evening sky',
  time_of_day: 'golden hour',
  season: 'summer',
  location_type: 'coastal',
  notable_details: [],
  photographic_style: 'wide landscape smartphone photo',
  keywords: ['beach', 'sunset', 'ocean', 'summer', 'golden hour', 'coast'],
};

/** Minimal fake Env; `AI.run` is stubbed per test. */
export function makeEnv(aiRun: (model: string, input: unknown) => unknown): Env {
  return {
    AI: {
      run: (model: string, input: unknown) => Promise.resolve(aiRun(model, input)),
    } as unknown as Ai,
    ENVIRONMENT: 'development',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
    AI_GATEWAY_ID: 'test-gateway',
  };
}

/**
 * Default `AI.run` stub: returns valid vision JSON and a 384-dim embedding,
 * dispatching on the model id. Individual tests override as needed.
 */
export function defaultAiRun(model: string): unknown {
  if (model === MODELS.vision) return { response: JSON.stringify(validMetadata) };
  if (model === MODELS.embedding) return { data: [new Array(384).fill(0.01) as number[]] };
  if (model === MODELS.reranker) return { response: [{ id: 0, score: 0.9 }] };
  if (model === MODELS.agent) {
    return { tool_calls: [{ name: 'search_direct', arguments: {} }], usage: { total_tokens: 12 } };
  }
  throw new Error(`Unexpected model in defaultAiRun: ${model}`);
}

/** A hybrid_search RPC row (snake_case, as PostgREST returns it). */
export function candidateRow(id: string, denseContext: string, score: number): unknown {
  return {
    id,
    image_url: `https://cdn.test/${id}.jpg`,
    structured_metadata: validMetadata,
    dense_context: denseContext,
    combined_score: score,
  };
}

export interface FakeSupabaseConfig {
  uploadResult?: { error: { message: string } | null };
  upsertResult?: { data: { id: string } | null; error: { message: string } | null };
  selectResult?: { data: unknown[]; error: { message: string } | null };
  bucketResult?: { error: { message: string } | null };
  rpcResult?: { data: unknown[]; error: { message: string } | null };
  /** Result of `.maybeSingle()` (benchmark run lookup). */
  runRow?: { data: unknown; error: { message: string } | null };
}

/**
 * A fake Supabase client covering the fluent query-builder shape the services
 * use (upsert→select→single, and select→order→limit→lt thenable) plus storage.
 */
export function makeFakeSupabase(config: FakeSupabaseConfig = {}): unknown {
  const upsertResult = config.upsertResult ?? {
    data: { id: '11111111-1111-4111-8111-111111111111' },
    error: null,
  };
  const selectResult = config.selectResult ?? { data: [], error: null };

  const rpcResult = config.rpcResult ?? { data: [], error: null };

  const builder = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    lt: () => builder,
    eq: () => builder,
    like: () => builder,
    upsert: () => builder,
    insert: () => builder,
    update: () => builder,
    single: () => Promise.resolve(upsertResult),
    maybeSingle: () => Promise.resolve(config.runRow ?? { data: null, error: null }),
    then: (resolve: (v: unknown) => void) => {
      resolve(selectResult);
    },
  };

  return {
    from: () => builder,
    rpc: () => ({
      then: (resolve: (v: unknown) => void) => {
        resolve(rpcResult);
      },
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve(config.uploadResult ?? { error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/${path}` },
        }),
      }),
      getBucket: () => Promise.resolve(config.bucketResult ?? { error: null }),
    },
  };
}
