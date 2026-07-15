import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('App shell', () => {
  it('renders the brand and a labelled search input', () => {
    renderApp();
    expect(screen.getByText('PicSearch')).toBeDefined();
    expect(screen.getByLabelText('Search images')).toBeDefined();
  });

  it('exposes primary navigation', () => {
    renderApp();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeDefined();
  });
});
