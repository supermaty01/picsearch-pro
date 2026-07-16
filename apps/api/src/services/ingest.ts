import {
  buildDenseContext,
  type IngestResponse,
  MIME_EXTENSION,
  type ImageMetadata,
} from '@picsearch/shared';

import { type Env } from '../env.js';
import { UpstreamError } from '../lib/problem.js';
import { createSupabase, type DbResult, STORAGE_BUCKET } from '../lib/supabase.js';
import { embed } from './embedding.js';
import { extractMetadata } from './vision.js';

/**
 * Ingestion pipeline (FR-1..FR-5): store object → vision extract → normalize to
 * dense_context → embed → single idempotent row upsert. Idempotency is keyed on
 * `storage_path` (FR-5): re-ingesting the same path UPDATEs instead of
 * duplicating — the seed script relies on this to be re-runnable.
 */

export interface IngestInput {
  bytes: ArrayBuffer;
  mimeType: string;
  /**
   * Deterministic object path for idempotent re-ingestion (seed). When omitted,
   * a random `<uuid>.<ext>` name is generated for a fresh user upload.
   */
  storagePath?: string;
}

export async function ingestImage(env: Env, input: IngestInput): Promise<IngestResponse> {
  const start = Date.now();
  const supabase = createSupabase(env);
  const ext = MIME_EXTENSION[input.mimeType] ?? 'bin';
  const objectPath = input.storagePath ?? `${crypto.randomUUID()}.${ext}`;

  // 1. Store the object (upsert so re-ingestion overwrites the same path).
  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, input.bytes, { contentType: input.mimeType, upsert: true });
  if (upload.error) {
    throw new UpstreamError(`Storage upload failed: ${upload.error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);

  // 2. Vision extraction (untrusted → validated, FR-2) + 3. normalize (FR-3).
  const { metadata, ms: visionMs } = await extractMetadata(env, input.bytes, input.mimeType);
  const denseContext = buildDenseContext(metadata);

  // 4. Embed dense_context (FR-4).
  const embedStart = Date.now();
  const embedding = await embed(env, denseContext);
  const embeddingMs = Date.now() - embedStart;

  // 5. Idempotent upsert of the single row (FR-5).
  const id = await upsertImageRow(supabase, {
    storagePath: objectPath,
    imageUrl: publicUrl,
    metadata,
    denseContext,
    embedding,
  });

  return {
    id,
    imageUrl: publicUrl,
    metadata,
    denseContext,
    timings: { visionMs, embeddingMs, totalMs: Date.now() - start },
  };
}

interface ImageRow {
  storagePath: string;
  imageUrl: string;
  metadata: ImageMetadata;
  denseContext: string;
  embedding: number[];
}

async function upsertImageRow(
  supabase: ReturnType<typeof createSupabase>,
  row: ImageRow,
): Promise<string> {
  const { data, error } = (await supabase
    .from('images')
    .upsert(
      {
        storage_path: row.storagePath,
        image_url: row.imageUrl,
        structured_metadata: row.metadata,
        dense_context: row.denseContext,
        // pgvector accepts its text representation `[a,b,c]` (JSON array form).
        embedding: JSON.stringify(row.embedding),
      },
      { onConflict: 'storage_path' },
    )
    .select('id')
    .single()) as DbResult<{ id: string }>;

  if (error || !data) {
    throw new UpstreamError(`Row upsert failed: ${error?.message ?? 'no row returned'}`);
  }
  return data.id;
}
