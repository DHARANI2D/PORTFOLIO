import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";

export type RelatedLink = { href: string; kind: string; title: string };

/**
 * "Related" row at the end of a field note: the case studies and research pages the note is about.
 * One plain link per item, so crawlers and readers get a path back to the system. Server component.
 */
export function NoteRelated({ links }: { links: readonly RelatedLink[] }) {
  if (links.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="border-t">
      <Container className="py-12 md:py-16">
        <h2 id="related-heading" className="label-mono text-foreground">
          RELATED
        </h2>
        <ul className="mt-6 border-t">
          {links.map((link) => (
            <li key={link.href} className="border-b">
              <Link
                href={link.href}
                className="group flex min-h-14 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 text-foreground transition-colors duration-200 hover:text-accent motion-reduce:transition-none"
              >
                <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <Label className="w-32 shrink-0">{link.kind}</Label>
                  <span className="[overflow-wrap:anywhere]">{link.title}</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted transition-transform duration-200 group-hover:text-accent motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
