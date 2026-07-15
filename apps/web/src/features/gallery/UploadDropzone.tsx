import { isAllowedMimeType, UPLOAD_LIMITS } from '@picsearch/shared';
import { useRef, useState } from 'react';

import { Spinner } from '../../components/Spinner.js';
import { ApiError } from '../../lib/api.js';
import { useUpload } from './useGallery.js';

/** Drag-and-drop / click upload with a client-side pre-check and stage timings (FR-1). */
export function UploadDropzone() {
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  function submit(file: File) {
    setClientError(null);
    if (!isAllowedMimeType(file.type)) {
      setClientError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > UPLOAD_LIMITS.maxBytes) {
      setClientError('Image exceeds the 10 MB limit.');
      return;
    }
    upload.mutate(file);
  }

  const serverError =
    upload.error instanceof ApiError
      ? upload.error.message
      : upload.error
        ? 'Upload failed.'
        : null;

  return (
    <div className="border border-line-2 bg-surface">
      <div className="border-b border-line px-4 py-2.5 font-mono text-[11px] text-dim">
        ingest.pipeline() · vision → dense_context → embedding → index
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) submit(file);
        }}
        className={`m-3 flex flex-col items-center justify-center gap-2 border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? 'border-accent bg-accent/5' : 'border-line-3'
        }`}
      >
        <p className="font-mono text-xs text-muted">Drag an image here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="border border-accent-dim bg-accent px-4 py-2 font-display text-sm font-bold text-[#05130c] hover:bg-accent-bright disabled:opacity-50"
        >
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_LIMITS.allowedMimeTypes.join(',')}
          className="sr-only"
          aria-label="Upload image"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) submit(file);
            e.target.value = '';
          }}
        />
        <p className="font-mono text-[10px] text-dim">JPEG · PNG · WebP · up to 10 MB</p>
      </div>

      <div aria-live="polite" className="min-h-6 px-4 pb-3 font-mono text-xs">
        {upload.isPending && <Spinner label="analyzing & indexing" />}
        {(clientError ?? serverError) && (
          <p className="text-route-fallback">{clientError ?? serverError}</p>
        )}
        {upload.isSuccess && (
          <p className="text-pos">
            indexed in {upload.data.timings.totalMs}ms (vision {upload.data.timings.visionMs}ms ·
            embedding {upload.data.timings.embeddingMs}ms)
          </p>
        )}
      </div>
    </div>
  );
}
