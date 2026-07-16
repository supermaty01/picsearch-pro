import {
  type BenchmarkStartResponse,
  benchmarkStartResponseSchema,
  type BenchmarkStatusResponse,
  benchmarkStatusResponseSchema,
  type HealthResponse,
  healthResponseSchema,
  type ImageListResponse,
  imageListResponseSchema,
  type IngestResponse,
  ingestResponseSchema,
  problemDetailsSchema,
  type SearchResponse,
  searchResponseSchema,
  type StrategyId,
  type TelemetryListResponse,
  telemetryListResponseSchema,
} from '@picsearch/shared';
import { type z } from 'zod';

/**
 * The ONLY fetch call site in the web app (docs/08). Every response is parsed
 * with the shared Zod schema, so the UI cannot drift from the API contract
 * (NFR-3). Errors are surfaced as `ApiError` carrying the RFC 9457 detail.
 */
const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly title: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const problem = problemDetailsSchema.safeParse(payload);
    if (problem.success) {
      throw new ApiError(problem.data.detail, problem.data.status, problem.data.title);
    }
    throw new ApiError(`Request failed (${String(res.status)})`, res.status, 'Request failed');
  }
  return schema.parse(payload);
}

export function getHealth(): Promise<HealthResponse> {
  return request('/health', healthResponseSchema);
}

export function listImages(cursor?: string | null): Promise<ImageListResponse> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request(`/images${qs}`, imageListResponseSchema);
}

export function uploadImage(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.set('file', file);
  return request('/images', ingestResponseSchema, { method: 'POST', body: form });
}

export function search(query: string): Promise<SearchResponse> {
  return request('/search', searchResponseSchema, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
}

export function listTelemetry(limit = 20): Promise<TelemetryListResponse> {
  return request(`/telemetry?limit=${String(limit)}`, telemetryListResponseSchema);
}

export function startBenchmark(strategies?: StrategyId[]): Promise<BenchmarkStartResponse> {
  return request('/benchmark', benchmarkStartResponseSchema, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(strategies ? { strategies } : {}),
  });
}

export function getBenchmark(runId: string): Promise<BenchmarkStatusResponse> {
  return request(`/benchmark/${runId}`, benchmarkStatusResponseSchema);
}
