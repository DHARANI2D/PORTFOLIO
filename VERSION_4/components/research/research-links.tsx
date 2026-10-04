import { ButtonLink } from "@/components/ui/button";
import { isHttps } from "@/components/research/text";
import type { ResearchItem } from "@/content/schema";

/**
 * Real links only. A research item with no paper and no repository shows nothing here: no empty
 * state, no "coming soon". Anything that is not an https URL is dropped.
 */
export function ResearchLinks({
  links,
  title,
  className,
}: {
  links: ResearchItem["links"];
  title: string;
  className?: string;
}) {
  const entries = [
    { key: "paper", label: "PAPER", href: links.paper },
    { key: "github", label: "GITHUB", href: links.github },
  ].filter((entry): entry is { key: string; label: string; href: string } => isHttps(entry.href));
  if (entries.length === 0) return null;

  return (
    <ul aria-label={`${title} links`} className={className ?? "flex flex-wrap gap-3"}>
      {entries.map((entry) => (
        <li key={entry.key}>
          <ButtonLink href={entry.href} external variant="secondary" size="sm" arrow>
            {entry.label}
          </ButtonLink>
        </li>
      ))}
    </ul>
  );
}
