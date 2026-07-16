import { useState } from 'react';

import { Header, type TabId } from './components/Header.js';
import { ViewHeading } from './components/ViewHeading.js';
import { EvaluationView } from './features/evaluation/EvaluationView.js';
import { GalleryView } from './features/gallery/GalleryView.js';
import { OverviewView } from './features/overview/OverviewView.js';
import { SearchBar } from './features/search/SearchBar.js';
import { SearchProgress } from './features/search/SearchProgress.js';
import { SearchResults } from './features/search/SearchResults.js';
import { useSearch } from './features/search/useSearch.js';
import { TelemetryPanel } from './features/telemetry/TelemetryPanel.js';
import { ApiError } from './lib/api.js';

const EXAMPLE_QUERIES = [
  'The glass pyramid at the Louvre',
  'That polis lambo at the airprt',
  'A beach sunset but also gothic architecture',
  'Something nice from vacation',
];

/**
 * Application shell (docs/08 mockup). Tabbed console: Overview (default),
 * Search Studio, Gallery, Evaluation Lab, Telemetry — over a dark, grid-lined
 * canvas.
 */
export function App() {
  const [tab, setTab] = useState<TabId>('overview');
  const searchMutation = useSearch();
  const [baseQuery, setBaseQuery] = useState('');

  function runSearch(query: string) {
    setBaseQuery(query);
    searchMutation.mutate(query);
  }

  // One clarification round: concatenate the answer with the original query.
  function clarify(answer: string) {
    searchMutation.mutate(`${baseQuery} ${answer}`.trim());
  }

  function clearSearch() {
    searchMutation.reset();
    setBaseQuery('');
  }

  const response = searchMutation.data;
  const hasSearchState = response !== undefined || searchMutation.isError;

  return (
    <div className="grid-bg flex min-h-screen flex-col font-display text-body">
      <Header active={tab} onSelect={setTab} />

      <main className="mx-auto w-full max-w-[1560px] flex-1 px-5 py-6">
        {tab === 'overview' && <OverviewView onNavigate={setTab} />}

        {tab === 'search' && (
          <div className="space-y-4">
            <ViewHeading
              tag="studio / agentic-console"
              title="Agentic Retrieval Console"
              note="Every query is routed by the orchestrator agent before it touches hybrid_search · RRF fusion · cross-encoder rerank"
            />
            <SearchBar
              onSearch={runSearch}
              pending={searchMutation.isPending}
              onClear={clearSearch}
              hasResults={hasSearchState}
            />
            {searchMutation.error instanceof ApiError && (
              <p className="font-mono text-xs text-route-fallback">
                {searchMutation.error.message}
              </p>
            )}
            {searchMutation.isPending && <SearchProgress query={baseQuery} />}
            {!searchMutation.isPending && response !== undefined && (
              <SearchResults response={response} onClarify={clarify} />
            )}
            {!searchMutation.isPending && response === undefined && (
              <div className="border border-line-2 bg-surface p-6">
                <p className="font-mono text-xs text-dim">Try one of these →</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        runSearch(q);
                      }}
                      className="border border-line-2 bg-elevated px-3 py-2 font-mono text-xs text-body transition hover:border-accent-dim hover:text-fg-2"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'gallery' && <GalleryView />}
        {tab === 'evaluation' && <EvaluationView />}
        {tab === 'telemetry' && <TelemetryPanel />}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-header px-5 py-4 font-mono text-[11px] text-faint">
        <span>React (Vite) + Tailwind · Cloudflare Pages/Workers · Supabase pgvector</span>
        <span>
          Built by{' '}
          <a
            href="https://www.linkedin.com/in/mateo-alvarez-lebrum/"
            target="_blank"
            rel="noreferrer"
            className="text-muted underline decoration-line-3 underline-offset-2 transition hover:text-accent"
          >
            Mateo Alvarez ↗
          </a>
        </span>
        <span>bge-small-en-v1.5 · 384-dim · HNSW + GIN · RRF k=60</span>
      </footer>
    </div>
  );
}
