/** TanStack Query cache keys — single registry so invalidations cannot drift. */
export const QUERY_KEYS = {
  health: ['health'],
  images: ['images'],
  telemetry: ['telemetry'],
  benchmark: (runId: string | null) => ['benchmark', runId],
} as const;
