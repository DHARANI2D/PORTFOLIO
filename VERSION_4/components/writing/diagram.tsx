import { Label } from "@/components/ui/label";
import { textOf } from "@/components/writing/headings";

/**
 * A text diagram in a bordered figure. The art is pre-formatted ASCII (plain ASCII, so columns line
 * up in any monospace font). It is hidden from assistive technology and replaced by `alt`, which
 * must say what the diagram shows in words, because a screen reader would otherwise read it out as
 * a string of punctuation.
 *
 * The body scrolls inside the figure and is a tab stop, so a wide diagram never widens the page.
 * Pass the art as a template literal so MDX does not parse it as markdown:
 *
 *   <Diagram alt="..." caption="...">{`
 *   a -> b
 *   `}</Diagram>
 */
export function Diagram({
  alt,
  caption,
  label = "diagram",
  children,
}: {
  alt: string;
  caption?: string;
  label?: string;
  children: React.ReactNode;
}) {
  // Drop the blank line after the opening backtick and before the closing one, keep indentation.
  const art = textOf(children)
    .replace(/^\s*\n/, "")
    .replace(/\s+$/, "");

  return (
    <figure className="mt-8 overflow-hidden rounded-lg border bg-surface">
      <div className="border-b px-4 py-3">
        <Label>{label}</Label>
      </div>
      <div
        role="img"
        aria-label={alt}
        tabIndex={0}
        className="overflow-x-auto p-4 focus-visible:outline-offset-[-2px] md:p-6"
      >
        <pre
          aria-hidden="true"
          className="w-max font-mono text-xs leading-5 text-foreground md:text-[0.8125rem]"
        >
          {art}
        </pre>
      </div>
      {caption ? (
        <figcaption className="border-t px-4 py-3 text-sm text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** Any other figure: a bordered frame around its children with an optional caption underneath. */
export function Figure({ caption, children }: { caption?: string; children: React.ReactNode }) {
  return (
    <figure className="mt-8">
      <div className="overflow-hidden rounded-lg border">{children}</div>
      {caption ? <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption> : null}
    </figure>
  );
}
