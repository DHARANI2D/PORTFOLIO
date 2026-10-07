import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Buttons are mono, uppercase and flat: structure comes from a 1px border, not shadow.
 * - primary: the one accent fill on a page. The fill is the accent token mixed toward black so
 *   white text keeps >= 4.5:1 in the dark theme (the raw accent is ~4.2:1 against white). In
 *   forced-colors mode the fill is dropped, so it gets a visible border instead.
 * - secondary: 1px border, transparent fill.
 * - ghost: text only, for quiet controls.
 * Touch: every size reaches 44px on narrow viewports and coarse pointers.
 */
export const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border font-mono font-medium uppercase tracking-[0.12em]",
    "transition-[background-color,border-color,color] duration-200 motion-reduce:transition-none",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[color-mix(in_srgb,var(--accent)_86%,black)] text-accent-foreground hover:bg-[color-mix(in_srgb,var(--accent)_72%,black)] forced-colors:border-current",
        secondary:
          "border-border-strong bg-transparent text-foreground hover:border-muted hover:bg-surface-hover",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-surface-hover hover:text-foreground",
      },
      size: {
        sm: "min-h-9 px-3 text-[0.6875rem] max-md:min-h-11 pointer-coarse:min-h-11",
        md: "min-h-11 px-5 text-xs",
        icon: "size-9 p-0 text-xs max-md:size-11 pointer-coarse:size-11",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

const arrowClass =
  "size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none";

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Adds a trailing arrow that nudges on hover (not under reduced motion). */
    arrow?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  arrow = false,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
      {arrow ? (
        <ArrowRight
          aria-hidden
          className={cn(arrowClass, "motion-safe:group-hover/button:translate-x-0.5")}
        />
      ) : null}
    </button>
  );
}

type ButtonLinkProps = Omit<React.ComponentProps<"a">, "href"> &
  VariantProps<typeof buttonVariants> & {
    href: string;
    /** Opens in a new tab with noopener noreferrer. Defaults to true for absolute http(s) URLs. */
    external?: boolean;
    arrow?: boolean;
  };

const ABSOLUTE_HTTP = /^https?:\/\//i;
// Non-HTTP schemes and in-page anchors are plain anchors: next/link would try to route them.
const PLAIN_ANCHOR = /^(mailto:|tel:|#)/i;

export function ButtonLink({
  href,
  external,
  arrow = false,
  variant,
  size,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const isExternal = external ?? ABSOLUTE_HTTP.test(href);

  if (isExternal) {
    return (
      // target/rel come after the spread so a caller cannot weaken them.
      <a {...props} href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        {arrow ? (
          <ArrowUpRight
            aria-hidden
            className={cn(
              arrowClass,
              "motion-safe:group-hover/button:translate-x-0.5 motion-safe:group-hover/button:-translate-y-0.5",
            )}
          />
        ) : null}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  const trailing = arrow ? (
    <ArrowRight
      aria-hidden
      className={cn(arrowClass, "motion-safe:group-hover/button:translate-x-0.5")}
    />
  ) : null;

  if (PLAIN_ANCHOR.test(href)) {
    return (
      <a {...props} href={href} className={classes}>
        {children}
        {trailing}
      </a>
    );
  }

  return (
    <Link {...props} href={href} className={classes}>
      {children}
      {trailing}
    </Link>
  );
}
