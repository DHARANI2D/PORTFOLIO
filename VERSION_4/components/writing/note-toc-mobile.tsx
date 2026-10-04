import { ChevronRight } from "lucide-react";
import type { NoteHeading } from "@/components/writing/headings";

/**
 * "On this page" for narrow screens: a native <details>, closed by default, so it needs no
 * JavaScript and costs one line of height until it is opened. Hidden from the desktop breakpoint,
 * where the sticky list takes over.
 */
export function NoteTocMobile({ headings }: { headings: readonly NoteHeading[] }) {
  return (
    <details className="group/toc mb-12 rounded-lg border bg-surface lg:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 label-mono text-foreground [&::-webkit-details-marker]:hidden">
        ON THIS PAGE
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted transition-transform duration-200 group-open/toc:rotate-90 motion-reduce:transition-none"
        />
      </summary>
      <nav aria-label="On this page" className="border-t px-4 py-2">
        <ol>
          {headings.map((heading, index) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className="flex min-h-11 items-center gap-3 py-2 text-sm leading-5 text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none"
              >
                <span aria-hidden className="shrink-0 font-mono text-[0.6875rem]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
