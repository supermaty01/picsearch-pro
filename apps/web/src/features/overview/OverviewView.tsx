import { MODELS, RETRIEVAL } from '@picsearch/shared';

import { type TabId } from '../../components/Header.js';
import { ViewHeading } from '../../components/ViewHeading.js';
import { ROUTE_STYLES } from '../search/routeStyles.js';

interface OverviewViewProps {
  onNavigate: (tab: TabId) => void;
}

/**
 * Landing view: explains what the engine does and how a query flows through it,
 * so a visitor understands the architecture before touching the console.
 */
export function OverviewView({ onNavigate }: OverviewViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ViewHeading
          tag="overview / how-it-works"
          title="Semantic Image Search, Measured"
          note="An agent routes every query into a hybrid retrieval pipeline — vector + full-text fused with RRF, then reranked by a cross-encoder — and an evaluation framework proves what each layer contributes."
        />
        <button
          type="button"
          onClick={() => {
            onNavigate('search');
          }}
          className="border border-accent-dim bg-accent px-5 py-3 font-display text-sm font-bold text-ink transition hover:bg-accent-bright"
        >
          Try a search →
        </button>
      </div>

      <QueryFlow />

      <div className="grid gap-3 lg:grid-cols-2">
        <IngestionFlow />
        <AgentRoutes />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Resilience />
        <Evaluation onNavigate={onNavigate} />
      </div>

      <Glossary />

      <StackStrip />
    </div>
  );
}

const QUERY_STAGES = [
  {
    step: '01',
    title: 'Orchestrator agent',
    body: `A small LLM classifies the query and picks a route: pass it through, clean it up, split it into up to ${String(RETRIEVAL.maxSubQueries)} sub-queries, or ask you a clarifying question.`,
  },
  {
    step: '02',
    title: 'Embedding',
    body: 'Each resolved query becomes a 384-dimension vector with the same model that indexed the images.',
  },
  {
    step: '03',
    title: 'Hybrid search',
    body: `One SQL function runs vector similarity (pgvector, HNSW) and keyword full-text search (GIN) in parallel and fuses both rankings with Reciprocal Rank Fusion — the top ${String(RETRIEVAL.candidateCount)} candidates come back.`,
  },
  {
    step: '04',
    title: 'Cross-encoder rerank',
    body: `A cross-encoder rescores every (query, description) pair jointly — far more precise than vector distance — and keeps the top ${String(RETRIEVAL.resultCount)}.`,
  },
  {
    step: '05',
    title: 'Results + telemetry',
    body: 'You get the ranked images plus the full execution trace: the route taken, per-stage latency, and tokens spent.',
  },
];

