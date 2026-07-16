import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { listImages, uploadImage } from '../../lib/api.js';
import { QUERY_KEYS } from '../../lib/queryKeys.js';

/** Paginated gallery listing, newest first (FR-12). */
export function useGallery() {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.images,
    queryFn: ({ pageParam }) => listImages(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

/** Upload mutation (FR-1); refreshes the gallery on success. */
export function useUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadImage(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.images }),
  });
}
