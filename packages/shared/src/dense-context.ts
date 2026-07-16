import { type ImageMetadata } from './image-metadata.js';

/**
 * Normalizes structured vision metadata into a single high-density semantic
 * paragraph optimized for embedding models (FR-3).
 *
 * Raw JSON confuses bi-encoders; a flowing paragraph with labeled segments
 * embeds far better. This is the ONLY text that gets embedded and the text
 * the cross-encoder reranks against — so it folds in every field the model
 * captured (scene, setting, objects, notable details, time, season, keywords)
 * to maximize what a free-text query can match. Keep it deterministic and pure.
 */
/**
 * Compact document the cross-encoder scores against a query (FR-9). Unlike the
 * embedded dense_context — whose most discriminative fields (photographic
 * style, keywords) sit at the END and would be lost to any length cap — this
 * keeps only what queries actually reference and front-loads it: scene, style,
 * setting, objects, keywords. Colors/weather/season are dropped: they add
 * length (= quadratic rerank cost) but rarely decide relevance.
 */
export function buildRerankContext(metadata: ImageMetadata): string {
  return [
    metadata.scene_description,
    `Style: ${metadata.photographic_style}`,
    `Setting: ${metadata.setting}`,
    `Objects: ${metadata.objects.join(', ')}`,
    `Keywords: ${metadata.keywords.join(', ')}`,
  ].join('. ');
}

export function buildDenseContext(metadata: ImageMetadata): string {
  const parts = [
    `Scene: ${metadata.scene_description}`,
    `Setting: ${metadata.setting}`,
    `Visible objects: ${metadata.objects.join(', ')}`,
    metadata.actions.length > 0 ? `Activities: ${metadata.actions.join(', ')}` : null,
    `Mood: ${metadata.mood}`,
    `Colors: ${metadata.colors.join(', ')}`,
    `Weather: ${metadata.weather}`,
    `Time of day: ${metadata.time_of_day}`,
    `Season: ${metadata.season}`,
    `Location: ${metadata.location_type}`,
    metadata.notable_details.length > 0
      ? `Notable details: ${metadata.notable_details.join(', ')}`
      : null,
    `Photographic style: ${metadata.photographic_style}`,
    `Keywords: ${metadata.keywords.join(', ')}`,
  ];
  return parts.filter((p): p is string => p !== null).join('. ') + '.';
}
