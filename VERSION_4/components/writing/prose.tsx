import Link from "next/link";
import { slugify, textOf } from "@/components/writing/headings";
import { cn } from "@/lib/utils";

/**
 * Typography for MDX field notes: documentation-like, tokens only. Each export is one element that
 * mdx-components.tsx maps in. Server components, no state.
 *
 * Margins are top-only (`mt-*`) and the first child of the note body resets to zero, so a note
 * never opens with a gap. Spacing stays on the 8/12/16/24/32/48/64/96 scale.
 */

const bodyText = "text-base leading-7 text-foreground/90 md:text-[1.0625rem] md:leading-8";

/** Wraps rendered MDX. Starts the section counter that numbers each h2 as "01", "02", ... */
export function NoteBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[44rem] min-w-0 [counter-reset:note-section] [&>:first-child]:mt-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function HeadingAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <a href={`#${id}`} className="group/anchor text-inherit no-underline">
      {children}
      <span
        aria-hidden
        className="ml-3 font-mono text-muted opacity-0 transition-opacity duration-200 group-hover/anchor:opacity-100 group-focus-visible/anchor:opacity-100 motion-reduce:transition-none"
      >
        #
      </span>
    </a>
  );
}

/** The id comes from the heading text (see headings.ts), so the table of contents can link to it. */
export function H2({ children, className, id, ...props }: React.ComponentProps<"h2">) {
  const anchor = id ?? slugify(textOf(children));
  return (
    <h2
      id={anchor || undefined}
      className={cn(
        "mt-16 border-t pt-8 text-3xl headline md:mt-24 md:text-4xl",
        "[&:first-child]:border-t-0 [&:first-child]:pt-0",
        "[counter-increment:note-section] before:mb-3 before:block before:label-mono before:text-accent before:content-[counter(note-section,decimal-leading-zero)]",
        className,
      )}
      {...props}
    >
      {anchor ? <HeadingAnchor id={anchor}>{children}</HeadingAnchor> : children}
    </h2>
  );
}

export function H3({ children, className, id, ...props }: React.ComponentProps<"h3">) {
  const anchor = id ?? slugify(textOf(children));
  return (
    <h3
      id={anchor || undefined}
      className={cn("mt-12 text-xl headline md:text-2xl", className)}
      {...props}
    >
      {anchor ? <HeadingAnchor id={anchor}>{children}</HeadingAnchor> : children}
    </h3>
  );
}

/**
 * A note's h1 is the page title, rendered by the page. A stray `#` in a note becomes a second
 * level heading so the page keeps exactly one h1.
 */
export function H1(props: React.ComponentProps<"h2">) {
  return <H2 {...props} />;
}

export function Paragraph({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-6", bodyText, className)} {...props} />;
}

export function UnorderedList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("mt-6 list-disc space-y-3 pl-6 marker:text-muted", bodyText, className)}
      {...props}
    />
  );
}

export function OrderedList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "mt-6 list-decimal space-y-3 pl-6 marker:font-mono marker:text-muted",
        bodyText,
        className,
      )}
      {...props}
    />
  );
}

export function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("pl-1", className)} {...props} />;
}

export function Strong({ className, ...props }: React.ComponentProps<"strong">) {
  return <strong className={cn("font-medium text-foreground", className)} {...props} />;
}

export function Blockquote({ className, ...props }: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      className={cn(
        "mt-8 border-l border-border-strong pl-6 [&>p]:text-muted [&>p:first-child]:mt-0",
        className,
      )}
      {...props}
    />
  );
}

export function Rule({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("my-16 border-0 border-t", className)} {...props} />;
}

/** Inline code chip. Block code is handled by Pre (code-block.tsx), which unwraps this. */
export function InlineCode({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      className={cn(
        "rounded-sm border bg-surface px-1.5 py-0.5 font-mono text-[0.875em] [overflow-wrap:anywhere] text-foreground",
        className,
      )}
      {...props}
    />
  );
}

const underline =
  "text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none";

/**
 * Links. Only http(s), mailto, same-site paths and in-page anchors become links; anything else
 * (javascript:, data:, ...) renders as plain text, so a note can never ship a script URL.
 */
export function Anchor({ href = "", children, className, ...props }: React.ComponentProps<"a">) {
  const classes = cn(underline, className);

  if (href.startsWith("#") || /^(mailto:|tel:)/i.test(href)) {
    return (
      <a {...props} href={href} className={classes}>
        {children}
      </a>
    );
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      // target and rel come after the spread so a caller cannot weaken them.
      <a {...props} href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link {...props} href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <span>{children}</span>;
}

/** Tables scroll inside their own focusable region, so a wide table never widens the page. */
export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      role="region"
      aria-label="Scrollable table"
      tabIndex={0}
      className="mt-8 overflow-x-auto rounded-lg border focus-visible:outline-offset-[-2px]"
    >
      <table
        className={cn("w-full min-w-[32rem] border-collapse text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("border-b bg-surface px-4 py-3 label-mono font-normal text-muted", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("border-t px-4 py-3 align-top leading-6 text-foreground/90", className)}
      {...props}
    />
  );
}

/** Markdown images. The note owner supplies width and height so nothing shifts while loading. */
export function Img({ alt = "", className, ...props }: React.ComponentProps<"img">) {
  return (
    // Static export with unoptimized images: a plain <img> is the intended element.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("mt-8 h-auto max-w-full rounded-lg border", className)}
      {...props}
    />
  );
}
