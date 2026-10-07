import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { Project } from "@/content/schema";
import { cn } from "@/lib/utils";

type RelatedSystem = Pick<Project, "slug" | "name" | "tagline" | "tier" | "category">;

const TIER_LABEL = { 1: "FLAGSHIP", 2: "MAJOR", 3: "SUPPORTING" } as const;

/**
 * The systems a research direction feeds, each linking to its case study. The system name is the
 * only link; its ::after stretches over the card (one tap target, one announced name).
 */
export function RelatedSystems({ systems }: { systems: readonly RelatedSystem[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {systems.map((system) => (
        <li
          key={system.slug}
          className={cn(
            "group relative flex flex-col rounded-lg border bg-surface p-6",
            "transition-[translate,border-color,background-color] duration-200 motion-reduce:transition-none",
            "hover:border-border-strong hover:bg-surface-hover motion-safe:hover:-translate-y-[3px]",
          )}
        >
          <Label>
            {TIER_LABEL[system.tier]} / {system.category}
          </Label>
          <h3 className="mt-6 font-mono text-base font-medium [overflow-wrap:anywhere] text-foreground">
            <Link
              href={`/systems/${system.slug}/`}
              className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent focus-visible:after:outline-solid"
            >
              {system.name}
            </Link>
          </h3>
          <p className="mt-3 text-muted">{system.tagline}</p>
          <span
            aria-hidden
            className="mt-auto flex items-center gap-2 pt-6 label-mono text-muted transition-colors duration-200 group-hover:text-foreground motion-reduce:transition-none"
          >
            READ CASE STUDY
            <ArrowRight className="size-3.5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </li>
      ))}
    </ul>
  );
}
