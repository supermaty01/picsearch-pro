import { type SearchResponse, type SearchResultItem } from '@picsearch/shared';

import { MetadataInspector } from '../gallery/MetadataInspector.js';
import { AgentDecisionBadge } from './AgentDecisionBadge.js';
import { ClarificationPrompt } from './ClarificationPrompt.js';

/**
 * Renders a search outcome. Switches exhaustively on the discriminated union
 * `kind` (docs/08) — the `never` default makes adding a new kind a compile error.
 */
export function SearchResults({
  response,
  onClarify,
}: {
  response: SearchResponse;
  onClarify: (answer: string) => void;
}) {
  switch (response.kind) {
    case 'results':
      return (
        <section aria-label="Search results" className="space-y-3">
          <AgentDecisionBadge
            action={response.agent.action}
            resolvedQueries={response.agent.resolvedQueries}
          />
          {response.results.length === 0 ? (
            <p className="text-sm text-slate-500">No matches found.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {response.results.map((item) => (
                <ResultCard key={item.id} item={item} />
              ))}
            </ul>
          )}
        </section>
      );
    case 'clarification':
      return <ClarificationPrompt question={response.question} onAnswer={onClarify} />;
    default: {
      const _exhaustive: never = response;
      return _exhaustive;
    }
  }
}

function ResultCard({ item }: { item: SearchResultItem }) {
  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <img
        src={item.imageUrl}
        alt={item.metadata.scene_description}
        loading="lazy"
        className="aspect-video w-full object-cover"
      />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">Relevance</span>
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
            {item.score.toFixed(3)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-700">
          {item.metadata.scene_description}
        </p>
        <MetadataInspector metadata={item.metadata} />
      </div>
    </li>
  );
}
