import {
  isAllowedMimeType,
  MIME_EXTENSION,
  SEED_STORAGE_PREFIX,
  UPLOAD_LIMITS,
} from '@picsearch/shared';
import { Hono } from 'hono';

import { type AppBindings } from '../types.js';
import {
  BadRequestError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from '../lib/problem.js';
import { rateLimit } from '../lib/rate-limit.js';
import { listImages } from '../services/gallery.js';
import { ingestImage } from '../services/ingest.js';

/**
 * Image routes (FR-1..FR-5, docs/04). Upload validation is server-side and
 * authoritative (NFR-5): client-side checks are never trusted.
 */
export const images = new Hono<AppBindings>();

function isUploadedFile(value: unknown): value is File {
  return typeof value === 'object' && value !== null && value instanceof File;
}

/**
 * Deterministic `seed/<slug>.<ext>` path for idempotent re-seeding (FR-15),
 * honored ONLY when a valid `x-seed-key` header is presented. Public uploads
 * never control their storage path (they get a random uuid name).
 */
function seedPath(
  env: AppBindings['Bindings'],
  slug: unknown,
  seedKey: string | undefined,
  mimeType: string,
): string | undefined {
  if (typeof slug !== 'string' || slug.length === 0) return undefined;
  if (env.SEED_KEY === undefined || seedKey !== env.SEED_KEY) return undefined;
  const safe = slug.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  if (safe.length === 0) return undefined;
  const ext = MIME_EXTENSION[mimeType] ?? 'bin';
  return `${SEED_STORAGE_PREFIX}/${safe}.${ext}`;
}

images.post('/', rateLimit({ limit: 30, windowMs: 60_000 }), async (c) => {
  const form = await c.req.formData().catch(() => null);
  const entry: unknown = form?.get('file');
  if (!isUploadedFile(entry)) {
    throw new BadRequestError('Expected a multipart form with a "file" field.');
  }
  const file = entry;
  if (!isAllowedMimeType(file.type)) {
    throw new UnsupportedMediaTypeError(
      `Unsupported type "${file.type || 'unknown'}". Allowed: ${UPLOAD_LIMITS.allowedMimeTypes.join(', ')}.`,
    );
  }
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    throw new PayloadTooLargeError(
      `File is ${String(file.size)} bytes; the limit is ${String(UPLOAD_LIMITS.maxBytes)}.`,
    );
  }

  const bytes = await file.arrayBuffer();
  const result = await ingestImage(c.env, {
    bytes,
    mimeType: file.type,
    storagePath: seedPath(c.env, form?.get('slug'), c.req.header('x-seed-key'), file.type),
  });
  return c.json(result, 201);
});

images.get('/', async (c) => {
  const limitParam = Number(c.req.query('limit') ?? '24');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), 60) : 24;
  const cursor = c.req.query('cursor') ?? null;
  const result = await listImages(c.env, limit, cursor);
  return c.json(result);
});
