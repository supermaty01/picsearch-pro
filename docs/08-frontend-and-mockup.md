# Frontend Structure & Mockup

## 1. Mockup status

A visual mockup exists in Claude Design: **`PicSearch Pro.dc.html`**
(`https://claude.ai/design/p/0e9f7748-b3ab-4bad-9cbc-555f93c81d7a`).

> **Pending:** the exported `.dc.html` file will be added to [`/design`](../design/) in a follow-up session. Until then, this doc defines structure and behavior; visual tokens (colors, spacing, typography) will be extracted from the mockup into the Tailwind `@theme` block in `apps/web/src/index.css` when it lands.

**Import checklist when the file arrives:**

1. Place the file at `design/PicSearch-Pro.dc.html` (committed — it's a design source).
2. Extract design tokens → `@theme` variables (Tailwind v4 CSS-first; do NOT create `tailwind.config.js`).
3. Map mockup sections to the component tree below; note divergences here.
4. Reuse mockup markup semantics, but rebuild as React components — no copy-paste of generated HTML.

## 2. Page structure (SPA, single route + panels)

```
<App>
 ├─ <Header/>                     brand + nav (Overview · Search · Gallery · Evaluation · Telemetry)
 ├─ <OverviewView/>               default view: explains the pipeline, agent routes, stack
 ├─ <SearchBar/>                  query input, submit state, clarification follow-up mode
 ├─ <SearchProgress/>             animated pipeline stages while a search is in flight
 ├─ <GalleryView/>
 │   ├─ <UploadDropzone/>         FR-1, progress + per-stage status
 │   └─ <ImageGrid/> → <ImageCard/> → <MetadataInspector/>  (JSON viewer, FR-12)
 ├─ <SearchResults/>              top-5 cards with scores; <AgentDecisionBadge/> (route taken)
 │   └─ <ClarificationPrompt/>    rendered when kind === "clarification"
 ├─ <TelemetryPanel/>             latency waterfall per stage (FR-12)
 └─ <EvaluationView/>             benchmark runner + <BenchmarkChart/> (A–D, C vs D highlight,
                                  metric legend + per-strategy layer chips)
```

## 3. Frontend conventions

- **State:** TanStack Query for all server state (uploads, search, benchmark polling); no global client-state library — local state + URL params suffice.
- **API client:** thin typed wrapper in `src/lib/api.ts`; response types inferred from `@picsearch/shared` Zod schemas — the UI cannot drift from the contract.
- **Exhaustive unions:** `SearchResponse.kind` switched with a `never` check.
- **Styling:** Tailwind v4 utilities only; design tokens via `@theme`; no inline styles; no CSS modules.
- **A11y (NFR-10):** semantic landmarks, labeled controls, focus management after search, `alt` = `scene_description`.
