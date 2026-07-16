import { useQuery } from '@tanstack/react-query';

import { getHealth } from '../lib/api.js';
import { QUERY_KEYS } from '../lib/queryKeys.js';

export type TabId = 'overview' | 'search' | 'gallery' | 'evaluation' | 'telemetry';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'search', label: 'Search Studio' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'evaluation', label: 'Evaluation Lab' },
  { id: 'telemetry', label: 'Telemetry' },
];

interface HeaderProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

/**
 * Brand + primary navigation + live status (docs/08 mockup). On small screens
 * the nav drops to its own row and scrolls horizontally instead of wrapping
 * into a ragged grid; brand and status share the top row.
 */
export function Header({ active, onSelect }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-stretch border-b border-line bg-header">
      <div className="flex items-center gap-3 border-r border-line px-4 py-3 md:px-5 md:py-3.5">
        <span className="grid size-8 place-items-center bg-accent text-ink">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" />
            <path d="M9 9h6v6H9z" />
          </svg>
        </span>
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight text-fg">
            PicSearch<span className="text-accent">/</span>Pro
          </span>
          <span className="block font-mono text-[10px] text-dim">Semantic image engine</span>
        </span>
      </div>

      <div className="order-1 ml-auto flex md:order-2">
        <StatusBar />
      </div>

      <nav
        aria-label="Primary"
        className="order-2 flex w-full overflow-x-auto border-t border-line md:order-1 md:w-auto md:border-t-0"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => {
                onSelect(tab.id);
              }}
              className={`self-stretch whitespace-nowrap border-r border-line px-4 py-3 font-display text-sm transition md:px-5 md:py-3.5 ${
                selected
                  ? 'border-b-2 border-b-accent bg-elevated font-semibold text-fg'
                  : 'font-medium text-muted hover:bg-elevated/50 hover:text-fg-2'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

const HEALTH_CHECKS: { key: 'db' | 'storage' | 'ai'; label: string }[] = [
  { key: 'db', label: 'Database' },
  { key: 'storage', label: 'Storage' },
  { key: 'ai', label: 'AI inference' },
];

/** Live status chip; hover/focus reveals the per-dependency health breakdown. */
function StatusBar() {
  const health = useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  });
  const status = health.isError
    ? 'Offline'
    : health.data === undefined
      ? 'Connecting'
      : health.data.status === 'ok'
        ? 'Operational'
        : 'Degraded';
  const ok = status === 'Operational';
  const checks = health.data?.checks;

  return (
    <div className="group relative flex items-stretch self-stretch font-mono text-[11px] text-muted">
      <button
        type="button"
        aria-label={`Service status: ${status}. Show dependency health.`}
        className="flex cursor-default items-center gap-2 border-l border-line px-4"
      >
        <span className={`size-2 ${ok ? 'bg-accent' : 'bg-route-fallback'}`} aria-hidden="true" />
        {status}
      </button>
      <div className="absolute right-0 top-full z-20 hidden min-w-44 border border-line-2 bg-elevated p-3 shadow-lg group-focus-within:block group-hover:block">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-dim">health.checks</div>
        {checks ? (
          <ul className="space-y-1.5">
            {HEALTH_CHECKS.map(({ key, label }) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className={`size-1.5 ${checks[key] ? 'bg-accent' : 'bg-route-fallback'}`}
                  aria-hidden="true"
                />
                <span className="flex-1 text-body">{label}</span>
                <span className={checks[key] ? 'text-accent' : 'text-route-fallback'}>
                  {checks[key] ? 'ok' : 'down'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-dim">{health.isError ? 'API unreachable' : 'Checking…'}</p>
        )}
      </div>
    </div>
  );
}
