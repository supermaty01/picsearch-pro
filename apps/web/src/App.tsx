import { useState } from 'react';

import { Header, type TabId } from './components/Header.js';
import { EvaluationView } from './features/evaluation/EvaluationView.js';
import { GalleryView } from './features/gallery/GalleryView.js';
import { SearchBar } from './features/search/SearchBar.js';
import { SearchResults } from './features/search/SearchResults.js';
import { useSearch } from './features/search/useSearch.js';
import { TelemetryPanel } from './features/telemetry/TelemetryPanel.js';
import { ApiError } from './lib/api.js';

/**
 * Application shell (docs/08). A persistent search bar sits above a tabbed body
 * (Gallery · Evaluation · Telemetry). Search results / clarifications render
 * inline above the active tab.
 */
export function App() {
  const [tab, setTab] = useState<TabId>('gallery');
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
    <div className="min-h-screen bg-slate-50 font-display text-slate-900">
      <Header active={tab} onSelect={setTab} />
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <section className="space-y-4" aria-label="Search">
          <SearchBar
            onSearch={runSearch}
            pending={searchMutation.isPending}
            onClear={clearSearch}
            hasResults={hasSearchState}
          />
          {searchMutation.error instanceof ApiError && (
            <p className="text-sm text-rose-600">{searchMutation.error.message}</p>
          )}
          {response && <SearchResults response={response} onClarify={clarify} />}
        </section>

        <section aria-label={tab}>
          {tab === 'gallery' && <GalleryView />}
          {tab === 'evaluation' && <EvaluationView />}
          {tab === 'telemetry' && <TelemetryPanel />}
        </section>
      </main>
    </div>
  );
}
