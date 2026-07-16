import { type TelemetryRecord } from '@picsearch/shared';
import { useQuery } from '@tanstack/react-query';

import { Spinner } from '../../components/Spinner.js';
import { ViewHeading } from '../../components/ViewHeading.js';
import { AgentDecisionBadge } from '../search/AgentDecisionBadge.js';
import { listTelemetry } from '../../lib/api.js';
import { QUERY_KEYS } from '../../lib/queryKeys.js';
import { PIPELINE_STAGES } from './stages.js';

/** Live per-query telemetry with a latency waterfall (FR-11, FR-12). */
export function TelemetryPanel() {
  const telemetry = useQuery({
    queryKey: QUERY_KEYS.telemetry,
    queryFn: () => listTelemetry(25),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-5">
      <ViewHeading
        tag="observability / query-telemetry"
        title="Telemetry Stream"
        note="Every search writes one row: agent route, per-stage latency, tokens, provider (FR-11)"
      />

      <div className="flex flex-wrap gap-3 font-mono text-[11px] text-dim">
        {PIPELINE_STAGES.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 ${s.swatch}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>

      {telemetry.isPending ? (
        <Spinner label="Loading telemetry" />
      ) : telemetry.isError ? (
        <p className="font-mono text-xs text-route-fallback">Could not load telemetry.</p>
      ) : telemetry.data.items.length === 0 ? (
        <p className="border border-line-2 bg-surface p-6 text-center font-mono text-xs text-dim">
          No searches yet. Run a search to see per-stage latency here.
        </p>
      ) : (
        <ul className="space-y-2">
          {telemetry.data.items.map((row) => (
            <TelemetryRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TelemetryRow({ row }: { row: TelemetryRecord }) {
  const total = Math.max(row.executionTimeMs, 1);
  let x = 0;
  return (
    <li className="border border-line-2 bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="truncate text-sm text-fg-2">“{row.queryText}”</span>
        <div className="flex items-center gap-2">
          <AgentDecisionBadge action={row.agentAction} />
          <span className="font-mono text-xs tabular-nums text-muted">{row.executionTimeMs}ms</span>
        </div>
      </div>
      <svg
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
        className="mt-2 h-2 w-full bg-elevated"
        role="img"
        aria-label={`Latency breakdown, total ${String(row.executionTimeMs)} ms`}
      >
        {PIPELINE_STAGES.map((s) => {
          const value = row[s.key];
          const ms = typeof value === 'number' ? value : 0;
          const width = (ms / total) * 100;
          const rect = (
            <rect key={s.label} x={x} y={0} width={width} height={4} className={s.fill} />
          );
          x += width;
          return rect;
        })}
      </svg>
      {row.rerankSkipped && (
        <p className="mt-1 font-mono text-[11px] text-route-fallback">
          Reranker skipped — degraded to RRF order
        </p>
      )}
    </li>
  );
}
