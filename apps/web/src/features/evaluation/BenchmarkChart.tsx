import {
  type BenchmarkReport,
  type PerQueryResult,
  type QueryCategory,
  RETRIEVAL,
  type StrategyReport,
} from '@picsearch/shared';

import { METRIC_INFO, STRATEGY_INFO } from './strategyInfo.js';

/**
 * Benchmark dashboard (FR-14): a how-to-read legend, strategy cards, the C→D
 * callout (the agent's isolated contribution), and a per-query C-vs-D table
 * (docs/06 §5).
 */
export function BenchmarkChart({ report }: { report: BenchmarkReport }) {
  const byId = new Map(report.strategies.map((s) => [s.strategy, s]));
  const c = byId.get('C');
  const d = byId.get('D');

  return (
    <div className="space-y-5">
      <MetricLegend />

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

function MetricLegend() {
  return (
    <div className="border border-line-2 bg-surface">
      <div className="border-b border-line px-4 py-2.5 font-mono text-[11px] text-dim">
        how_to_read · each strategy switches one more layer on
      </div>
      <dl className="grid gap-px bg-line md:grid-cols-3">
        {METRIC_INFO.map((metric) => (
          <div key={metric.name} className="bg-surface px-4 py-3.5">
            <dt className="text-sm font-semibold text-fg-2">{metric.name}</dt>
            <dd className="mt-1 text-[12.5px] leading-relaxed text-muted">{metric.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface StrategyCardProps {
  report: StrategyReport;
  best: boolean;
}

function StrategyCard({ report, best }: StrategyCardProps) {
  const info = STRATEGY_INFO[report.strategy];
  return (
    <div
      className={`flex flex-col border p-4 ${best ? 'border-accent-dim bg-surface' : 'border-line-2 bg-surface'}`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`grid size-7 place-items-center font-mono text-sm font-bold ${
            best ? 'bg-accent/15 text-pos' : 'bg-elevated text-muted'
          }`}
        >
          {report.strategy}
        </span>
        <span className="text-[13px] font-semibold leading-snug text-fg-2">{report.label}</span>
      </div>
      <LayerChips layers={info.layers} />
      <p className="mt-3 min-h-14 text-[12px] leading-relaxed text-muted">{info.purpose}</p>
      <div className="mt-auto flex gap-4 pt-3">
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

function LayerChips({ layers }: { layers: { agent: boolean; keyword: boolean; rerank: boolean } }) {
  const chips = [
    { label: 'Vector', on: true },
    { label: 'Keyword', on: layers.keyword },
    { label: 'Rerank', on: layers.rerank },
    { label: 'Agent', on: layers.agent },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`border px-1.5 py-0.5 font-mono text-[10px] ${
            chip.on ? 'border-accent-dim text-accent' : 'border-line-2 text-faint line-through'
          }`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function Metric({ label, value, highlight }: MetricProps) {
  return (
    <div className="flex-1">
      <div className="font-mono text-[10px] text-dim">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? 'text-pos' : 'text-fg-2'}`}>
        {value}
      </div>
    </div>
  );
}

interface ComparisonProps {
  c: StrategyReport;
  d: StrategyReport;
}

function Delta({ c, d }: ComparisonProps) {
  const mrrGain = d.mrr - c.mrr;
  const recallGain = d.recallAt5 - c.recallAt5;
  const clarified = d.perQuery.filter((q) => q.clarified).length;
  return (
    <div className="flex flex-wrap items-stretch border border-line-2 border-l-2 border-l-accent bg-surface">
      <div className="min-w-[210px] border-r border-line px-5 py-5">
        <div className="mb-2 font-mono text-[11px] text-dim">decisive_comparison</div>
        <div className="text-xl font-bold text-fg-2">C&nbsp;→&nbsp;D</div>
        <div className="mt-1 text-[12.5px] text-muted">Isolated impact of the agent</div>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-7 px-5 py-5">
        <Stat value={`${mrrGain >= 0 ? '+' : ''}${mrrGain.toFixed(2)}`} label="MRR gain" />
        <Stat
          value={`${recallGain >= 0 ? '+' : ''}${(recallGain * 100).toFixed(0)}pts`}
          label="Recall@5 gain"
        />
        <Stat value={String(clarified)} label="Clarified queries" />
        <p className="min-w-[200px] flex-1 border-l border-line pl-5 text-[12.5px] leading-relaxed text-body">
          C and D share every retrieval layer — the only difference is the agent rewriting,
          splitting, or clarifying the query first. This delta is the agent’s measured value.
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

const NOT_FOUND = '—';

function rankOf(q: PerQueryResult | undefined): string {
  if (!q || q.reciprocalRank <= 0) return NOT_FOUND;
  return String(Math.round(1 / q.reciprocalRank));
}

function PerQueryTable({ c, d }: ComparisonProps) {
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
      <p className="border-t border-line px-4 py-2.5 font-mono text-[10.5px] text-dim">
        Rank = position of the first expected image (1 is best). {NOT_FOUND} = not in the top{' '}
        {RETRIEVAL.resultCount}. For ambiguous queries, D asking a clarifying question counts as
        rank 1 — that is the correct behavior.
      </p>
    </div>
  );
}
