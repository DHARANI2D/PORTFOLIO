"use client";

import { BrandMark } from "@/components/navigation/logo";
import { TerminalSurface, type QuickRun } from "@/components/terminal/terminal-surface";
import { Label } from "@/components/ui/label";
import type { TerminalData } from "@/lib/terminal-commands";
import { cn } from "@/lib/utils";

const INTRO = [
  "Hi. Ask me about the systems, research, experience or certifications on this site.",
  "Answers come from the content of this site. Type help for the commands.",
  "",
] as const;

/** Questions offered under the log. They run through the same code as anything typed. */
const QUESTIONS: readonly QuickRun[] = [
  { label: "What do you work on?", command: "What do you work on?" },
  { label: "Tell me about HELIOS", command: "Tell me about HELIOS" },
  { label: "Which certifications do you have?", command: "Which certifications do you have?" },
  { label: "How can I contact you?", command: "How can I contact you?" },
];

/**
 * The terminal, inline in the hero: a bordered frame with a header, the output log, a row of
 * suggested questions and the prompt. It is the same terminal as the dialog (TerminalSurface), and
 * it doubles as the site's assistant: a command runs, anything else is a question answered from
 * the site's own content. Client component; the server hero passes it the terminal data.
 */
export function HeroTerminal({ data, className }: { data: TerminalData; className?: string }) {
  return (
    <section
      aria-label="Terminal and assistant"
      className={cn(
        "flex h-[30rem] flex-col overflow-hidden rounded-xl border bg-surface md:h-[34rem]",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4">
        <span className="flex items-center gap-3">
          <BrandMark size={18} className="text-foreground" />
          <Label className="text-foreground">TERMINAL</Label>
        </span>
        <Label className="max-sm:hidden">ASK ANYTHING</Label>
      </div>
      <TerminalSurface
        data={data}
        intro={INTRO}
        quick={QUESTIONS}
        quickVisible="always"
        logLabel="Terminal and assistant output"
        promptLabel="Ask a question or type a command"
      />
    </section>
  );
}
