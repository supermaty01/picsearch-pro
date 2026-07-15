import { type ImageMetadata } from '@picsearch/shared';
import { useId, useState } from 'react';

/** Collapsible JSON inspector for an image's AI metadata (FR-12), console style. */
export function MetadataInspector({ metadata }: { metadata: ImageMetadata }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const entries = Object.entries(metadata);

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
          <span className="text-faint">{'{'}</span>
          {entries.map(([key, value]) => (
            <div key={key} className="pl-4">
              <span className="text-pos">&quot;{key}&quot;</span>
              <span className="text-faint">: </span>
              {Array.isArray(value) ? (
                <span className="text-route-reformulate">
                  [{value.map((v) => `"${v}"`).join(', ')}]
                </span>
              ) : (
                <span className="text-accent-bright">&quot;{value}&quot;</span>
              )}
              <span className="text-faint">,</span>
            </div>
          ))}
          <span className="text-faint">{'}'}</span>
        </div>
      )}
    </div>
  );
}
