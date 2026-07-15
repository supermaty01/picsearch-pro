import { type TelemetryRecord } from '@picsearch/shared';
import { useQuery } from '@tanstack/react-query';

import { Spinner } from '../../components/Spinner.js';
import { AgentDecisionBadge } from '../search/AgentDecisionBadge.js';
import { listTelemetry } from '../../lib/api.js';

const STAGES: { key: keyof TelemetryRecord; label: string; swatch: string; fill: string }[] = [
  { key: 'agentDecisionMs', label: 'Agent', swatch: 'bg-violet-400', fill: 'fill-violet-400' },
  { key: 'embeddingMs', label: 'Embedding', swatch: 'bg-sky-400', fill: 'fill-sky-400' },
  { key: 'vectorSearchMs', label: 'Retrieval', swatch: 'bg-emerald-400', fill: 'fill-emerald-400' },
  { key: 'rerankMs', label: 'Rerank', swatch: 'bg-amber-400', fill: 'fill-amber-400' },
];

/** Live per-query telemetry with a latency waterfall (FR-11, FR-12). */
export function TelemetryPanel() {
  const telemetry = useQuery({
    queryKey: ['telemetry'],
    queryFn: () => listTelemetry(25),
    refetchInterval: 5000,
  });

  if (telemetry.isPending) return <Spinner label="Loading telemetry" />;
  if (telemetry.isError) return <p className="text-sm text-rose-600">Could not load telemetry.</p>;
  if (telemetry.data.items.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No searches yet. Run a search to see per-stage latency here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {STAGES.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className={`size-3 rounded-sm ${s.swatch}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>
      <ul className="space-y-2">
        {telemetry.data.items.map((row) => (
          <TelemetryRow key={row.id} row={row} />
        ))}
      </ul>
    </div>
  );
}

function TelemetryRow({ row }: { row: TelemetryRecord }) {
  const total = Math.max(row.executionTimeMs, 1);
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-800">“{row.queryText}”</span>
        <div className="flex items-center gap-2">
          <AgentDecisionBadge action={row.agentAction} />
          <span className="text-xs tabular-nums text-slate-500">{row.executionTimeMs} ms</span>
        </div>
      </div>
      <svg
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`Latency breakdown, total ${String(row.executionTimeMs)} ms`}
      >
        {(() => {
          let x = 0;
          return STAGES.map((s) => {
            const value = row[s.key];
            const ms = typeof value === 'number' ? value : 0;
            const width = (ms / total) * 100;
            const rect = (
              <rect key={s.label} x={x} y={0} width={width} height={4} className={s.fill} />
            );
            x += width;
            return rect;
          });
        })()}
      </svg>
      {row.rerankSkipped && (
        <p className="mt-1 text-xs text-amber-600">Reranker skipped (degraded to RRF order).</p>
      )}
    </li>
  );
}
