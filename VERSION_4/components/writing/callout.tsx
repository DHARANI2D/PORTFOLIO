import { cn } from "@/lib/utils";

const KINDS = {
  // A dot marks the problem statement. Shape and word carry the meaning, never color alone.
  problem: { label: "PROBLEM", dot: true, dashed: false },
  // Dashed borders are the site's trust-boundary motif (see the architecture diagrams).
  threat: { label: "THREAT", dot: false, dashed: true },
  note: { label: "NOTE", dot: false, dashed: false },
} as const;

export type CalloutType = keyof typeof KINDS;

/**
 * A short boxed aside inside a note. Put a blank line after the opening tag and before the closing
 * tag in MDX so the body is parsed as markdown:
 *
 *   <Callout type="threat">
 *
 *   Fields in a log are written by whoever caused the event.
 *
 *   </Callout>
 */
export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}) {
  const kind = Object.hasOwn(KINDS, type) ? KINDS[type] : KINDS.note;

  return (
    <div
      role="note"
      className={cn(
        "mt-8 rounded-lg border bg-surface p-6",
        kind.dashed && "border-dashed border-border-strong",
      )}
    >
      <p className="flex items-center gap-3 label-mono text-foreground">
        {kind.dot ? (
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
        ) : null}
        <span>{kind.label}</span>
        {title ? <span className="text-muted">/ {title}</span> : null}
      </p>
      <div className="mt-3 text-base leading-7 text-foreground/90 [&>p]:mt-3 [&>p:first-child]:mt-0">
        {children}
      </div>
    </div>
  );
}
