import { type BenchmarkReport, type StrategyReport } from '@picsearch/shared';

/**
 * Benchmark dashboard (FR-14): MRR / Recall@K per strategy with the C→D delta
 * highlighted — the agent's isolated, measured contribution (docs/06 §5).
 */
export function BenchmarkChart({ report }: { report: BenchmarkReport }) {
  const byId = new Map(report.strategies.map((s) => [s.strategy, s]));
  const c = byId.get('C');
  const d = byId.get('D');
  const mrrDelta = c && d ? d.mrr - c.mrr : null;

  return (
    <div className="space-y-6">
      {mrrDelta !== null && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-medium text-brand-900">
            Agent contribution (C → D): MRR {mrrDelta >= 0 ? '+' : ''}
            {mrrDelta.toFixed(3)}
          </p>
          <p className="mt-1 text-xs text-brand-700">
            Isolates what the orchestrator agent adds on top of hybrid retrieval + reranking.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse text-sm">
          <caption className="sr-only">Benchmark metrics per strategy</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pr-4">
                Strategy
              </th>
              <th scope="col" className="py-2 pr-4">
                MRR
              </th>
              <th scope="col" className="py-2 pr-4">
                Recall@3
              </th>
              <th scope="col" className="py-2 pr-4">
                Recall@5
              </th>
              <th scope="col" className="py-2">
                p50 latency
              </th>
            </tr>
          </thead>
          <tbody>
            {report.strategies.map((s) => (
              <StrategyRow key={s.strategy} report={s} highlight={s.strategy === 'D'} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrategyRow({ report, highlight }: { report: StrategyReport; highlight: boolean }) {
  return (
    <tr className={`border-b border-slate-100 ${highlight ? 'bg-brand-50' : ''}`}>
      <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-800">
        {report.strategy}. {report.label}
      </th>
      <MetricCell value={report.mrr} />
      <MetricCell value={report.recallAt3} />
      <MetricCell value={report.recallAt5} />
      <td className="py-2 tabular-nums text-slate-600">{report.p50LatencyMs} ms</td>
    </tr>
  );
}

/** Number + a mini SVG bar (0..1). SVG width is an attribute, not an inline style. */
function MetricCell({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <td className="py-2 pr-4">
      <div className="flex items-center gap-2">
        <span className="w-10 tabular-nums text-slate-800">{value.toFixed(3)}</span>
        <svg
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          className="h-2 w-20 rounded bg-slate-100"
        >
          <rect x={0} y={0} width={pct} height={8} className="fill-brand-500" />
        </svg>
      </div>
    </td>
  );
}
