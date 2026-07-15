import { type ImageMetadata, type SearchResponse } from '@picsearch/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchResults } from './SearchResults.js';

const metadata: ImageMetadata = {
  scene_description: 'A golden beach at sunset with gentle waves.',
  objects: ['beach', 'ocean'],
  actions: [],
  mood: 'calm',
  colors: ['gold', 'blue'],
  weather: 'clear',
  location_type: 'coastal',
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
    expect(screen.getByText(/Agent: Direct/i)).toBeDefined();
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
