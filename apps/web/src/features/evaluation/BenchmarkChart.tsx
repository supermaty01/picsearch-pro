import {
  type BenchmarkReport,
  type PerQueryResult,
  type QueryCategory,
  type StrategyReport,
} from '@picsearch/shared';

/**
 * Benchmark dashboard (FR-14): strategy cards, the C→D callout (the agent's
 * isolated contribution), and a per-query C-vs-D table (docs/06 §5).
 */
export function BenchmarkChart({ report }: { report: BenchmarkReport }) {
  const byId = new Map(report.strategies.map((s) => [s.strategy, s]));
  const c = byId.get('C');
  const d = byId.get('D');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {report.strategies.map((s) => (
          <StrategyCard key={s.strategy} report={s} best={s.strategy === 'D'} />
        ))}
      </div>

      {c && d && <Delta c={c} d={d} />}
      {c && d && <PerQueryTable c={c} d={d} />}
    </div>
  );
}

function StrategyCard({ report, best }: { report: StrategyReport; best: boolean }) {
  return (
    <div
      className={`border p-4 ${best ? 'border-accent-dim bg-surface' : 'border-line-2 bg-surface'}`}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className={`grid size-7 place-items-center font-mono text-sm font-bold ${
            best ? 'bg-accent/15 text-pos' : 'bg-elevated text-muted'
          }`}
        >
          {report.strategy}
        </span>
        {best && (
          <span className="border border-accent-dim px-2 py-0.5 font-mono text-[10px] text-accent">
            full pipeline
          </span>
        )}
      </div>
      <div className="min-h-9 text-[13px] font-semibold leading-snug text-fg-2">{report.label}</div>
      <div className="mt-4 flex gap-4">
        <Metric label="MRR" value={report.mrr.toFixed(2)} highlight={best} />
        <Metric label="Recall@5" value={report.recallAt5.toFixed(2)} />
      </div>
      <svg
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
        className="mt-4 h-1.5 w-full bg-elevated"
        aria-hidden="true"
      >
        <rect
          x={0}
          y={0}
          width={Math.max(0, Math.min(1, report.mrr)) * 100}
          height={6}
          className={best ? 'fill-accent' : 'fill-accent-dim'}
        />
      </svg>
      <div className="mt-2 font-mono text-[10px] text-dim">p50 {report.p50LatencyMs}ms</div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1">
      <div className="font-mono text-[10px] text-dim">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? 'text-pos' : 'text-fg-2'}`}>
        {value}
      </div>
    </div>
  );
}

function Delta({ c, d }: { c: StrategyReport; d: StrategyReport }) {
  const mrrGain = d.mrr - c.mrr;
  const recallGain = d.recallAt5 - c.recallAt5;
  const clarified = d.perQuery.filter((q) => q.clarified).length;
  return (
    <div className="flex flex-wrap items-stretch border border-line-2 border-l-2 border-l-accent bg-surface">
      <div className="min-w-[210px] border-r border-line px-5 py-5">
        <div className="mb-2 font-mono text-[11px] text-dim">decisive_comparison</div>
        <div className="text-xl font-bold text-fg-2">C&nbsp;→&nbsp;D</div>
        <div className="mt-1 text-[12.5px] text-muted">isolated impact of the agent</div>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-7 px-5 py-5">
        <Stat value={`${mrrGain >= 0 ? '+' : ''}${mrrGain.toFixed(2)}`} label="MRR gain" />
        <Stat
          value={`${recallGain >= 0 ? '+' : ''}${(recallGain * 100).toFixed(0)}pts`}
          label="Recall@5"
        />
        <Stat value={String(clarified)} label="clarified queries" />
        <p className="min-w-[200px] flex-1 border-l border-line pl-5 text-[12.5px] leading-relaxed text-body">
          Concrete evidence the agentic layer adds measurable value — not just architectural
          aesthetics.
        </p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-accent">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

const CATEGORY_COLORS: Record<QueryCategory, string> = {
  direct: 'text-route-direct',
  noisy: 'text-route-reformulate',
  'multi-concept': 'text-route-decompose',
  ambiguous: 'text-route-ask',
};

function rankOf(q: PerQueryResult | undefined): string {
  if (!q) return '—';
  if (q.reciprocalRank <= 0) return '—';
  return String(Math.round(1 / q.reciprocalRank));
}

function PerQueryTable({ c, d }: { c: StrategyReport; d: StrategyReport }) {
  const cById = new Map(c.perQuery.map((q) => [q.queryId, q]));
  const dById = new Map(d.perQuery.map((q) => [q.queryId, q]));
  const ids =
    d.perQuery.length > 0 ? d.perQuery.map((q) => q.queryId) : c.perQuery.map((q) => q.queryId);

  return (
    <div className="overflow-x-auto border border-line-2 bg-surface">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">Per-query rank under strategy C vs D</caption>
        <thead>
          <tr className="border-b border-line-2 font-mono text-[10.5px] uppercase tracking-wide text-dim">
            <th scope="col" className="px-4 py-3 text-left font-normal">
              ground_truth_query
            </th>
            <th scope="col" className="px-4 py-3 text-left font-normal">
              type
            </th>
            <th scope="col" className="px-4 py-3 text-center font-normal">
              C rank
            </th>
            <th scope="col" className="px-4 py-3 text-center font-normal">
              D rank
            </th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const cq = cById.get(id);
            const dq = dById.get(id);
            const row = dq ?? cq;
            const category = row?.category ?? 'direct';
            return (
              <tr key={id} className="border-b border-line">
                <td className="px-4 py-3 text-[13px] text-body">{row?.queryText ?? id}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-[10px] ${CATEGORY_COLORS[category]}`}>
                    {category}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-mono text-[13px] text-muted">
                  {rankOf(cq)}
                </td>
                <td className="px-4 py-3 text-center font-mono text-[13px] font-semibold text-pos">
                  {rankOf(dq)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
