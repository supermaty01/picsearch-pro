import {
  type AgentAction,
  RETRIEVAL,
  type SearchResponse,
  type SearchResultItem,
  type SearchTelemetry,
} from '@picsearch/shared';

import { formatScore } from '../../lib/format.js';
import { MetadataInspector } from '../gallery/MetadataInspector.js';
import { ClarificationPrompt } from './ClarificationPrompt.js';
import { ROUTE_STYLES } from './routeStyles.js';

interface SearchResultsProps {
  response: SearchResponse;
  onClarify: (answer: string) => void;
}

/**
 * Renders a search outcome. Switches exhaustively on the discriminated union
 * `kind` (docs/08) — the `never` default makes adding a new kind a compile error.
 */
export function SearchResults({ response, onClarify }: SearchResultsProps) {
  switch (response.kind) {
    case 'results':
      return (
        <div className="space-y-3">
          <DecisionPanel
            action={response.agent.action}
            resolvedQueries={response.agent.resolvedQueries}
            decisionMs={response.telemetry.agentDecisionMs}
          />
          <PipelineTrace
            action={response.agent.action}
            telemetry={response.telemetry}
            subQueryCount={response.agent.resolvedQueries.length}
          />
          <div className="flex flex-wrap items-start gap-4">
            <section aria-label="Search results" className="min-w-[320px] flex-[3]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-fg-2">
                  Top {response.results.length} · reranked
                </span>
                {response.telemetry.rerankSkipped && (
                  <span className="font-mono text-[11px] text-route-fallback">
                    Rerank skipped → RRF order
                  </span>
                )}
              </div>
              {response.results.length === 0 ? (
                <p className="border border-line-2 bg-surface p-6 text-center font-mono text-xs text-dim">
                  No matches found
                </p>
              ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  {response.results.map((item, i) => (
                    <ResultCard key={item.id} item={item} rank={i + 1} />
                  ))}
                </ul>
              )}
            </section>
            <div className="min-w-[280px] flex-1">
              <TelemetryRail action={response.agent.action} telemetry={response.telemetry} />
            </div>
          </div>
        </div>
      );
    case 'clarification':
      return <ClarificationPrompt question={response.question} onAnswer={onClarify} />;
    default: {
      const _exhaustive: never = response;
      return _exhaustive;
    }
  }
}

interface DecisionPanelProps {
  action: AgentAction;
  resolvedQueries: string[];
  decisionMs: number;
}

