import { ChevronRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { getSkills } from "@/lib/content";

/**
 * "STACK" (auto-numbered): skills grouped by domain as quiet mono rows. No levels, bars, clouds or logos.
 * Each group with extra depth gets a native <details> disclosure, so it is keyboard operable,
 * exposes its expanded state to assistive tech and works without JavaScript. Server component, zero client JS.
 * Renders every group in content, so the number of groups is owned by content/skills.ts.
 */
export function SkillMatrix() {
  const groups = getSkills();

  return (
    <Section
      id="stack"
      autoNumber
      label="STACK"
      title="What I work with."
      intro="Grouped by domain, with no ratings. Open a group to see the depth behind it."
    >
      <ul className="grid items-start gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <li key={group.id} className="border-t pt-6">
            <h3 className="label-mono text-foreground">{group.title}</h3>

            <ul className="mt-6 space-y-2 font-mono text-sm text-muted">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {group.depth.length > 0 ? (
              <details className="group/depth mt-6 border-t">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 label-mono text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
                  <span>
                    DEPTH <span aria-hidden>·</span> {group.depth.length}
                    <span className="sr-only"> for {group.title}</span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 transition-transform duration-200 group-open/depth:rotate-90 motion-reduce:transition-none"
                  />
                </summary>
                <ul className="space-y-2 pt-2 pb-2 font-mono text-sm text-muted">
                  {group.depth.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <ChevronRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
