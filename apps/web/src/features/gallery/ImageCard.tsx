import { type ImageSummary } from '@picsearch/shared';
import { useState } from 'react';

import { ImageDetailModal } from '../../components/ImageDetailModal.js';
import { MetadataInspector } from './MetadataInspector.js';

/** A single gallery tile: image (alt from scene_description, NFR-10) + metadata. */
export function ImageCard({ image }: { image: ImageSummary }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="overflow-hidden border border-line-2 bg-surface">
      <button
        type="button"
        aria-label="View image and metadata in detail"
        onClick={() => {
          setExpanded(true);
        }}
        className="block w-full cursor-zoom-in"
      >
        <img
          src={image.imageUrl}
          alt={image.metadata.scene_description}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      </button>
      <div className="border-t border-line p-3">
        <p className="line-clamp-2 text-[13px] leading-snug text-fg-2">
          {image.metadata.scene_description}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {image.metadata.keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="border border-line-2 bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted"
            >
              {kw}
            </span>
          ))}
        </div>
        <MetadataInspector metadata={image.metadata} />
      </div>
      {expanded && (
        <ImageDetailModal
          imageUrl={image.imageUrl}
          metadata={image.metadata}
          onClose={() => {
            setExpanded(false);
          }}
        />
      )}
    </li>
  );
}
