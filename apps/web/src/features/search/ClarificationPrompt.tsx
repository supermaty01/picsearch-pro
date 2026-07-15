import { useState } from 'react';

/**
 * Rendered when the agent chose `ask_for_context` (FR-7). The answer is
 * concatenated with the original query and re-searched (one round, docs/05 §4).
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
    <section
      className="border border-line-2 border-t-2 border-t-route-ask bg-surface"
      aria-label="Clarification"
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span
          className="grid size-9 place-items-center border border-line-2 bg-elevated"
          aria-hidden="true"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-route-ask"
          >
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </span>
        <div>
          <div className="text-base font-bold text-fg-2">The agent paused to ask a question</div>
          <div className="font-mono text-[11px] text-muted">
            query too vague to retrieve precisely — no search spent
          </div>
        </div>
      </div>
      <div className="px-5 py-5">
        <p className="mb-4 text-sm leading-relaxed text-body">{question}</p>
        <form
          className="flex gap-2"
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
            placeholder="add a detail…"
            className="flex-1 border border-line-2 bg-elevated px-3 py-2 text-sm text-fg placeholder:text-dim focus:border-route-ask focus:outline-none"
          />
          <button
            type="submit"
            className="border border-accent-dim bg-accent px-4 font-display text-sm font-bold text-[#05130c] hover:bg-accent-bright"
          >
            Refine
          </button>
        </form>
      </div>
    </section>
  );
}
