import { MODELS } from '@picsearch/shared';
import { describe, expect, it, vi } from 'vitest';

import { VisionValidationError } from '../src/lib/problem.js';
import { extractMetadata } from '../src/services/vision.js';
import { makeEnv, validMetadata } from './helpers.js';

const imageBytes = new Uint8Array([1, 2, 3, 4]).buffer;

describe('extractMetadata (FR-2, NFR-4)', () => {
  it('returns validated metadata on a valid first response', async () => {
    const run = vi.fn((model: string) => {
      expect(model).toBe(MODELS.vision);
      return { response: JSON.stringify(validMetadata) };
    });
    const { metadata } = await extractMetadata(makeEnv(run), imageBytes, 'image/jpeg');
    expect(metadata).toEqual(validMetadata);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries once with the validation error, then succeeds', async () => {
    const { keywords: _dropped, ...invalid } = validMetadata;
    const run = vi
      .fn()
      .mockResolvedValueOnce({ response: JSON.stringify(invalid) })
      .mockResolvedValueOnce({ response: JSON.stringify(validMetadata) });
    const { metadata } = await extractMetadata(makeEnv(run), imageBytes, 'image/png');
    expect(metadata).toEqual(validMetadata);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('throws VisionValidationError after two invalid responses', async () => {
    const run = vi.fn().mockResolvedValue({ response: '{"not":"valid"}' });
    await expect(extractMetadata(makeEnv(run), imageBytes, 'image/webp')).rejects.toBeInstanceOf(
      VisionValidationError,
    );
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('handles JSON wrapped in markdown fences', async () => {
    const run = vi.fn().mockResolvedValue({
      response: '```json\n' + JSON.stringify(validMetadata) + '\n```',
    });
    const { metadata } = await extractMetadata(makeEnv(run), imageBytes, 'image/jpeg');
    expect(metadata).toEqual(validMetadata);
  });
});
