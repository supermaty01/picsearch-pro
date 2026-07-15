import { type ImageMetadata, type SearchResponse } from '@picsearch/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchResults } from './SearchResults.js';

const metadata: ImageMetadata = {
  scene_description: 'A golden beach at sunset with gentle waves.',
  setting: 'a sandy coastline at dusk',
  objects: ['beach', 'ocean'],
  actions: [],
  mood: 'calm',
  colors: ['gold', 'blue'],
  weather: 'clear',
  time_of_day: 'sunset',
  season: 'summer',
  location_type: 'coastal',
  notable_details: [],
  photographic_style: 'landscape photo',
  keywords: ['beach', 'sunset'],
};

describe('SearchResults (discriminated union rendering)', () => {
  it('renders result cards with score and alt text for kind="results"', () => {
    const response: SearchResponse = {
      kind: 'results',
      agent: { action: 'direct', resolvedQueries: ['beach sunset'] },
      results: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          imageUrl: 'https://cdn.test/a.jpg',
          denseContext: 'Scene: beach…',
          score: 0.912,
          metadata,
        },
      ],
      telemetry: {
        agentDecisionMs: 10,
        embeddingMs: 5,
        vectorSearchMs: 20,
        rerankMs: 15,
        executionTimeMs: 50,
        rerankSkipped: false,
      },
    };
    render(<SearchResults response={response} onClarify={vi.fn()} />);
    expect(screen.getByText('0.912')).toBeDefined();
    // alt text comes from scene_description (NFR-10).
    expect(screen.getByAltText(metadata.scene_description)).toBeDefined();
    // the decision panel echoes the resolved query.
    expect(screen.getByText('beach sunset')).toBeDefined();
    // the route label appears in the console (may repeat across panels).
    expect(screen.getAllByText('DIRECT').length).toBeGreaterThan(0);
  });

  it('renders the clarifying question for kind="clarification"', () => {
    const response: SearchResponse = {
      kind: 'clarification',
      agent: { action: 'ask_context' },
      question: 'Beach, mountains, or city?',
    };
    render(<SearchResults response={response} onClarify={vi.fn()} />);
    expect(screen.getByText('Beach, mountains, or city?')).toBeDefined();
    // The follow-up input is labelled (a11y).
    expect(screen.getByLabelText('Your answer')).toBeDefined();
  });
});
