import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Either an explicit number, or a CSS-counter number. Never both. */
type Numbering =
  | {
      /** Two-digit section number, e.g. "02". */
      index: string;
      autoNumber?: false;
    }
  | {
      /**
       * Number the section with the `ds-section` CSS counter (see app/globals.css) instead of an
       * explicit `index`. Sections hidden with display: none do not count, so the numbers stay
       * continuous when the recruiter view hides some of them. Default false: `index` is printed.
       */
      autoNumber: true;
      index?: undefined;
    };

type SectionProps = Numbering & {
  id: string;
  /** Mono label next to the number, e.g. "SYSTEMS". */
  label: string;
  /** Large headline. Rendered as the section's <h2>. */
  title?: React.ReactNode;
  /** Optional supporting paragraph under the headline. */
  intro?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/** Numbered technical-document section: "02 / SYSTEMS" + headline + body. */
export function Section({
  id,
  index,
  autoNumber = false,
  label,
  title,
  intro,
  className,
  children,
}: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        "border-t py-12 md:py-16",
        // `ds-section` is the shared hook (app/globals.css may also style it). The increment is
        // repeated here so the numbers never depend on a stylesheet rule being present.
        autoNumber && "ds-section [counter-increment:ds-section]",
        className,
      )}
    >
      <Container>
        <div className="grid gap-x-10 gap-y-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Label className="mb-5 flex items-center gap-3 before:h-px before:w-8 before:bg-accent before:content-['']">
              {autoNumber ? (
                <>
                  <span aria-hidden>
                    <span className="ds-section-number text-accent before:content-[counter(ds-section,decimal-leading-zero)]" />{" "}
                    /{" "}
                  </span>
                  {label}
                </>
              ) : (
                <>
                  <span className="text-accent">{index}</span> / {label}
                </>
              )}
            </Label>
            {title ? (
              <h2 id={headingId} className="max-w-[20ch] text-3xl headline md:text-4xl">
                {title}
              </h2>
            ) : null}
          </div>
          {intro ? (
            <p className="max-w-xl text-base text-muted md:text-lg lg:col-span-5 lg:pb-1">
              {intro}
            </p>
          ) : null}
        </div>
        {children ? <div className={title || intro ? "mt-10 md:mt-12" : ""}>{children}</div> : null}
      </Container>
    </section>
  );
}
