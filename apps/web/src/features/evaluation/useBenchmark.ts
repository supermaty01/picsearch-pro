import { type StrategyId } from '@picsearch/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getBenchmark, startBenchmark } from '../../lib/api.js';
import { QUERY_KEYS } from '../../lib/queryKeys.js';

/**
 * The active run id is persisted so switching away from the Evaluation tab (which
 * unmounts this hook) and back resumes polling / shows the finished report,
 * instead of silently losing the run. A run itself lives server-side.
 */
const RUN_ID_KEY = 'picsearch.benchmark.runId';

function readStoredRunId(): string | null {
  try {
    return sessionStorage.getItem(RUN_ID_KEY);
  } catch {
    return null;
  }
}

function storeRunId(runId: string | null): void {
  try {
    if (runId === null) sessionStorage.removeItem(RUN_ID_KEY);
    else sessionStorage.setItem(RUN_ID_KEY, runId);
  } catch {
    // sessionStorage unavailable (private mode) — polling still works in-session.
  }
}

/**
 * Benchmark lifecycle (FR-13): start a run, then poll its status until done.
 * Polling stops automatically once the run leaves the `running` state — including
 * when the server reports an abandoned run as failed (stale heartbeat).
 */
export function useBenchmark() {
  const [runId, setRunId] = useState<string | null>(readStoredRunId);

  const start = useMutation({
    mutationFn: (strategies?: StrategyId[]) => startBenchmark(strategies),
    onSuccess: (res) => {
      storeRunId(res.runId);
      setRunId(res.runId);
    },
  });

  const status = useQuery({
    queryKey: QUERY_KEYS.benchmark(runId),
    enabled: runId !== null,
    queryFn: () => {
      if (runId === null) throw new Error('no active benchmark run');
      return getBenchmark(runId);
    },
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
  });

  return { start, status, runId };
}
