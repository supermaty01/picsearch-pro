import { RETRIEVAL } from '@picsearch/shared';
import { useEffect, useState } from 'react';

interface PipelineStage {
  label: string;
  detail: string;
  /** Rough stage budget used only to advance the visual indicator. */
  estimatedMs: number;
}

const STAGES: PipelineStage[] = [
  { label: 'Orchestrator', detail: 'Routing the query', estimatedMs: 1000 },
  { label: 'Embedding', detail: 'Query → 384-dim vector', estimatedMs: 350 },
  {
    label: 'Hybrid search',
    detail: `RRF · top ${String(RETRIEVAL.candidateCount)}`,
    estimatedMs: 650,
  },
  {
    label: 'Cross-encoder',
    detail: `Rerank ${String(RETRIEVAL.candidateCount)}→${String(RETRIEVAL.resultCount)}`,
    estimatedMs: 1400,
  },
];

const TICK_MS = 100;

/**
 * Live pipeline animation shown while a search is in flight. Stage progression
 * is estimated client-side (the API answers in one round-trip); the real
 * per-stage timings replace this view in the execution trace once results land.
 */
export function SearchProgress({ query }: { query: string }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const activeIndex = activeStageIndex(elapsedMs);

  return (
    <div
      className="border border-line-2 border-t-2 border-t-accent bg-surface"
      role="status"
      aria-label="Search in progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <span className="font-mono text-xs text-body">
          <span className="text-dim">Searching · </span>“{query}”
        </span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {(elapsedMs / 1000).toFixed(1)}s
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-y-3 p-4">
        {STAGES.map((stage, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
          return (
            <div key={stage.label} className="flex items-center">
              {i > 0 && <span className="h-px w-5 flex-none bg-line-3" aria-hidden="true" />}
              <div
                className={`min-w-[130px] border px-3 py-2.5 transition-colors ${
                  state === 'active'
                    ? 'animate-pulse border-accent-dim bg-accent/10'
                    : state === 'done'
                      ? 'border-line-2 bg-elevated'
                      : 'border-line bg-surface opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-1.5 ${state === 'pending' ? 'bg-line-3' : 'bg-accent'}`}
                    aria-hidden="true"
                  />
                  <span className="text-[12.5px] font-semibold text-fg-2">{stage.label}</span>
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-muted">
                  {state === 'done' ? 'Done' : state === 'active' ? stage.detail : 'Queued'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line px-4 py-2 font-mono text-[10.5px] text-dim">
        Stage progress is estimated — exact timings appear in the execution trace with the results.
      </div>
    </div>
  );
}

function activeStageIndex(elapsedMs: number): number {
  let cumulative = 0;
  for (const [i, stage] of STAGES.entries()) {
    cumulative += stage.estimatedMs;
    if (elapsedMs < cumulative) return i;
  }
  return STAGES.length - 1; // Slower than estimated: hold the last stage.
}
