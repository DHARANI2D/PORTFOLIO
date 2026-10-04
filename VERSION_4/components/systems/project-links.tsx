import { ButtonLink } from "@/components/ui/button";
import type { Project } from "@/content/schema";
import { cn } from "@/lib/utils";

const LINK_DEFS = [
  { key: "github", label: "GitHub" },
  { key: "paper", label: "Paper" },
  { key: "demo", label: "Demo" },
] as const;

// Defence in depth: the schema only checks that a string is a URL, and `javascript:` is one.
// Only http(s) ever becomes an href.
const isHttpUrl = (url: string | undefined): url is string => !!url && /^https?:\/\//i.test(url);

/** The one safe repository URL for a project, or undefined. Used for JSON-LD as well. */
export function getRepositoryUrl(links: Project["links"]): string | undefined {
  return isHttpUrl(links.github) ? links.github : undefined;
}

type ProjectLinksProps = {
  links: Project["links"];
  name: string;
  className?: string;
};

/**
 * Buttons for the links a project really has (GitHub, paper, demo). A link that is not in the
 * content is not rendered: no disabled buttons, no placeholders. With none, the component renders
 * nothing at all.
 */
export function ProjectLinks({ links, name, className }: ProjectLinksProps) {
  const items = LINK_DEFS.flatMap((def) => {
    const href = links[def.key];
    return isHttpUrl(href) ? [{ ...def, href }] : [];
  });
  if (items.length === 0) return null;

  return (
    <ul aria-label={`${name} links`} className={cn("flex flex-wrap gap-3", className)}>
      {items.map((item) => (
        <li key={item.key}>
          <ButtonLink
            href={item.href}
            external
            arrow
            variant="secondary"
            aria-label={`${item.label}: ${name} (opens in a new tab)`}
          >
            {item.label}
          </ButtonLink>
        </li>
      ))}
    </ul>
  );
}
