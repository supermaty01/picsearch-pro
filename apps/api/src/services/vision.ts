import { imageMetadataSchema, type ImageMetadata, MODELS } from '@picsearch/shared';
import { z } from 'zod';

import { type Env } from '../env.js';
import { aiRun } from '../lib/ai.js';
import { arrayBufferToBase64 } from '../lib/encoding.js';
import { VisionValidationError } from '../lib/problem.js';

/**
 * Vision extraction (FR-2). The image goes to the vision model in JSON mode; the
 * output is UNTRUSTED (NFR-4) and validated against `imageMetadataSchema`. On a
 * parse failure we retry exactly once, feeding the validation error back to the
 * model; a second failure throws `VisionValidationError` (→ 422). Never a crash,
 * never unvalidated passthrough (AGENTS §4).
 */

const SYSTEM_PROMPT = `You are a meticulous image analyst for a semantic image search engine.
Your description is the ONLY thing users can search against, so capture as much
grounded, specific detail as you can see — a rich, thorough description dramatically
improves retrieval. Never invent details you cannot actually see; be exhaustive
about what IS there.

Return ONLY a JSON object with exactly these fields:
{
  "scene_description": string — 3 to 5 detailed sentences. Describe the whole scene from
     foreground to background: the main subject, what surrounds it, architecture/nature,
     materials and textures, people (how many, what they are doing/wearing), lighting and
     atmosphere, and any recognizable landmark or place. Be concrete and specific.
  "setting": string — one sentence naming the broader place/context and country/region if
     identifiable (e.g. "the courtyard of the Louvre museum in Paris, France").
  "objects": string[] — EVERY distinct visible object, subject, structure, or element.
     Aim for 8-20 items. Include background elements, not just the main subject.
  "actions": string[] — activities/events happening (e.g. "people kayaking", "tourists
     walking"); [] if it is a still scene with no action.
  "mood": string — the overall mood/atmosphere in a few descriptive words.
  "colors": string[] — the dominant and accent colors, specific where possible
     ("terracotta", "turquoise", "slate grey"). 4-8 items.
  "weather": string — weather and lighting ("clear blue sky", "overcast"; use
     "indoor / not applicable" when inside).
  "time_of_day": string — "golden hour", "blue hour", "night", "midday", etc.; "unknown"
     if you truly cannot tell.
  "season": string — "summer", "winter", etc.; "unknown" if not inferable.
  "location_type": string — kind of place ("urban historic", "coastal", "mountain lake",
     "indoor exhibition").
  "notable_details": string[] — the specific, memorable details a person might search by:
     EXACT visible text on signs/banners, brand names, license plates or numbers, named
     landmarks, distinctive or unusual features. Read and transcribe visible text. [] if none.
  "photographic_style": string — composition and style ("wide-angle smartphone travel
     snapshot", "low-angle close-up", "aerial view").
  "keywords": string[] — 10-20 varied search terms a user might type to find this image,
     including synonyms, the place, the subject, and the mood.
}
Output JSON only. No prose, no explanations, no markdown code fences.`;

/** JSON Schema derived from the Zod contract — one source of truth (NFR-3, NFR-7). */
const METADATA_JSON_SCHEMA = z.toJSONSchema(imageMetadataSchema);

/** Workers AI returns `{ response: string | object }` for chat/vision models. */
const aiResponseSchema = z.object({ response: z.unknown() });

interface VisionResult {
  metadata: ImageMetadata;
  ms: number;
}

export async function extractMetadata(
  env: Env,
  imageBytes: ArrayBuffer,
  mimeType: string,
): Promise<VisionResult> {
  const start = Date.now();
  const dataUrl = `data:${mimeType};base64,${arrayBufferToBase64(imageBytes)}`;

  const firstAttempt = await callVision(env, dataUrl, SYSTEM_PROMPT);
  const firstParse = imageMetadataSchema.safeParse(firstAttempt);
  if (firstParse.success) {
    return { metadata: firstParse.data, ms: Date.now() - start };
  }

  // One sanctioned retry with the validation error fed back (AGENTS §4).
  const retryPrompt = `${SYSTEM_PROMPT}

Your previous response was invalid. Fix these problems and return corrected JSON only:
${formatIssues(firstParse.error)}`;
  const secondAttempt = await callVision(env, dataUrl, retryPrompt);
  const secondParse = imageMetadataSchema.safeParse(secondAttempt);
  if (secondParse.success) {
    return { metadata: secondParse.data, ms: Date.now() - start };
  }

  throw new VisionValidationError(
    `Vision model output failed schema validation after one retry: ${formatIssues(secondParse.error)}`,
  );
}

async function callVision(env: Env, dataUrl: string, prompt: string): Promise<unknown> {
  const raw = await aiRun(env, MODELS.vision, {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: { type: 'json_schema', json_schema: METADATA_JSON_SCHEMA },
    max_tokens: 1600,
    temperature: 0.2,
  });
  return coerceJson(aiResponseSchema.parse(raw).response);
}

/** The model may return an object, a JSON string, or JSON wrapped in ``` fences. */
export function coerceJson(response: unknown): unknown {
  if (typeof response !== 'string') return response;
  const cleaned = response
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return response; // Let the Zod parse fail with a meaningful error.
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}
