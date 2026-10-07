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
        "border-t py-24 md:py-32",
        // `ds-section` is the shared hook (app/globals.css may also style it). The increment is
        // repeated here so the numbers never depend on a stylesheet rule being present.
        autoNumber && "ds-section [counter-increment:ds-section]",
        className,
      )}
    >
      <Container>
        <Label className="mb-8 block">
          {autoNumber ? (
            // The number is a CSS counter (::before), so it is not in the text content at all. The
            // number and the slash are decorative; the label alone is what assistive tech reads.
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
          <h2 id={headingId} className="max-w-[18ch] text-4xl headline md:text-6xl">
            {title}
          </h2>
        ) : null}
        {intro ? <p className="mt-6 max-w-2xl text-lg text-muted">{intro}</p> : null}
        {children ? <div className={title || intro ? "mt-14" : ""}>{children}</div> : null}
      </Container>
    </section>
  );
}
