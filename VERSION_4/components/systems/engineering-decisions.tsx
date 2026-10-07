import type { Project } from "@/content/schema";

type Decision = Project["decisions"][number];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Engineering decisions as an always-open Q&A list: the question is the heading, the answer sits
 * beside it on wide screens and under it on narrow ones. Always open on purpose: the list is meant
 * to be scanned, and it works with no JS. Server component.
 */
export function EngineeringDecisions({ decisions }: { decisions: readonly Decision[] }) {
  if (decisions.length === 0) return null;

  return (
    <ol className="border-t">
      {decisions.map((decision, index) => (
        <li key={decision.question} className="grid gap-4 border-b py-8 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-5">
            <span aria-hidden className="block label-mono text-muted">
              D-{pad(index + 1)}
            </span>
            <h3 className="mt-3 text-xl headline md:text-2xl">{decision.question}</h3>
          </div>
          <p className="max-w-prose text-base text-muted md:text-lg lg:col-span-7">
            {decision.answer}
          </p>
        </li>
      ))}
    </ol>
  );
}
