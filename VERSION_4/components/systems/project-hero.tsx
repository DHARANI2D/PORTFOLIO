import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectLinks } from "@/components/systems/project-links";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import { categoryRepeatsDomain } from "@/components/systems/project-meta";
import type { Project } from "@/content/schema";
import { cn } from "@/lib/utils";

/**
 * The "3 levels" rhythm of a case study: what it is (3 seconds, the tagline), why it matters
 * (30 seconds, the summary), how it works (5 minutes, everything below). Each level is named by what
 * it answers, with the time budget after it. Three short ticks fill up with the level. The text
 * carries the meaning, the ticks are decoration.
 */
export function LevelLabel({
  level,
  hint,
  className,
  children,
}: {
  level: 1 | 2 | 3;
  /** The time budget, shown after the name, for example "3 seconds". */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 label-mono text-muted", className)}
    >
      <span aria-hidden className="flex items-center gap-2">
        {[1, 2, 3].map((tick) => (
          <span
            key={tick}
            className={cn("block h-px w-2", tick <= level ? "bg-foreground" : "bg-border-strong")}
          />
        ))}
      </span>
      <span className="text-foreground">{children}</span>
      {hint ? <span>{hint}</span> : null}
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

function metaCells(project: Project, brief: boolean): MetaCell[] {
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

  // A brief page says the domain once: a category that only repeats the domain tags is left out.
  if (!brief || !categoryRepeatsDomain(project)) {
    fixed.push({ key: "category", label: "CATEGORY", span: 3, value: project.category });
  }

  if (project.stack.length > 0) {
    fixed.push({
      key: "stack",
      label: "STACK",
      span: 3,
      value: <span className="font-mono text-sm">{project.stack.join(" · ")}</span>,
    });
  }

  if (brief) {
    fixed.push({
      key: "detail",
      label: "PUBLISHED DETAIL",
      span: 3,
      value: <span className="text-muted">Overview only</span>,
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

  // Reading order: STATUS, DOMAIN, CATEGORY, STACK, PUBLISHED DETAIL.
  const status = fixed.find((cell) => cell.key === "status");
  const rest = fixed.filter((cell) => cell.key !== "status");
  return [...(status ? [status] : []), domain, ...rest];
}

/**
 * Hero of a system page, then the meta grid and the links that really exist. Server component.
 *
 * `case-study`: layer 1 (what it is: the tagline) and layer 2 (why it matters: the summary) side by
 * side, so the three layers of the page can be told apart.
 * `brief`: for a system with no more than an overview. The tagline is the lead and the summary moves
 * into the overview block below, so nothing is said twice at the top of a short page.
 */
export function ProjectHero({
  project,
  variant = "case-study",
}: {
  project: Project;
  variant?: "case-study" | "brief";
}) {
  const brief = variant === "brief";
  const cells = metaCells(project, brief);

  return (
    <header className="relative">
      <Container className={cn("pt-6 md:pt-8", brief ? "pb-12 md:pb-16" : "pb-16 md:pb-24")}>
        <nav aria-label="Back to the systems index">
          <Link
            href="/#systems"
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
            className="mt-6 text-4xl display break-words xs:text-4xl md:text-5xl xl:text-6xl"
          >
            {project.name}
          </h1>
        </div>

        {brief ? (
          <p className={cn("mt-8 max-w-[28ch] text-2xl headline md:mt-10 md:text-4xl", rise)}>
            {project.tagline}
          </p>
        ) : (
          <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-x-6">
            <div className={cn("lg:col-span-7", rise)}>
              <LevelLabel level={1} hint="3 seconds">
                WHAT IT IS
              </LevelLabel>
              <p className="mt-6 max-w-[24ch] text-2xl headline md:text-4xl">{project.tagline}</p>
            </div>
            <div className={cn("lg:col-span-5", rise, "delay-100")}>
              <LevelLabel level={2} hint="30 seconds">
                WHY IT MATTERS
              </LevelLabel>
              <p className="mt-6 max-w-xl text-lg text-muted">{project.summary}</p>
            </div>
          </div>
        )}

        <dl
          className={cn(
            "grid grid-cols-1 gap-x-6 gap-y-8 border-t pt-8 sm:grid-cols-2 lg:grid-cols-12",
            brief ? "mt-12" : "mt-16",
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
