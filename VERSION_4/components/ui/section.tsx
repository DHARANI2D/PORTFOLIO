import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SectionProps = {
  id: string;
  /** Two-digit section number, e.g. "02". */
  index: string;
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
export function Section({ id, index, label, title, intro, className, children }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn("border-t py-24 md:py-32", className)}
    >
      <Container>
        <Label className="mb-8 block">
          <span className="text-accent">{index}</span> / {label}
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
