import { describe, expect, it } from 'vitest';

import { buildDenseContext, buildRerankContext } from './dense-context.js';
import { imageMetadataSchema, type ImageMetadata } from './image-metadata.js';

const sample: ImageMetadata = {
  scene_description:
    "A bird's-eye view of a European canal on a sunny day, surrounded by medieval timber-framed buildings.",
  setting: 'the historic canal district of an old European town',
  objects: ['canal', 'water', 'medieval houses', 'red flowers', 'bridge'],
  actions: ['people walking along the river'],
  mood: 'Peaceful, picturesque, touristy, summery',
  colors: ['sky blue', 'vegetation green', 'terracotta brown'],
  weather: 'Warm and sunny with light scattered clouds',
  time_of_day: 'midday',
  season: 'summer',
  location_type: 'Urban, historic, European',
  notable_details: ['La Petite Venise'],
  photographic_style: 'elevated wide-angle travel photo',
  keywords: ['Alsace', 'La Petite Venise', 'medieval architecture', 'canal'],
};

describe('imageMetadataSchema', () => {
  it('accepts valid vision output', () => {
    expect(imageMetadataSchema.parse(sample)).toEqual(sample);
  });

  it('rejects output missing required fields (untrusted LLM output, NFR-4)', () => {
    const { keywords: _keywords, ...incomplete } = sample;
    expect(imageMetadataSchema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects empty object lists', () => {
    expect(imageMetadataSchema.safeParse({ ...sample, objects: [] }).success).toBe(false);
  });
});

describe('buildDenseContext', () => {
  it('produces a labeled, embedding-friendly paragraph', () => {
    const ctx = buildDenseContext(sample);
    expect(ctx).toContain('Scene: ');
    expect(ctx).toContain('Visible objects: canal, water');
    expect(ctx).toContain('Keywords: Alsace');
    expect(ctx.endsWith('.')).toBe(true);
  });

  it('omits the Activities segment when there are no actions', () => {
    const ctx = buildDenseContext({ ...sample, actions: [] });
    expect(ctx).not.toContain('Activities:');
  });

  it('is deterministic (same input, same output)', () => {
    expect(buildDenseContext(sample)).toBe(buildDenseContext(sample));
  });
});

describe('buildRerankContext', () => {
  it('front-loads the discriminative fields (scene, style, keywords)', () => {
    const ctx = buildRerankContext(sample);
    expect(ctx.startsWith(sample.scene_description)).toBe(true);
    expect(ctx).toContain('Style: elevated wide-angle travel photo');
    expect(ctx).toContain('Keywords: Alsace');
  });

  it('drops the low-signal fields that only add rerank cost', () => {
    const ctx = buildRerankContext(sample);
    expect(ctx).not.toContain('Warm and sunny');
    expect(ctx).not.toContain('sky blue');
    expect(ctx).not.toContain('midday');
  });

  it('is deterministic (same input, same output)', () => {
    expect(buildRerankContext(sample)).toBe(buildRerankContext(sample));
  });
});
