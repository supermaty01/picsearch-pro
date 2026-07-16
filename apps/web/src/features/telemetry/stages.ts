import { type SearchTelemetry } from '@picsearch/shared';

/**
 * Pipeline stages of the latency waterfall, shared by the Telemetry stream and
 * the Search Studio rail so colors and labels never drift. Full literal class
 * strings so the Tailwind scanner picks them up.
 */
export interface PipelineStage {
  key: Extract<
    keyof SearchTelemetry,
    'agentDecisionMs' | 'embeddingMs' | 'vectorSearchMs' | 'rerankMs'
  >;
  label: string;
  swatch: string;
  fill: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: 'agentDecisionMs',
    label: 'Agent decision',
    swatch: 'bg-stage-agent',
    fill: 'fill-stage-agent',
  },
  { key: 'embeddingMs', label: 'Embedding', swatch: 'bg-stage-embed', fill: 'fill-stage-embed' },
  {
    key: 'vectorSearchMs',
    label: 'Vector search',
    swatch: 'bg-stage-retrieval',
    fill: 'fill-stage-retrieval',
  },
  { key: 'rerankMs', label: 'Cross-encoder', swatch: 'bg-stage-rerank', fill: 'fill-stage-rerank' },
];
