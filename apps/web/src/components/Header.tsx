export type TabId = 'gallery' | 'evaluation' | 'telemetry';

const TABS: { id: TabId; label: string }[] = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'telemetry', label: 'Telemetry' },
];

/** Brand + primary navigation (docs/08). Tabs are a labelled tablist for a11y. */
export function Header({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-brand-700">PicSearch</span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">Pro</span>
        </div>
        <nav aria-label="Primary" className="flex gap-1">
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
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  selected
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
