import { Spinner } from '../../components/Spinner.js';
import { ViewHeading } from '../../components/ViewHeading.js';
import { ApiError } from '../../lib/api.js';
import { BenchmarkChart } from './BenchmarkChart.js';
import { useBenchmark } from './useBenchmark.js';

/** Benchmark runner + dashboard (FR-13, FR-14). Runs all four strategies A–D. */
export function EvaluationView() {
  const { start, status } = useBenchmark();
  const running = status.data?.status === 'running' || start.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ViewHeading
          tag="lab / quality-benchmark"
          title="Systematic Quality Benchmark"
          note="The same ground-truth queries run under four strategies (A–D), each enabling one more pipeline layer. Comparing scores isolates what every layer — hybrid fusion, reranking, the agent — actually contributes."
        />
        <button
          type="button"
          disabled={running}
          onClick={() => {
            start.mutate(undefined);
          }}
          className="flex items-center gap-2.5 border border-accent-dim bg-elevated px-4 py-3 font-display text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
        >
          <span className="size-2 bg-accent" aria-hidden="true" />
          {running ? 'Running…' : 'Run Quality Benchmark'}
        </button>
      </div>

      {start.error instanceof ApiError && (
        <p className="font-mono text-xs text-route-fallback">{start.error.message}</p>
      )}

      {status.data?.status === 'running' && (
        <div className="flex items-center gap-3">
          <Spinner label="Benchmarking" />
          <span className="font-mono text-xs text-muted">
            {Math.round(status.data.progress * 100)}% complete
          </span>
        </div>
      )}

      {status.data?.status === 'error' && (
        <p className="font-mono text-xs text-route-fallback">
          Benchmark failed: {status.data.detail}
        </p>
      )}

      {status.data?.status === 'done' ? (
        <BenchmarkChart report={status.data.results} />
      ) : (
        !running && (
          <p className="border border-line-2 bg-surface p-6 text-center font-mono text-xs text-dim">
            Run the benchmark to compare strategies A–D and reveal the agent’s measured
            contribution.
          </p>
        )
      )}
    </div>
  );
}
