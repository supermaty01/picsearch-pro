import { type StrategyId } from '@picsearch/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getBenchmark, startBenchmark } from '../../lib/api.js';

/**
 * Benchmark lifecycle (FR-13): start a run, then poll its status until done.
 * Polling stops automatically once the run leaves the `running` state.
 */
export function useBenchmark() {
  const [runId, setRunId] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: (strategies?: StrategyId[]) => startBenchmark(strategies),
    onSuccess: (res) => {
      setRunId(res.runId);
    },
  });

  const status = useQuery({
    queryKey: ['benchmark', runId],
    enabled: runId !== null,
    queryFn: () => {
      if (runId === null) throw new Error('no active benchmark run');
      return getBenchmark(runId);
    },
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
  });

  return { start, status, runId };
}
