import { type ImageMetadata } from './image-metadata.js';

/**
 * Normalizes structured vision metadata into a single high-density semantic
 * paragraph optimized for embedding models (FR-3).
 *
 * Raw JSON confuses bi-encoders; a flowing paragraph with labeled segments
 * embeds far better. This is the ONLY text that gets embedded and the text
 * the cross-encoder reranks against — keep it deterministic and pure.
 */
export function buildDenseContext(metadata: ImageMetadata): string {
  const parts = [
    `Scene: ${metadata.scene_description}`,
    `Visible objects: ${metadata.objects.join(', ')}`,
    metadata.actions.length > 0 ? `Activities: ${metadata.actions.join(', ')}` : null,
    `Mood: ${metadata.mood}`,
    `Weather: ${metadata.weather}`,
    `Location: ${metadata.location_type}`,
    `Keywords: ${metadata.keywords.join(', ')}`,
  ];
  return parts.filter((p): p is string => p !== null).join('. ') + '.';
}
