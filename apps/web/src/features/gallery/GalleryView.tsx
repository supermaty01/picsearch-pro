import { Spinner } from '../../components/Spinner.js';
import { ImageCard } from './ImageCard.js';
import { UploadDropzone } from './UploadDropzone.js';
import { useGallery } from './useGallery.js';

/** Default view: upload + the indexed image grid (docs/08). */
export function GalleryView() {
  const gallery = useGallery();
  const images = gallery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <UploadDropzone />

      {gallery.isPending ? (
        <Spinner label="Loading gallery" />
      ) : gallery.isError ? (
        <p className="text-sm text-rose-600">Could not load the gallery.</p>
      ) : images.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No images yet. Upload one above, or run <code>pnpm seed</code> to load the demo dataset.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </ul>
          {gallery.hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void gallery.fetchNextPage()}
                disabled={gallery.isFetchingNextPage}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {gallery.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
