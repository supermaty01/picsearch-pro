import { type ImageMetadata } from '@picsearch/shared';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { MetadataJson } from './MetadataJson.js';

interface ImageDetailModalProps {
  imageUrl: string;
  metadata: ImageMetadata;
  onClose: () => void;
}

/**
 * Full-size image viewer: the image on the left, its structured_metadata on
 * the right, both at a readable size (opened from Search Studio and Gallery
 * cards). Closes on Escape, backdrop click, or the close button.
 */
export function ImageDetailModal({ imageUrl, metadata, onClose }: ImageDetailModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image detail"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-sm md:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden border border-line-3 bg-surface"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="font-mono text-[11px] text-dim">image.inspect()</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="border border-line-2 bg-elevated px-2.5 py-1 font-mono text-xs text-body transition hover:border-accent-dim hover:text-fg-2"
          >
            Close ✕
          </button>
        </div>
        <div className="grid min-h-0 flex-1 md:grid-cols-[3fr_2fr]">
          <div className="flex min-h-0 items-center justify-center bg-surface-2 p-3">
            <img
              src={imageUrl}
              alt={metadata.scene_description}
              className="max-h-[40vh] max-w-full object-contain md:max-h-[75vh]"
            />
          </div>
          <div className="min-h-0 overflow-auto border-t border-line p-4 md:border-l md:border-t-0">
            <div className="mb-3 font-mono text-xs text-accent">▾ structured_metadata</div>
            <div className="font-mono text-xs leading-relaxed">
              <MetadataJson metadata={metadata} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
