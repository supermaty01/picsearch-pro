/** Shared section heading: mono tag + title + optional note (mockup style). */
export function ViewHeading({ tag, title, note }: { tag: string; title: string; note?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-mono text-[11px] text-dim">
        <span className="size-2.5 bg-accent" aria-hidden="true" />
        {tag}
      </div>
      <h1 className="text-[27px] font-bold tracking-tight text-fg">{title}</h1>
      {note && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{note}</p>}
    </div>
  );
}
