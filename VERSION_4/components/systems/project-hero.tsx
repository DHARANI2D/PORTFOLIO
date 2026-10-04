import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectLinks } from "@/components/systems/project-links";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import type { Project } from "@/content/schema";
import { cn } from "@/lib/utils";

/**
 * The "3 levels" rhythm of a case study: 3 seconds (tagline), 30 seconds (summary), 5 minutes
 * (everything below). Three short ticks fill up with the level. The text carries the meaning, the
 * ticks are decoration.
 */
export function LevelLabel({
  level,
  className,
  children,
}: {
  level: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("flex items-center gap-3 label-mono text-muted", className)}>
      <span aria-hidden className="flex items-center gap-2">
        {[1, 2, 3].map((tick) => (
          <span
            key={tick}
            className={cn("block h-px w-2", tick <= level ? "bg-foreground" : "bg-border-strong")}
          />
        ))}
      </span>
      {children}
    </p>
  );
}

// Entrance as an enhancement: CSS @starting-style, so it needs no JS, runs once, and is switched
// off by reduced motion. The h1 is deliberately not animated (it is the LCP element).
const rise =
  "transition-[opacity,translate] duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

// Tailwind needs these as literal class names. Twelve columns at lg; the domain cell takes
// whatever the other cells leave.
const SPAN = {
  3: "lg:col-span-3",
  6: "lg:col-span-6",
  9: "lg:col-span-9",
  12: "lg:col-span-12",
} as const;

type MetaCell = { key: string; label: string; span: keyof typeof SPAN; value: React.ReactNode };

function metaCells(project: Project): MetaCell[] {
  const fixed: MetaCell[] = [];

  if (project.status) {
    fixed.push({
      key: "status",
      label: "STATUS",
      span: 3,
      value: (
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
          {project.status}
        </span>
      ),
    });
  }

  fixed.push({ key: "category", label: "CATEGORY", span: 3, value: project.category });

  if (project.stack.length > 0) {
    fixed.push({
      key: "stack",
      label: "STACK",
      span: 3,
      value: <span className="font-mono text-sm">{project.stack.join(" · ")}</span>,
    });
  }

  const used = fixed.length * 3;
  const domainSpan = (12 - used) as keyof typeof SPAN;
  const domain: MetaCell = {
    key: "domain",
    label: "DOMAIN",
    span: domainSpan in SPAN ? domainSpan : 12,
    value: (
      <ul aria-label={`${project.name} domains`} className="flex flex-wrap gap-2">
        {project.domain.map((item) => (
          <li key={item}>
            <Tag>{item}</Tag>
          </li>
        ))}
      </ul>
    ),
  };

  // Reading order: STATUS, DOMAIN, CATEGORY, STACK.
  const status = fixed.find((cell) => cell.key === "status");
  const rest = fixed.filter((cell) => cell.key !== "status");
  return [...(status ? [status] : []), domain, ...rest];
}

/**
 * Case-study hero. Layer 1 (tagline) and layer 2 (summary) of the page, then the meta grid and the
 * links that really exist. Server component.
 */
export function ProjectHero({ project }: { project: Project }) {
  const cells = metaCells(project);

  return (
    <header className="relative">
      <Container className="pt-6 pb-16 md:pt-8 md:pb-24">
        <nav aria-label="Back to the systems index">
          <Link
            href="/systems/"
            className="group/back -ml-2 inline-flex min-h-11 items-center gap-2 px-2 label-mono text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none"
          >
            <ArrowLeft
              aria-hidden
              className="size-3.5 transition-transform duration-200 motion-safe:group-hover/back:-translate-x-0.5"
            />
            ALL SYSTEMS
          </Link>
        </nav>

        <div className="mt-12 md:mt-16">
          <Label className="block text-foreground">
            SYSTEM <span className="text-muted">/ {project.slug}</span>
          </Label>
          <h1
            id="system-title"
            className="mt-6 text-4xl display break-words xs:text-5xl md:text-7xl xl:text-8xl"
          >
            {project.name}
          </h1>
        </div>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-x-6">
          <div className={cn("lg:col-span-7", rise)}>
            <LevelLabel level={1}>THE 3-SECOND VERSION</LevelLabel>
            <p className="mt-6 max-w-[24ch] text-2xl headline md:text-4xl">{project.tagline}</p>
          </div>
          <div className={cn("lg:col-span-5", rise, "delay-100")}>
            <LevelLabel level={2}>THE 30-SECOND VERSION</LevelLabel>
            <p className="mt-6 max-w-xl text-lg text-muted">{project.summary}</p>
          </div>
        </div>

        <dl
          className={cn(
            "mt-16 grid grid-cols-1 gap-x-6 gap-y-8 border-t pt-8 sm:grid-cols-2 lg:grid-cols-12",
            rise,
            "delay-200",
          )}
        >
          {cells.map((cell) => (
            <div key={cell.key} className={cn("min-w-0", SPAN[cell.span])}>
              <dt className="label-mono text-muted">{cell.label}</dt>
              <dd className="mt-3 text-base text-foreground">{cell.value}</dd>
            </div>
          ))}
        </dl>

        <ProjectLinks links={project.links} name={project.name} className="mt-12" />
      </Container>
    </header>
  );
}
