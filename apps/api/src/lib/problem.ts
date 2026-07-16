import { type ProblemDetails } from '@picsearch/shared';
import { type Context } from 'hono';

/**
 * Typed error classes + RFC 9457 problem+json rendering (AGENTS §5).
 * Services throw these; the Hono `onError` hook renders them. Errors are never
 * swallowed silently — an unknown throw becomes a 500 problem document.
 */

const PROBLEM_BASE = 'https://picsearch.pro/problems';

export abstract class AppError extends Error {
  abstract readonly status: number;
  /** Stable slug the UI can switch on (becomes the problem `type` URI suffix). */
  abstract readonly slug: string;
  abstract readonly title: string;

  toProblem(requestId: string): ProblemDetails {
    return {
      type: `${PROBLEM_BASE}/${this.slug}`,
      title: this.title,
      status: this.status,
      detail: this.message,
      requestId,
    };
  }
}

/** 400 — malformed request the client can fix (bad JSON, missing field). */
export class BadRequestError extends AppError {
  readonly status = 400;
  readonly slug = 'bad-request';
  readonly title = 'Bad request';
}

/** 413 — upload exceeds the size cap (FR-1). */
export class PayloadTooLargeError extends AppError {
  readonly status = 413;
  readonly slug = 'payload-too-large';
  readonly title = 'Payload too large';
}

/** 415 — upload MIME not in the allow-list (FR-1, NFR-5). */
export class UnsupportedMediaTypeError extends AppError {
  readonly status = 415;
  readonly slug = 'unsupported-media-type';
  readonly title = 'Unsupported media type';
}

/** 422 — LLM output failed validation after the one sanctioned retry (FR-2, NFR-4). */
export class VisionValidationError extends AppError {
  readonly status = 422;
  readonly slug = 'vision-validation-failed';
  readonly title = 'Vision output failed validation';
}

/** 422 — the moderation check flagged the upload as adult/graphic content. */
export class UnsafeContentError extends AppError {
  readonly status = 422;
  readonly slug = 'unsafe-content';
  readonly title = 'Content not allowed';
}

/** 429 — per-IP rate limit exceeded (docs/04 §Rate limits). */
export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly slug = 'rate-limited';
  readonly title = 'Too many requests';
}

/** 502 — an upstream dependency (Supabase, Workers AI) failed unexpectedly. */
export class UpstreamError extends AppError {
  readonly status = 502;
  readonly slug = 'upstream-error';
  readonly title = 'Upstream dependency failed';
}

/** 404 — resource not found. */
export class NotFoundError extends AppError {
  readonly status = 404;
  readonly slug = 'not-found';
  readonly title = 'Not found';
}

/** Render any error as an RFC 9457 problem+json response. */
export function renderProblem(c: Context, err: unknown, requestId: string): Response {
  const problem: ProblemDetails =
    err instanceof AppError
      ? err.toProblem(requestId)
      : {
          type: `${PROBLEM_BASE}/internal-error`,
          title: 'Internal server error',
          status: 500,
          detail: 'An unexpected error occurred.',
          requestId,
        };

  if (!(err instanceof AppError)) {
    // Unexpected: log with context, but never leak internals to the client.
    console.error(`[${requestId}] unhandled error`, err);
  }

  c.header('content-type', 'application/problem+json');
  c.status(problem.status as never);
  return c.body(JSON.stringify(problem));
}
