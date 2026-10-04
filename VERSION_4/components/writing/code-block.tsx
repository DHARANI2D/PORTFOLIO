import { Children, cloneElement, Fragment, isValidElement, type ReactElement } from "react";
import { Label } from "@/components/ui/label";
import { InlineCode } from "@/components/writing/prose";
import { cn } from "@/lib/utils";

type PreProps = React.ComponentProps<"pre"> & {
  /** Language shown in the header bar. */
  lang?: string;
  /** What the snippet is. Shown first when present, e.g. "ILLUSTRATIVE / evidence claim". */
  title?: string;
};

/**
 * A fenced code block: a bordered frame with a header bar, and a scrollable body.
 *
 * Shiki (via @shikijs/rehype) replaces the fence with a <pre> that no longer records its language,
 * so the header says CODE unless the fence is wrapped in <CodeBlock lang="..." title="...">.
 * The <pre> keeps the classes and inline custom properties Shiki wrote (they carry the token
 * colors for both themes) and is a tab stop so a keyboard user can scroll a long line.
 */
export function Pre({ lang, title, className, children, ...props }: PreProps) {
  // The fence's <code> goes through the MDX map and arrives as InlineCode. Unwrap it so block code
  // does not pick up the inline chip styling.
  const only = Children.toArray(children)[0];
  const code = isValidElement<{ children?: React.ReactNode; className?: string }>(only)
    ? only
    : null;
  const isCode = code !== null && (code.type === InlineCode || code.type === "code");
  const inner = isCode ? code.props.children : children;
  // A fence Shiki did not highlight still carries its language as a "language-xyz" class.
  const language =
    lang ?? (isCode ? /\blanguage-([\w+-]+)/.exec(code.props.className ?? "")?.[1] : undefined);

  return (
    <figure className="mt-8 overflow-hidden rounded-lg border bg-surface">
      <figcaption className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <Label className="[overflow-wrap:anywhere]">{title ?? language ?? "code"}</Label>
        {title && language ? <Label className="shrink-0">{language}</Label> : null}
      </figcaption>
      <pre
        {...props}
        tabIndex={0}
        className={cn(
          "overflow-x-auto p-4 font-mono text-[0.8125rem] leading-6 text-foreground focus-visible:outline-offset-[-2px] md:p-6",
          className,
        )}
      >
        <code className="block w-max min-w-full">{inner}</code>
      </pre>
    </figure>
  );
}

function inject(node: React.ReactNode, extra: Pick<PreProps, "lang" | "title">): React.ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<{ children?: React.ReactNode }>(child)) return child;
    if (child.type === Pre) return cloneElement(child as ReactElement<PreProps>, extra);
    // Shiki returns a fragment around the <pre>.
    if (child.type === Fragment) return inject(child.props.children, extra);
    return child;
  });
}

/**
 * Names the language and purpose of the fenced block inside it:
 *
 *   <CodeBlock lang="json" title="ILLUSTRATIVE / evidence claim">
 *
 *   ```json
 *   { "a": 1 }
 *   ```
 *
 *   </CodeBlock>
 */
export function CodeBlock({
  lang,
  title,
  children,
}: Pick<PreProps, "lang" | "title"> & { children: React.ReactNode }) {
  return <>{inject(children, { lang, title })}</>;
}
