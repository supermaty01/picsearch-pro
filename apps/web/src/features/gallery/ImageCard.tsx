import { type ImageSummary } from '@picsearch/shared';

import { MetadataInspector } from './MetadataInspector.js';

/** A single gallery tile: image (alt from scene_description, NFR-10) + metadata. */
export function ImageCard({ image }: { image: ImageSummary }) {
  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <img
        src={image.imageUrl}
        alt={image.metadata.scene_description}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
      <div className="p-3">
        <p className="line-clamp-2 text-sm text-slate-700">{image.metadata.scene_description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {image.metadata.keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
            >
              {kw}
            </span>
          ))}
        </div>
        <MetadataInspector metadata={image.metadata} />
      </div>
    </li>
  );
}
