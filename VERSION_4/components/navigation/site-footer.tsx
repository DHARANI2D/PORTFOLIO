import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { StatusDot } from "@/components/navigation/logo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const linkBase =
  "inline-flex min-h-11 items-center text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none";
const contactLinkClass = cn(linkBase, "text-sm");
const legalLinkClass = cn(linkBase, "label-mono");

const contactLinks = [
  { label: "GitHub", href: site.github, external: true },
  { label: "LinkedIn", href: site.linkedin, external: true },
  // Constant address from lib/site.ts, no user input, so no query string to encode.
  { label: "Email", href: `mailto:${site.email}`, external: false },
] as const;

/** Deliberately quiet: identity, three links, status, legal. Not a sitemap. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t bg-background">
      <Container className="py-16 md:py-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-7">
            <p className="label-mono text-foreground">{site.name.toUpperCase()}</p>
            <p className="mt-4 text-lg text-foreground">Security Engineer</p>
            <p className="mt-1 text-muted">Detection · Cloud · AI Security</p>
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

        <div className="mt-12 flex flex-col gap-4 border-t pt-6 md:mt-16 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <Label>© {site.builtOn}</Label>
            <p className="flex items-center gap-2 label-mono text-muted">
              <span>SYSTEM STATUS</span>
              <StatusDot pulse={false} />
              <span className="text-foreground">OPERATIONAL</span>
            </p>
          </div>

          <nav aria-label="Legal" className="md:ml-auto">
            <ul className="flex flex-wrap items-center gap-x-6">
              <li>
                <Link href="/privacy/" className={legalLinkClass}>
                  Privacy
                </Link>
              </li>
              <li>
                {/* A static file generated at build time, not a route: a plain anchor avoids router prefetch. */}
                <a href="/.well-known/security.txt" className={legalLinkClass}>
                  security.txt
                </a>
              </li>
            </ul>
          </nav>

          {/* Keyboard hint only where a keyboard is likely; touch users have the Search button in the menu. */}
          <p className="hidden label-mono text-muted pointer-fine:block">
            <kbd className="rounded-sm border px-1 py-0.5 font-mono">⌘K</kbd> /{" "}
            <kbd className="rounded-sm border px-1 py-0.5 font-mono">CTRL K</kbd> SEARCH
          </p>
        </div>
      </Container>
    </footer>
  );
}
