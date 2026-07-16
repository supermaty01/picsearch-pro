import { type ImageMetadata } from '@picsearch/shared';

/**
 * Console-style JSON rendering of an image's AI metadata (FR-12). Shared by the
 * collapsible inspector on cards and the image detail modal.
 */
export function MetadataJson({ metadata }: { metadata: ImageMetadata }) {
  const entries = Object.entries(metadata);
  return (
    <>
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
    </>
  );
}
