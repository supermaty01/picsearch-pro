/**
 * Application shell (Phase 0). Feature views land in later phases:
 * GalleryView (Phase 2/4), SearchResults (Phase 3/4), EvaluationView (Phase 5).
 * Component tree contract: docs/08-frontend-and-mockup.md.
 */
export function App() {
  return (
    <div className="min-h-screen bg-brand-50 font-display text-brand-900">
      <header className="border-b border-brand-500/20 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">PicSearch Pro</h1>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-lg">
          Image semantic search with hybrid retrieval, an orchestrator agent, cross-encoder
          reranking — and the metrics to prove every layer earns its place.
        </p>
        <p className="mt-4 text-sm opacity-70">
          Phase 0 scaffold. See <code>docs/07-implementation-plan.md</code> for what ships next.
        </p>
      </main>
    </div>
  );
}
