import { useState } from 'react';

import { AgentDecisionBadge } from './AgentDecisionBadge.js';

/**
 * Rendered when the agent chose `ask_for_context` (FR-7). The user's answer is
 * concatenated with the original query and re-searched (one round only — the
 * follow-up disables further clarification, docs/05 §4).
 */
export function ClarificationPrompt({
  question,
  onAnswer,
}: {
  question: string;
  onAnswer: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState('');

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-4" aria-label="Clarification">
      <AgentDecisionBadge action="ask_context" />
      <p className="mt-2 font-medium text-slate-900">{question}</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (answer.trim()) onAnswer(answer.trim());
        }}
      >
        <label className="sr-only" htmlFor="clarify-input">
          Your answer
        </label>
        <input
          id="clarify-input"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
          }}
          placeholder="Add a detail…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Refine
        </button>
      </form>
    </section>
  );
}
