import { type ImageMetadata } from '@picsearch/shared';
import { useId, useState } from 'react';

/** Collapsible JSON inspector for an image's AI metadata (FR-12). */
export function MetadataInspector({ metadata }: { metadata: ImageMetadata }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-2 text-xs">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="font-medium text-brand-700 hover:underline"
      >
        {open ? 'Hide' : 'Show'} AI metadata
      </button>
      {open && (
        <pre
          id={panelId}
          className="mt-1 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100"
        >
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
