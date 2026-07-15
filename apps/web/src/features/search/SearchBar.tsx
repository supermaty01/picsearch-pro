import { useState } from 'react';

import { Spinner } from '../../components/Spinner.js';

/** Free-text query input (FR-6). Submits on Enter or button; disabled while pending. */
export function SearchBar({
  onSearch,
  pending,
  onClear,
  hasResults,
}: {
  onSearch: (query: string) => void;
  pending: boolean;
  onClear: () => void;
  hasResults: boolean;
}) {
  const [query, setQuery] = useState('');

  return (
    <form
      role="search"
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length >= 2) onSearch(trimmed);
      }}
    >
      <label className="sr-only" htmlFor="search-input">
        Search images
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        placeholder="Describe an image… e.g. “a beach sunset but also gothic architecture”"
        className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || query.trim().length < 2}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Spinner label="Searching" /> : 'Search'}
        </button>
        {hasResults && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onClear();
            }}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
