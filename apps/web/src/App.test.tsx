import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('renders the brand and lands on the overview', () => {
    renderApp();
    expect(screen.getByText('Semantic image engine')).toBeDefined();
    expect(screen.getByText('Semantic Image Search, Measured')).toBeDefined();
  });

  it('exposes primary navigation', () => {
    renderApp();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeDefined();
  });

  it('navigates to the Search Studio with a labelled search input', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Search Studio' }));
    expect(screen.getByLabelText('Search images')).toBeDefined();
  });
});
