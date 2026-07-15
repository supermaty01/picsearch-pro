import { RETRIEVAL } from '@picsearch/shared';
import { useState } from 'react';

/** Free-text query input (FR-6), styled as the mockup's agentic console bar. */
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
      className="border border-line-2 bg-surface"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length >= 2) onSearch(trimmed);
      }}
    >
      <div className="flex items-stretch">
        <div className="grid place-items-center border-r border-line px-4" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-dim"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </div>
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
          className="min-w-0 pl-3 flex-1 bg-transparent py-4 text-[15px] text-fg placeholder:text-dim focus:outline-none"
        />
        {hasResults && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onClear();
            }}
            className="border-l border-line px-4 font-mono text-xs text-muted hover:bg-elevated hover:text-fg-2"
          >
            clear
          </button>
        )}
        <button
          type="submit"
          disabled={pending || query.trim().length < 2}
          className="flex items-center gap-2 border-l border-accent-dim bg-accent px-6 font-display text-sm font-bold text-[#05130c] transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <span className="text-[#05130c]">running…</span>
          ) : (
            <>
              Search
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#05130c"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-stretch border-t border-line font-mono text-[11px] text-dim">
        <span className="border-r border-line px-3.5 py-2.5">retrieval params</span>
        <div className="flex-1" />
        <span className="border-l border-line px-3.5 py-2.5">vec 0.5</span>
        <span className="border-l border-line px-3.5 py-2.5">kw 0.5</span>
        <span className="border-l border-line px-3.5 py-2.5">top_k {RETRIEVAL.resultCount}</span>
        <span className="border-l border-line px-3.5 py-2.5">rrf {RETRIEVAL.rrfK}</span>
      </div>
    </form>
  );
}
