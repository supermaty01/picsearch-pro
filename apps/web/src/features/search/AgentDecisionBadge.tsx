import { type AgentAction } from '@picsearch/shared';

import { ROUTE_STYLES } from './routeStyles.js';

/** Compact route pill: colored dot + uppercase mono label (FR-10). */
export function AgentDecisionBadge({ action }: { action: AgentAction }) {
  const style = ROUTE_STYLES[action];
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[11px] font-semibold ${style.border} ${style.text} ${style.bgSoft}`}
    >
      <span className={`size-1.5 ${style.dot}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}
