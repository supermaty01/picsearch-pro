import { z } from 'zod';

/**
 * Structured metadata extracted by the vision model (FR-2).
 * LLM output is untrusted input: everything the model returns is parsed
 * against this schema before it touches the database (NFR-4).
 */
export const imageMetadataSchema = z.object({
  scene_description: z.string().min(10).max(600),
  objects: z.array(z.string().min(1)).min(1).max(25),
  actions: z.array(z.string().min(1)).max(15),
  mood: z.string().min(1).max(200),
  colors: z.array(z.string().min(1)).min(1).max(12),
  weather: z.string().min(1).max(200),
  location_type: z.string().min(1).max(200),
  keywords: z.array(z.string().min(1)).min(1).max(20),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
