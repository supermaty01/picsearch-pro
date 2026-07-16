import { z } from 'zod';

/**
 * Structured metadata extracted by the vision model (FR-2).
 * LLM output is untrusted input: everything the model returns is parsed
 * against this schema before it touches the database (NFR-4).
 *
 * The schema is deliberately rich: the more specific, grounded context the
 * model captures here, the better `dense_context` (FR-3) embeds and the more a
 * user's free-text query can match. Fields are generous in length/count so
 * detailed output is not truncated — the vision prompt asks the model to fill
 * them exhaustively (see apps/api/src/services/vision.ts).
 */
export const imageMetadataSchema = z.object({
  /** 3-5 detailed sentences describing the whole scene, foreground to background. */
  scene_description: z.string().min(10).max(1500),
  /**
   * One sentence naming the broader place/context (e.g. "a busy airport terminal
   * in Italy"). Defaulted so rows ingested before this field existed still parse
   * on read; the vision prompt asks the model to always populate it.
   */
  setting: z.string().min(1).max(400).default('unknown'),
  /** Every distinct visible object, subject, or element — be exhaustive. */
  objects: z.array(z.string().min(1)).min(1).max(40),
  /** Activities or events happening in the frame ([] if a still scene). */
  actions: z.array(z.string().min(1)).max(20),
  /** Overall mood / atmosphere, a few descriptive words. */
  mood: z.string().min(1).max(300),
  /** Dominant and accent colors, specific where possible ("terracotta", "teal"). */
  colors: z.array(z.string().min(1)).min(1).max(15),
  /** Weather and lighting conditions ("indoor / not applicable" if none). */
  weather: z.string().min(1).max(200),
  /** Time of day, if inferable ("golden hour", "night", "midday", "unknown"). */
  time_of_day: z.string().min(1).max(120),
  /** Season, if inferable ("summer", "winter", "unknown"). */
  season: z.string().min(1).max(120),
  /** Kind of place ("urban historic", "coastal", "mountain", "indoor"). */
  location_type: z.string().min(1).max(200),
  /**
   * Distinctive, specific details a searcher might remember: visible text on
   * signs, brand names, landmarks, license plates, unusual features. [] if none.
   */
  notable_details: z.array(z.string().min(1)).max(20),
  /** Photographic style/composition ("wide-angle smartphone travel snapshot"). */
  photographic_style: z.string().min(1).max(200),
  /** Search keywords a user might type to find this image. */
  keywords: z.array(z.string().min(1)).min(1).max(40),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
