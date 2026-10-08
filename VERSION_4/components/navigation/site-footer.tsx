import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { AvailabilityStatus, StatusDot } from "@/components/navigation/logo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const linkBase =
  "inline-flex min-h-11 items-center text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none";
const contactLinkClass = cn(linkBase, "text-sm");
const legalLinkClass = cn(linkBase, "label-mono");

const contactLinks = [
  { label: "GitHub", href: site.github, external: true },
  { label: "LinkedIn", href: site.linkedin, external: true },
  { label: "DEV", href: site.devto, external: true },
  // Constant address from lib/site.ts, no user input, so no query string to encode.
  { label: "Email", href: `mailto:${site.email}`, external: false },
] as const;

// Pages that are not in the primary nav. The footer is on every page in both views, so these two
// are reachable from anywhere without the palette or the Recruiter view. Privacy and the
// security.txt file (a static file, not a route) close the row.
const pageLinks = [
  { label: "Certifications", href: "/#certifications" },
  { label: "Security", href: "/security/" },
  { label: "Privacy", href: "/privacy/" },
] as const;

/**
 * Deliberately quiet: identity, availability, three contact links, status, a few pages. Not a sitemap.
 * The availability line lives here as well as in the header (xl and up) and the menu sheet, so it is
 * on screen somewhere at every width.
 */
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t bg-background">
      <Container className="py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-7">
            <p className="label-mono text-foreground">{site.name.toUpperCase()}</p>
            <p className="mt-4 text-lg text-foreground">Security Engineer</p>
            <p className="mt-1 text-muted">Detection · Cloud · AI Security</p>
            <p className="mt-4 label-mono text-muted">
              <span className="text-foreground">{site.brandName}</span> {site.brandMeaning}
            </p>
            <AvailabilityStatus pulse={false} className="mt-6" />
          </div>

          <nav aria-label="Contact links" className="md:col-span-5 md:justify-self-end">
            <ul className="flex flex-wrap items-center gap-x-6">
              {contactLinks.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={contactLinkClass}
                    >
                      {link.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <a href={link.href} className={contactLinkClass}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t pt-6 md:mt-10 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <Label>© {site.builtOn}</Label>
            <p className="flex items-center gap-2 label-mono text-muted">
              <span>SYSTEM STATUS</span>
              <StatusDot pulse={false} />
              <span className="text-foreground">OPERATIONAL</span>
            </p>
          </div>

          <nav aria-label="Footer links" className="md:ml-auto">
            <ul className="flex flex-wrap items-center gap-x-6">
              {pageLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={legalLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                {/* A static file generated at build time, not a route: a plain anchor avoids router prefetch. */}
                <a href="/.well-known/security.txt" className={legalLinkClass}>
                  security.txt
                </a>
              </li>
            </ul>
          </nav>

        </div>
      </Container>
    </footer>
  );
}
