import { type AgentAction } from '@picsearch/shared';

const STYLES: Record<AgentAction, { label: string; className: string }> = {
  direct: { label: 'Direct', className: 'bg-slate-100 text-slate-700' },
  reformulate: { label: 'Reformulated', className: 'bg-amber-100 text-amber-800' },
  decompose: { label: 'Decomposed', className: 'bg-violet-100 text-violet-800' },
  ask_context: { label: 'Clarify', className: 'bg-sky-100 text-sky-800' },
  agent_fallback: { label: 'Fallback', className: 'bg-rose-100 text-rose-800' },
};

/** Shows which route the orchestrator agent took, plus the resolved queries (FR-10). */
export function AgentDecisionBadge({
  action,
  resolvedQueries,
}: {
  action: AgentAction;
  resolvedQueries?: string[];
}) {
  const { label, className } = STYLES[action];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
        Agent: {label}
      </span>
      {resolvedQueries && resolvedQueries.length > 0 && (
        <span className="text-slate-500">
          →{' '}
          {resolvedQueries.map((q, i) => (
            <span key={`${q}-${String(i)}`}>
              {i > 0 && ' · '}
              <span className="italic text-slate-700">“{q}”</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
