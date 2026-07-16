import { Spinner } from '../../components/Spinner.js';
import { ViewHeading } from '../../components/ViewHeading.js';
import { ImageCard } from './ImageCard.js';
import { UploadDropzone } from './UploadDropzone.js';
import { useGallery } from './useGallery.js';

/** Default gallery view: upload + the indexed image grid (docs/08). */
export function GalleryView() {
  const gallery = useGallery();
  const images = gallery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-5">
      <ViewHeading
        tag="gallery / indexed-corpus"
        title="Image Gallery"
        note="Every image is analyzed by the vision model and stored with its embedding + tsvector"
      />
      <UploadDropzone />

      {gallery.isPending ? (
        <Spinner label="Loading gallery" />
      ) : gallery.isError ? (
        <p className="font-mono text-xs text-route-fallback">Could not load the gallery.</p>
      ) : images.length === 0 ? (
        <p className="border border-line-2 bg-surface p-6 text-center font-mono text-xs text-dim">
          No images yet. Upload one above, or run <span className="text-accent">pnpm seed</span> to
          load the demo dataset.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                className="border border-line-2 bg-surface px-4 py-2 font-mono text-xs text-body hover:bg-elevated disabled:opacity-50"
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
