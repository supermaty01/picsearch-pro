/**
 * Upload constraints (FR-1, NFR-5). Enforced server-side in the Worker — the
 * web UI reuses these only for a friendly pre-check, never as the real gate.
 * Kept in sync with the bucket limits in supabase/migrations/0002_storage.sql.
 */
export const UPLOAD_LIMITS = {
  /** Maximum accepted file size in bytes (10 MB). */
  maxBytes: 10 * 1024 * 1024,
  /** Allowed MIME types (JPEG/PNG/WebP). */
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/** File extension used for the storage object name, per accepted MIME type. */
export const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isAllowedMimeType(mime: string): boolean {
  return (UPLOAD_LIMITS.allowedMimeTypes as readonly string[]).includes(mime);
}
