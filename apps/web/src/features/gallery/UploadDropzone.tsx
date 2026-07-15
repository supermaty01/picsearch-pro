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
    <div>
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
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'
        }`}
      >
        <p className="text-sm text-slate-600">Drag an image here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
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
        <p className="text-xs text-slate-400">JPEG · PNG · WebP · up to 10 MB</p>
      </div>

      <div aria-live="polite" className="mt-2 min-h-6 text-sm">
        {upload.isPending && <Spinner label="Analyzing & indexing" />}
        {(clientError ?? serverError) && (
          <p className="text-rose-600">{clientError ?? serverError}</p>
        )}
        {upload.isSuccess && (
          <p className="text-emerald-600">
            Indexed in {upload.data.timings.totalMs} ms (vision {upload.data.timings.visionMs} ms,
            embedding {upload.data.timings.embeddingMs} ms).
          </p>
        )}
      </div>
    </div>
  );
}
