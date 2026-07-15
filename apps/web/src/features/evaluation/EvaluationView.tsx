import { Spinner } from '../../components/Spinner.js';
import { ApiError } from '../../lib/api.js';
import { BenchmarkChart } from './BenchmarkChart.js';
import { useBenchmark } from './useBenchmark.js';

/** Benchmark runner + dashboard (FR-13, FR-14). Runs all four strategies A–D. */
export function EvaluationView() {
  const { start, status } = useBenchmark();
  const running = status.data?.status === 'running' || start.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Systematic evaluation</h2>
        <p className="mt-1 text-sm text-slate-600">
          Runs a fixed ground-truth set against four strategies (A vector-only → D full agentic
          pipeline) and measures MRR + Recall@K. The headline is <strong>C vs D</strong>: the
          agent’s measured contribution.
        </p>
        <button
          type="button"
          disabled={running}
          onClick={() => {
            start.mutate(undefined);
          }}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run quality benchmark'}
        </button>
      </div>

      {start.error instanceof ApiError && (
        <p className="text-sm text-rose-600">{start.error.message}</p>
      )}

      {status.data?.status === 'running' && (
        <div className="flex items-center gap-3">
          <Spinner label="Benchmarking" />
          <span className="text-sm text-slate-500">
            {Math.round(status.data.progress * 100)}% complete
          </span>
        </div>
      )}

      {status.data?.status === 'error' && (
        <p className="text-sm text-rose-600">Benchmark failed: {status.data.detail}</p>
      )}

      {status.data?.status === 'done' && <BenchmarkChart report={status.data.results} />}
    </div>
  );
}