function QueryFlow() {
  return (
    <section className="border border-line-2 bg-surface" aria-label="Query pipeline">
      <div className="border-b border-line px-5 py-3 font-mono text-[11px] text-dim">
        query.pipeline() · what happens when you press Search
      </div>
      <ol className="grid gap-px bg-line md:grid-cols-5">
        {QUERY_STAGES.map((stage) => (
          <li key={stage.step} className="bg-surface p-4">
            <div className="font-mono text-[11px] text-accent">{stage.step}</div>
            <div className="mt-1.5 text-sm font-semibold text-fg-2">{stage.title}</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{stage.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const INGEST_STAGES = [
  {
    title: 'Vision analysis',
    body: 'A vision model extracts structured metadata: scene, objects, colors, mood, visible text, keywords.',
  },
  {
    title: 'Dense context',
    body: 'The metadata is normalized into one high-density paragraph — the only text the search engine ever matches against.',
  },
  {
    title: 'Embedding + index',
    body: 'That paragraph is embedded and stored in Postgres next to a full-text tsvector, ready for hybrid retrieval.',
  },
];

function IngestionFlow() {
  return (
    <section className="border border-line-2 bg-surface" aria-label="Ingestion pipeline">
      <div className="border-b border-line px-5 py-3 font-mono text-[11px] text-dim">
        ingest.pipeline() · how an image becomes searchable
      </div>
      <div className="space-y-4 p-5">
        {INGEST_STAGES.map((stage, i) => (
          <div key={stage.title} className="flex gap-3.5">
            <span
              className="grid size-6 flex-none place-items-center border border-line-3 bg-elevated font-mono text-[11px] text-accent"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <div className="text-sm font-semibold text-fg-2">{stage.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{stage.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const ROUTE_EXPLANATIONS = [
  { action: 'direct', text: 'The query is clear — search it unchanged.' },
  { action: 'reformulate', text: 'Typos or slang — rewrite into a clean query first.' },
  { action: 'decompose', text: 'Two ideas in one query — split, search both, merge.' },
  { action: 'ask_context', text: 'Too vague to search — ask one clarifying question.' },
  { action: 'agent_fallback', text: 'Agent failed or timed out — degrade to a direct search.' },
] as const;

function AgentRoutes() {
  return (
    <section className="border border-line-2 bg-surface" aria-label="Agent routes">
      <div className="border-b border-line px-5 py-3 font-mono text-[11px] text-dim">
        orchestrator.routes · every query takes exactly one
      </div>
      <ul className="space-y-3 p-5">
        {ROUTE_EXPLANATIONS.map(({ action, text }) => {
          const style = ROUTE_STYLES[action];
          return (
            <li key={action} className="flex items-center gap-3">
              <span
                className={`inline-flex w-32 flex-none items-center gap-2 border px-2 py-1 font-mono text-[10.5px] font-semibold ${style.border} ${style.text} ${style.bgSoft}`}
              >
                <span className={`size-1.5 ${style.dot}`} aria-hidden="true" />
                {style.label}
              </span>
              <span className="text-[12.5px] leading-snug text-muted">{text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Resilience() {
  return (
    <section className="border border-line-2 border-l-2 border-l-route-fallback bg-surface p-5">
      <div className="font-mono text-[11px] text-dim">degradation.ladder</div>
      <h2 className="mt-2 text-base font-bold text-fg-2">Optional layers fail soft</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        A search never fails because a smart layer did. If the agent times out or answers nonsense,
        the raw query goes straight to retrieval and the result is flagged{' '}
        <span className="font-mono text-route-fallback">FALLBACK</span>. If the reranker fails, the
        RRF order ships as-is with a visible “rerank skipped” marker. Every degradation is honest
        and observable in the telemetry.
      </p>
    </section>
  );
}

function Evaluation({ onNavigate }: OverviewViewProps) {
  return (
    <section className="border border-line-2 border-l-2 border-l-accent bg-surface p-5">
      <div className="font-mono text-[11px] text-dim">evaluation.lab</div>
      <h2 className="mt-2 text-base font-bold text-fg-2">Every layer earns its place</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Four strategies run the same ground-truth queries with layers switched on one at a time —
        vector only, hybrid, hybrid + rerank, and the full agentic pipeline. MRR and Recall@K
        quantify what each layer adds; the C→D delta isolates the agent’s real contribution.
      </p>
      <button
        type="button"
        onClick={() => {
          onNavigate('evaluation');
        }}
        className="mt-4 border border-accent-dim bg-elevated px-4 py-2 font-display text-sm font-semibold text-accent transition hover:bg-accent/10"
      >
        Open the Evaluation Lab →
      </button>
    </section>
  );
}

const GLOSSARY: { term: string; definition: string }[] = [
  {
    term: 'Embedding',
    definition:
      'A text (or image description) converted into a vector of numbers — here 384 of them — where similar meanings land close together. Searching = comparing distances between vectors.',
  },
  {
    term: 'Vector similarity',
    definition:
      'How close two embeddings are, measured with cosine distance. "Beach at sunset" and "shore at golden hour" score high even though they share almost no words.',
  },
  {
    term: 'pgvector · HNSW',
    definition:
      'The Postgres extension that stores embeddings and searches them. HNSW is its index structure — an approximate-nearest-neighbor graph that makes vector search fast at scale.',
  },
  {
    term: 'Full-text search (FTS)',
    definition:
      'Classic keyword matching inside Postgres (tsvector + GIN index). Great at exact terms like brand names or visible text that vector search can blur over.',
  },
  {
    term: 'Hybrid search',
    definition:
      'Running vector similarity and full-text search in parallel over the same corpus and merging both rankings — each side catches what the other misses.',
  },
  {
    term: 'RRF (Reciprocal Rank Fusion)',
    definition:
      'The merge formula for hybrid search: each result contributes weight / (k + rank) per list it appears in (k=60 here). Rewards agreement between rankers without having to normalize their scores.',
  },
  {
    term: 'top_k / candidates',
    definition:
      'How many results a stage keeps. Retrieval returns the top 15 candidates; the reranker narrows them to the final top 5. Bigger k = better recall, more work downstream.',
  },
  {
    term: 'Cross-encoder',
    definition:
      'A model that reads the query and a document together and scores their relevance jointly. Far more precise than comparing two independent embeddings (a bi-encoder), but too slow to run over the whole corpus — so it only rescores the shortlist.',
  },
  {
    term: 'Reranking',
    definition:
      'The second-pass reordering of retrieval candidates by the cross-encoder. Retrieval optimizes for not missing anything; reranking optimizes for putting the best match first.',
  },
  {
    term: 'Dense context',
    definition:
      'The single high-density paragraph built from an image’s structured metadata. It is the only text that gets embedded and searched — the image itself is never compared directly.',
  },
  {
    term: 'Structured metadata',
    definition:
      'The JSON a vision model extracts from each image (scene, objects, colors, visible text, keywords), validated against a schema before anything is stored.',
  },
  {
    term: 'Orchestrator agent',
    definition:
      'A small LLM that routes each query before retrieval: pass it through, rewrite it, split it into sub-queries, or ask a clarifying question — via function calling with validated arguments.',
  },
  {
    term: 'MRR (Mean Reciprocal Rank)',
    definition:
      'Evaluation metric: 1 / position of the first correct result, averaged over queries. 1.0 means the right image always came first; 0.5 means it averaged second place.',
  },
  {
    term: 'Recall@K',
    definition:
      'Evaluation metric: the fraction of queries whose correct image appears anywhere in the top K results — did the pipeline find it at all, regardless of position.',
  },
  {
    term: 'Ground truth',
    definition:
      'The hand-labeled query → correct-image pairs the evaluation runs against. Without it, "better search" is just an opinion.',
  },
];

function Glossary() {
  return (
    <section className="border border-line-2 bg-surface" aria-label="Glossary">
      <div className="border-b border-line px-5 py-3 font-mono text-[11px] text-dim">
        glossary · the terms this console keeps using
      </div>
      <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {GLOSSARY.map((entry) => (
          <div key={entry.term} className="bg-surface p-4">
            <dt className="font-mono text-[12.5px] font-semibold text-accent">{entry.term}</dt>
            <dd className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const STACK = [
  { label: 'Vision', value: MODELS.vision },
  { label: 'Embeddings', value: `${MODELS.embedding} · 384-dim` },
  { label: 'Agent', value: MODELS.agent },
  { label: 'Reranker', value: MODELS.reranker },
  { label: 'Retrieval', value: 'Supabase Postgres · pgvector HNSW + FTS GIN · RRF in SQL' },
  { label: 'Runtime', value: 'Hono on Cloudflare Workers · React 19 + Vite · Tailwind v4' },
];

function StackStrip() {
  return (
    <section className="border border-line-2 bg-surface" aria-label="Stack">
      <div className="border-b border-line px-5 py-3 font-mono text-[11px] text-dim">
        stack · all inference on Workers AI behind AI Gateway
      </div>
      <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {STACK.map((item) => (
          <div key={item.label} className="bg-surface px-4 py-3.5">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-dim">{item.label}</dt>
            <dd className="mt-1 break-words font-mono text-xs text-body">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