function DecisionPanel({ action, resolvedQueries, decisionMs }: DecisionPanelProps) {
  const style = ROUTE_STYLES[action];
  return (
    <div
      className={`flex flex-wrap items-stretch border border-line-2 border-t-2 bg-surface ${style.borderTop}`}
    >
      <div className="flex min-w-[210px] flex-col gap-2.5 border-r border-line px-5 py-4">
        <span className="font-mono text-[11px] text-dim">orchestrator.decide()</span>
        <span
          className={`self-start border px-3 py-1.5 font-mono text-base font-bold ${style.border} ${style.text} ${style.bgSoft}`}
        >
          {style.label}
        </span>
        <span className="font-mono text-[11px] text-dim">→ {decisionMs}ms · agent</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2.5 px-5 py-4">
        <span className="font-mono text-[11px] text-dim">
          {action === 'decompose' ? 'split into →' : 'resolved query →'}
        </span>
        <div className="flex flex-wrap gap-2">
          {resolvedQueries.map((q, i) => (
            <code
              key={`${q}-${String(i)}`}
              className="border border-line-2 bg-elevated px-2.5 py-1.5 font-mono text-xs text-accent-bright"
            >
              {q}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PipelineTraceProps {
  action: AgentAction;
  telemetry: SearchTelemetry;
  subQueryCount: number;
}

interface TraceStage {
  label: string;
  sub: string;
  ms?: number;
}

function PipelineTrace({ action, telemetry, subQueryCount }: PipelineTraceProps) {
  const stages: TraceStage[] = [
    { label: 'User query', sub: 'raw input' },
    { label: 'Orchestrator', sub: ROUTE_STYLES[action].label, ms: telemetry.agentDecisionMs },
    {
      label: subQueryCount > 1 ? `hybrid_search ×${String(subQueryCount)}` : 'hybrid_search',
      sub: `RRF · top ${String(RETRIEVAL.candidateCount)}`,
      ms: telemetry.vectorSearchMs,
    },
    {
      label: 'Cross-encoder',
      sub: telemetry.rerankSkipped
        ? 'skipped'
        : `rerank ${String(RETRIEVAL.candidateCount)}→${String(RETRIEVAL.resultCount)}`,
      ms: telemetry.rerankMs,
    },
    { label: `Top ${String(RETRIEVAL.resultCount)}`, sub: 'to UI' },
  ];

  return (
    <div className="border border-line bg-surface/50">
      <div className="border-b border-line px-4 py-2.5 font-mono text-[11px] text-dim">
        execution_trace
      </div>
      <div className="flex flex-wrap items-center gap-y-3 p-4">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center">
            {i > 0 && <span className="h-px w-5 flex-none bg-line-3" aria-hidden="true" />}
            <div className="min-w-[120px] border border-line-2 bg-elevated px-3 py-2.5">
              <div className="text-[12.5px] font-semibold text-fg-2">{s.label}</div>
              <div className="mt-1 font-mono text-[10.5px] text-muted">{s.sub}</div>
              {s.ms !== undefined && (
                <div className="mt-1 font-mono text-[10.5px] text-faint">{s.ms}ms</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ResultCardProps {
  item: SearchResultItem;
  rank: number;
}

function ResultCard({ item, rank }: ResultCardProps) {
  return (
    <li className="overflow-hidden border border-line-2 bg-surface">
      <div className="relative">
        <img
          src={item.imageUrl}
          alt={item.metadata.scene_description}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
        <span className="absolute left-0 top-0 bg-accent px-2 py-1 font-mono text-[11px] font-semibold text-ink">
          #{rank}
        </span>
        <span
          title="Cross-encoder relevance (RRF score when rerank is skipped)"
          className="absolute right-0 top-0 bg-bg px-2 py-1 font-mono text-[11px] font-semibold text-fg-2"
        >
          {formatScore(item.score)}
        </span>
      </div>
      <div className="border-t border-line p-3">
        <p className="line-clamp-2 text-[13px] leading-snug text-fg-2">
          {item.metadata.scene_description}
        </p>
        <div className="mt-2 font-mono text-[10px] text-muted">{item.metadata.location_type}</div>
        <MetadataInspector metadata={item.metadata} />
      </div>
    </li>
  );
}

interface RailStage {
  key: keyof SearchTelemetry;
  label: string;
  fill: string;
  swatch: string;
}

const RAIL_STAGES: RailStage[] = [
  { key: 'agentDecisionMs', label: 'Agent decision', fill: 'fill-accent', swatch: 'bg-accent' },
  { key: 'embeddingMs', label: 'Embedding', fill: 'fill-faint', swatch: 'bg-faint' },
  {
    key: 'vectorSearchMs',
    label: 'Vector search',
    fill: 'fill-accent-dim',
    swatch: 'bg-accent-dim',
  },
  { key: 'rerankMs', label: 'Cross-encoder', fill: 'fill-pos', swatch: 'bg-pos' },
];

interface TelemetryRailProps {
  action: AgentAction;
  telemetry: SearchTelemetry;
}

function TelemetryRail({ action, telemetry }: TelemetryRailProps) {
  const total = Math.max(telemetry.executionTimeMs, 1);
  let x = 0;
  return (
    <div className="border border-line-2 bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-mono text-[11px] text-dim">telemetry.total</span>
        <span className="text-lg font-bold text-fg-2">
          {telemetry.executionTimeMs}
          <span className="font-mono text-[11px] font-normal text-dim">ms</span>
        </span>
      </div>
      <div className="p-4">
        <svg
          viewBox="0 0 100 4"
          preserveAspectRatio="none"
          className="mb-3.5 h-2.5 w-full bg-elevated"
          role="img"
          aria-label={`Latency breakdown, total ${String(telemetry.executionTimeMs)} ms`}
        >
          {RAIL_STAGES.map((s) => {
            const ms = telemetry[s.key];
            const width = ((typeof ms === 'number' ? ms : 0) / total) * 100;
            const rect = (
              <rect key={s.label} x={x} y={0} width={width} height={4} className={s.fill} />
            );
            x += width;
            return rect;
          })}
        </svg>
        <div className="flex flex-col gap-2.5">
          {RAIL_STAGES.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <span className={`size-2.5 ${s.swatch}`} aria-hidden="true" />
              <span className="flex-1 text-[12.5px] text-body">{s.label}</span>
              <span className="font-mono text-xs text-muted">
                {typeof telemetry[s.key] === 'number' ? telemetry[s.key] : 0}ms
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex border-t border-line">
        <div className="flex-1 border-r border-line px-4 py-3">
          <div className="font-mono text-[10px] text-dim">route</div>
          <div className={`mt-1 font-mono text-[13px] font-semibold ${ROUTE_STYLES[action].text}`}>
            {ROUTE_STYLES[action].label}
          </div>
        </div>
        <div className="flex-[1.4] px-4 py-3">
          <div className="font-mono text-[10px] text-dim">provider</div>
          <div className="mt-1 text-[12.5px] text-body">workers-ai</div>
        </div>
      </div>
    </div>
  );
}
