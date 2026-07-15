import { type AgentAction } from '@picsearch/shared';

/**
 * Per-route presentation (docs/05 colors). Full literal class strings so the
 * Tailwind scanner picks them up. `text`/`border`/`borderTop`/`dot` map one
 * route color across the console UI.
 */
export interface RouteStyle {
  label: string;
  text: string;
  border: string;
  borderTop: string;
  dot: string;
  bgSoft: string;
}

export const ROUTE_STYLES: Record<AgentAction, RouteStyle> = {
  direct: {
    label: 'DIRECT',
    text: 'text-route-direct',
    border: 'border-route-direct',
    borderTop: 'border-t-route-direct',
    dot: 'bg-route-direct',
    bgSoft: 'bg-route-direct/10',
  },
  reformulate: {
    label: 'REFORMULATE',
    text: 'text-route-reformulate',
    border: 'border-route-reformulate',
    borderTop: 'border-t-route-reformulate',
    dot: 'bg-route-reformulate',
    bgSoft: 'bg-route-reformulate/10',
  },
  decompose: {
    label: 'DECOMPOSE',
    text: 'text-route-decompose',
    border: 'border-route-decompose',
    borderTop: 'border-t-route-decompose',
    dot: 'bg-route-decompose',
    bgSoft: 'bg-route-decompose/10',
  },
  ask_context: {
    label: 'ASK_CONTEXT',
    text: 'text-route-ask',
    border: 'border-route-ask',
    borderTop: 'border-t-route-ask',
    dot: 'bg-route-ask',
    bgSoft: 'bg-route-ask/10',
  },
  agent_fallback: {
    label: 'FALLBACK',
    text: 'text-route-fallback',
    border: 'border-route-fallback',
    borderTop: 'border-t-route-fallback',
    dot: 'bg-route-fallback',
    bgSoft: 'bg-route-fallback/10',
  },
};
