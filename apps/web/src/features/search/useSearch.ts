import { useMutation, useQueryClient } from '@tanstack/react-query';

import { search } from '../../lib/api.js';
import { QUERY_KEYS } from '../../lib/queryKeys.js';

/** Search mutation (FR-6). Refreshes telemetry on success so the panel stays live. */
export function useSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (query: string) => search(query),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.telemetry }),
  });
}
