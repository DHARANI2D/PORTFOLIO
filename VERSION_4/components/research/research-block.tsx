import { Container } from "@/components/ui/container";

/**
 * One numbered block of a research page: the mono "01 / ABSTRACT" heading on the left, the content
 * on the right. The heading is the section's h2. Engineer-only blocks disappear in recruiter view.
 */
export function ResearchBlock({
  id,
  index,
  recruiterIndex,
  label,
  engineerOnly = false,
  children,
}: {
  id: string;
  /** Two-digit number, e.g. "02". */
  index: string;
  /**
   * Number to show in recruiter view, when it differs because an engineer-only block above is
   * hidden there. Keeps the visible numbering gapless in both views.
   */
  recruiterIndex?: string;
  label: string;
  engineerOnly?: boolean;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-engineer-only={engineerOnly ? "" : undefined}
      className="border-t py-12 md:py-16"
    >
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-6">
          <h2 id={headingId} className="label-mono text-foreground lg:col-span-4">
            {recruiterIndex && recruiterIndex !== index ? (
              <>
                <span data-engineer-only className="text-accent">
                  {index}
                </span>
                <span data-recruiter-only className="text-accent">
                  {recruiterIndex}
                </span>
              </>
            ) : (
              <span className="text-accent">{index}</span>
            )}{" "}
            / {label}
          </h2>
          <div className="min-w-0 lg:col-span-8">{children}</div>
        </div>
      </Container>
    </section>
  );
}
