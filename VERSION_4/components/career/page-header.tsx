import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Entrance as an enhancement (CSS @starting-style): no JS, once, off under reduced motion.
 * Applied to supporting copy, never to the h1 (it is the LCP element).
 */
export const rise =
  "transition-[opacity,translate] duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

type PageHeaderProps = {
  /** Id of the h1, which labels the section. */
  id: string;
  /** Two-digit index, only for pages that match a numbered section of the home page. */
  index?: string;
  /** Mono eyebrow above the title, e.g. "EXPERIENCE". Not used by the "eyebrow" title style. */
  label?: string;
  /** The page's single h1. */
  title: string;
  /**
   * "display": large title under a mono eyebrow (default).
   * "eyebrow": the h1 itself is the small mono label. For pages whose visual headline is the first
   * block below the header (/contact), so two display headings never stack.
   */
  titleStyle?: "display" | "eyebrow";
  /** Right-hand column on wide screens, below the text on narrow ones. */
  aside?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/** Shared page header for the secondary pages: eyebrow, one h1, optional intro and aside. */
export function PageHeader({
  id,
  index,
  label,
  title,
  titleStyle = "display",
  aside,
  className,
  children,
}: PageHeaderProps) {
  const eyebrow = titleStyle === "eyebrow";

  return (
    <section aria-labelledby={id} className={className}>
      <Container
        className={cn(
          "grid gap-12",
          eyebrow ? "pt-12 pb-8 md:pt-24 md:pb-12" : "pt-12 pb-16 md:pt-24 md:pb-24",
          aside ? "lg:grid-cols-12 lg:gap-x-6" : "",
        )}
      >
        <div className={aside ? "lg:col-span-8" : undefined}>
          {eyebrow ? (
            <h1 id={id} className="label-mono text-muted">
              {/* The index is decoration: the page's name is just the title. */}
              {index ? (
                <span aria-hidden>
                  <span className="text-accent">{index}</span> /{" "}
                </span>
              ) : null}
              {title}
            </h1>
          ) : (
            <>
              <Label className="block">
                {index ? <span className="text-accent">{index}</span> : null}
                {index ? " / " : null}
                {label}
              </Label>
              <h1
                id={id}
                className="mt-8 max-w-[14ch] text-4xl display break-words xs:text-5xl md:text-7xl xl:text-8xl"
              >
                {title}
              </h1>
            </>
          )}
          {children}
        </div>
        {aside ? <div className="lg:col-span-3 lg:col-start-10">{aside}</div> : null}
      </Container>
    </section>
  );
}
