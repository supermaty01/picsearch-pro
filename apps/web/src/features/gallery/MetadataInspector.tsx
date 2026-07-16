import { type ImageMetadata } from '@picsearch/shared';
import { useId, useState } from 'react';

import { MetadataJson } from '../../components/MetadataJson.js';

/** Collapsible JSON inspector for an image's AI metadata (FR-12), console style. */
export function MetadataInspector({ metadata }: { metadata: ImageMetadata }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-2 font-mono text-[11px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="text-accent hover:text-accent-bright"
      >
        {open ? '▾' : '▸'} structured_metadata
      </button>
      {open && (
        <div
          id={panelId}
          className="mt-1 max-h-72 overflow-auto border border-line-2 bg-surface-2 p-3 leading-relaxed"
        >
          <MetadataJson metadata={metadata} />
        </div>
      )}
    </div>
  );
}
