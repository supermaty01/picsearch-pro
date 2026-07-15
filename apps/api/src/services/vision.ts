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

const SYSTEM_PROMPT = `You are a meticulous image analyst for a semantic search engine.
Look at the image and return ONLY a JSON object matching this exact shape:
{
  "scene_description": string (1-3 sentences describing the whole scene),
  "objects": string[] (distinct visible objects/subjects),
  "actions": string[] (activities happening; [] if none),
  "mood": string (overall mood/atmosphere),
  "colors": string[] (dominant colors),
  "weather": string (weather/lighting; "indoor/not applicable" if none),
  "location_type": string (e.g. "urban historic", "coastal", "indoor studio"),
  "keywords": string[] (search keywords a user might type to find this image)
}
Be specific and factual. Do not invent details you cannot see. Output JSON only, no prose, no markdown fences.`;

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
    max_tokens: 800,
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
