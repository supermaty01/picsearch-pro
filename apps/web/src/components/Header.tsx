import { useQuery } from '@tanstack/react-query';

import { getHealth } from '../lib/api.js';

export type TabId = 'search' | 'gallery' | 'evaluation' | 'telemetry';

const TABS: { id: TabId; label: string }[] = [
  { id: 'search', label: 'Search Studio' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'evaluation', label: 'Evaluation Lab' },
  { id: 'telemetry', label: 'Telemetry' },
];

/** Brand + primary navigation + live status bar (docs/08 mockup). */
export function Header({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <header className="flex flex-wrap items-stretch border-b border-line bg-header">
      <div className="flex items-center gap-3 border-r border-line px-5 py-3.5">
        <span className="grid size-8 place-items-center bg-accent">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#05130c"
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
          <span className="block font-mono text-[10px] text-dim">semantic image engine</span>
        </span>
      </div>

      <nav aria-label="Primary" className="flex flex-wrap">
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
              className={`self-stretch border-r border-line px-5 py-3.5 font-display text-sm transition ${
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

      <div className="flex-1" />
      <StatusBar />
    </header>
  );
}

function StatusBar() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  });
  const status = health.isError ? 'offline' : (health.data?.status ?? 'connecting');
  const ok = status === 'ok';

  return (
    <div className="flex items-stretch self-stretch font-mono text-[11px] text-muted">
      <div className="flex items-center gap-2 border-l border-line px-4">
        <span className={`size-2 ${ok ? 'bg-accent' : 'bg-route-fallback'}`} aria-hidden="true" />
        {ok ? 'operational' : status}
      </div>
      <div className="hidden items-center border-l border-line px-4 sm:flex">workers-ai</div>
      <div className="hidden items-center border-l border-line px-3.5 sm:flex">
        <span className="grid size-7 place-items-center border border-line-3 bg-elevated text-[11px] font-semibold text-body">
          PS
        </span>
      </div>
    </div>
  );
}
