import { dateRange } from "@/components/career/date-range";
import { emailHref } from "@/components/career/mailto";
import { getCertifications, getExperience, getSkills } from "@/lib/content";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Bullets shown for the current role. The PDF carries the full list. */
const CURRENT_BULLETS = 4;
/** The positioning line from docs/FACTS.md section B. */
const SUMMARY =
  "Security Engineer building detection, correlation, and AI security systems from first principles.";

/*
 * Print: component-level <style> is not allowed (strict CSP), so print is handled with Tailwind
 * `print:` variants. The page is on a dark surface by default, so under print the colour tokens are
 * re-pointed (named colours, no hex) to black on white. Only this subtree is affected.
 */
const PRINT_TOKENS =
  "print:[--accent:black] print:[--border-strong:silver] print:[--border:silver] print:[--foreground:black] print:[--muted:dimgray] print:[--surface:white]";

const linkClass =
  "inline-flex min-h-11 items-center text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none print:min-h-0";

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="label-mono text-muted">
      {children}
    </h3>
  );
}

/**
 * A miniature resume, built from the same content as the rest of the site: a paper-like page that
 * reads in both themes and prints. It is a summary, not the PDF: the current role shows its first
 * bullets and earlier roles show title and dates only. Server component.
 */
export function ResumePreview() {
  const experience = getExperience();
  const roles = experience.filter((entry) => entry.id !== "education");
  const current = roles.find((entry) => entry.current);
  const earlier = roles.filter((entry) => entry !== current);
  const education = experience.find((entry) => entry.id === "education");
  const skills = getSkills();
  const certifications = getCertifications().filter((cert) => cert.status === "verified");

  return (
    <article
      id="resume-preview"
      aria-labelledby="resume-name"
      tabIndex={-1}
      className={cn(
        "mx-auto w-full max-w-3xl rounded-lg border border-border-strong bg-surface p-4 text-foreground sm:p-8 md:p-12",
        "print:max-w-none print:rounded-none print:border-0 print:p-0",
        PRINT_TOKENS,
      )}
    >
      <header className="border-b pb-8">
        <h2 id="resume-name" className="text-3xl headline break-words md:text-4xl">
          {site.name}
        </h2>
        <p className="mt-2 font-mono text-sm tracking-[0.12em] text-muted uppercase">
          Security Engineer
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 text-sm">
          <li>
            <a href={emailHref} className={linkClass}>
              {site.email}
            </a>
          </li>
          <li>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className={linkClass}>
              LinkedIn
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={site.github} target="_blank" rel="noopener noreferrer" className={linkClass}>
              GitHub: {site.githubUser}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li className="inline-flex min-h-11 items-center text-muted print:min-h-0">
            {site.location}
          </li>
        </ul>
        <p className="mt-6 max-w-2xl">{SUMMARY}</p>
      </header>

      <section aria-labelledby="resume-experience" className="mt-8 print:break-inside-avoid">
        <SectionHeading id="resume-experience">EXPERIENCE</SectionHeading>

        {current ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="text-lg font-medium text-foreground">{current.role}</p>
              <p className="label-mono text-muted">{dateRange(current)}</p>
            </div>
            <p className="text-muted">
              {current.org}
              {current.team ? `. ${current.team}` : ""}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {current.bullets.slice(0, CURRENT_BULLETS).map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 bg-border-strong" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {earlier.length > 0 ? (
          <ul className="mt-6 space-y-3 border-t pt-6">
            {earlier.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"
              >
                <p>
                  <span className="font-medium text-foreground">{entry.role}</span>
                  <span className="text-muted">. {entry.org}</span>
                </p>
                <p className="label-mono text-muted">{dateRange(entry)}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section
        aria-labelledby="resume-skills"
        className="mt-8 border-t pt-8 print:break-inside-avoid"
      >
        <SectionHeading id="resume-skills">SKILLS</SectionHeading>
        <dl className="mt-6 space-y-3 text-sm">
          {skills.map((group) => (
            <div key={group.id} className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-foreground">{group.title}</dt>
              <dd className="text-muted">{group.items.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      </section>

      {education ? (
        <section
          aria-labelledby="resume-education"
          className="mt-8 border-t pt-8 print:break-inside-avoid"
        >
          <SectionHeading id="resume-education">EDUCATION</SectionHeading>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="font-medium text-foreground">{education.role}</p>
            <p className="label-mono text-muted">{dateRange(education)}</p>
          </div>
          <p className="text-muted">
            {education.org}
            {education.summary ? `. ${education.summary}` : ""}
          </p>
        </section>
      ) : null}

      {certifications.length > 0 ? (
        <section
          aria-labelledby="resume-certifications"
          className="mt-8 border-t pt-8 print:break-inside-avoid"
        >
          <SectionHeading id="resume-certifications">CERTIFICATIONS</SectionHeading>
          <ul className="mt-6 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            {certifications.map((cert) => (
              <li key={cert.name}>
                {cert.name}
                {cert.year ? <span className="text-muted"> ({cert.year})</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-12 border-t pt-6 label-mono text-muted print:hidden">
        Shortened preview, built from this site&apos;s content. Download the PDF for the resume
        itself.
      </p>
    </article>
  );
}
