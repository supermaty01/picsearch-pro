/** Accessible loading indicator (console styling). */
export function Spinner({ label = 'loading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-dim" role="status">
      <span
        aria-hidden="true"
        className="size-3.5 animate-spin rounded-full border-2 border-line-3 border-t-accent"
      />
      {label}…
    </span>
  );
}
