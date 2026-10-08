"use client";

import { Fragment, useEffect, useEffectEvent, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { KnowledgeDoc } from "@/lib/assistant";
import { applyTheme, readTheme } from "@/lib/preferences";
import type { runCommand, TerminalData } from "@/lib/terminal-commands";

const PROMPT_HOST = "dharanidharan@portfolio:";
const MAX_ENTRIES = 400;
const MAX_HISTORY = 50;
const MAX_INPUT = 200;

type Entry = { id: number; kind: "input" | "output"; text: string };

type Engine = typeof runCommand;
type Assistant = typeof import("@/lib/assistant");

/**
 * The interpreter and the assistant load on first use, each in its own small chunk, so none of it
 * is in the page JS of visitors who never type. The data the commands print from arrives as props
 * from the server, already validated. The answers come from /knowledge.json, a same-origin file
 * built from the site's content, fetched the first time a question is asked. A failed load is not
 * cached, so the next command retries.
 */
let enginePromise: Promise<Engine> | null = null;
let engineReady = false;
function loadEngine(): Promise<Engine> {
  enginePromise ??= import("@/lib/terminal-commands")
    .then((mod) => {
      engineReady = true;
      return mod.runCommand;
    })
    .catch((error: unknown) => {
      enginePromise = null;
      throw error;
    });
  return enginePromise;
}

let assistantPromise: Promise<{ assistant: Assistant; docs: KnowledgeDoc[] }> | null = null;
function loadAssistant() {
  assistantPromise ??= Promise.all([
    import("@/lib/assistant"),
    fetch("/knowledge.json").then((response) => {
      if (!response.ok) throw new Error(`knowledge.json: ${response.status}`);
      return response.json() as Promise<KnowledgeDoc[]>;
    }),
  ])
    .then(([assistant, docs]) => ({ assistant, docs }))
    .catch((error: unknown) => {
      assistantPromise = null;
      throw error;
    });
  return assistantPromise;
}

/** A line that should never leave the site: internal, absolute paths only (also guards `//host`). */
function isInternalPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

/** How long a load may take before the log says it is loading. Faster loads show nothing. */
const LOADING_DELAY_MS = 200;

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Splitting on a capture group puts the URLs at the odd indexes. Everything else stays plain text. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/).map((part, index) => {
        const href = index % 2 === 1 ? safeHttpUrl(part) : null;
        return href ? (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="[overflow-wrap:anywhere] underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
          >
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        );
      })}
    </>
  );
}

/** Wrapped lines hang under their first character (bullets, indented rows) instead of under the margin. */
function hangClass(text: string): string {
  const lead = /^\s*(?:- )?/.exec(text)?.[0].length ?? 0;
  if (lead >= 6) return "pl-[6ch] [text-indent:-6ch]";
  if (lead >= 4) return "pl-[4ch] [text-indent:-4ch]";
  if (lead >= 2) return "pl-[2ch] [text-indent:-2ch]";
  return "";
}

export type TerminalHandle = {
  /** Runs a command or asks a question as if it had been typed. */
  run: (command: string) => Promise<void>;
};

export type QuickRun = { label: string; command: string };

type TerminalSurfaceProps = {
  data: TerminalData;
  /** Printed above the first prompt, as output. */
  intro?: readonly string[];
  /** Buttons that run a command or question. */
  quick?: readonly QuickRun[];
  /** "mobile": only below the sm breakpoint (the dialog). "always": at every width (the hero). */
  quickVisible?: "mobile" | "always";
  /** Called when a command navigates away, so a dialog can close. */
  onNavigate?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Called once, after the surface has mounted and `handle` is attached. */
  onReady?: () => void;
  handle?: React.Ref<TerminalHandle>;
  /** Labels the log and the prompt, so two terminals on one page have distinct names. */
  logLabel?: string;
  promptLabel?: string;
  className?: string;
};

/**
 * The terminal itself: output log, optional quick-run buttons and the prompt. The dialog and the
 * hero both render this inside their own frame. Commands are interpreted by lib/terminal-commands.ts
 * and everything printed comes from `data` or from /knowledge.json, the site's own content; input
 * is never sent anywhere.
 *
 * Keys: Enter runs, Up/Down recall history, Ctrl+L clears. The output region is a polite live log.
 * Anything that is not a command is a question for the assistant (lib/assistant.ts).
 */
export function TerminalSurface({
  data,
  intro = [],
  quick = [],
  quickVisible = "mobile",
  onNavigate,
  inputRef,
  onReady,
  handle,
  logLabel = "Terminal output",
  promptLabel = "Terminal command",
  className,
}: TerminalSurfaceProps) {
  const router = useRouter();
  const nextId = useRef(intro.length);
  const [entries, setEntries] = useState<Entry[]>(() =>
    intro.map((text, id) => ({ id, kind: "output" as const, text })),
  );
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const innerInput = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);
  // -1 = not browsing history; `draft` keeps what was typed before the first Up press.
  const historyCursor = useRef(-1);
  const draft = useRef("");

  function append(items: readonly { kind: Entry["kind"]; text: string }[]) {
    const added = items.map((item) => ({ id: nextId.current++, ...item }));
    setEntries((previous) => [...previous, ...added].slice(-MAX_ENTRIES));
    // Stick to the newest output. Instant, never smooth: it is a log, not a transition.
    requestAnimationFrame(() => {
      const log = logRef.current;
      if (log) log.scrollTop = log.scrollHeight;
    });
  }

  async function execute(raw: string) {
    const command = raw.trim().slice(0, MAX_INPUT);
    if (command !== "" && history.current[history.current.length - 1] !== command) {
      history.current = [...history.current, command].slice(-MAX_HISTORY);
    }
    historyCursor.current = -1;

    // Only a slow first load shows a line; a fast one never flashes it.
    const timer = engineReady ? null : setTimeout(() => setLoading(true), LOADING_DELAY_MS);
    let run: Engine;
    try {
      run = await loadEngine();
    } catch {
      append([
        { kind: "input", text: command },
        { kind: "output", text: "The terminal could not load. Reload the page and try again." },
      ]);
      return;
    } finally {
      if (timer !== null) clearTimeout(timer);
      setLoading(false);
    }

    // Nothing a command does may take the terminal down: report it and keep the prompt.
    try {
      // Preferences are read at run time so `theme` can toggle without an argument.
      const result = run(command, { ...data, theme: readTheme() });
      if (result.clear) {
        setEntries([]);
        return;
      }

      let lines = result.lines;
      if (result.ask !== undefined) {
        // The question is shown at once; the answer follows when the knowledge has loaded.
        append([{ kind: "input", text: command }]);
        setLoading(true);
        try {
          const { assistant, docs } = await loadAssistant();
          const answer = assistant.answerQuestion(result.ask, docs);
          if (answer.found) lines = answer.lines;
        } catch {
          lines = ["The assistant could not load its notes. Reload the page and try again."];
        } finally {
          setLoading(false);
        }
        append(lines.map((text) => ({ kind: "output" as const, text })));
        return;
      }

      append([
        { kind: "input", text: command },
        ...lines.map((text) => ({ kind: "output" as const, text })),
      ]);
      if (result.theme) applyTheme(result.theme);
      if (isInternalPath(result.navigate)) {
        onNavigate?.();
        router.push(result.navigate);
      }
    } catch {
      append([
        { kind: "input", text: command },
        { kind: "output", text: "That command failed. Type help for the list of commands." },
      ]);
    }
  }

  useImperativeHandle(handle, () => ({ run: execute }));
  // The caller's ref to the prompt (a dialog focuses it on open).
  useImperativeHandle(inputRef, () => innerInput.current as HTMLInputElement);

  // Tells the caller the handle is attached, so it can run what was queued while this mounted.
  const announce = useEffectEvent(() => onReady?.());
  useEffect(() => announce(), []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    const recalled = history.current;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (recalled.length === 0) return;
      if (historyCursor.current === -1) {
        draft.current = value;
        historyCursor.current = recalled.length - 1;
      } else {
        historyCursor.current = Math.max(0, historyCursor.current - 1);
      }
      setValue(recalled[historyCursor.current] ?? "");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyCursor.current === -1) return;
      if (historyCursor.current >= recalled.length - 1) {
        historyCursor.current = -1;
        setValue(draft.current);
      } else {
        historyCursor.current += 1;
        setValue(recalled[historyCursor.current] ?? "");
      }
    } else if (
      event.key.toLowerCase() === "l" &&
      event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      setEntries([]);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = value;
    setValue("");
    void execute(raw);
  }

  // Clicking the output focuses the prompt, as in a real terminal, unless the click ended a text selection.
  function focusPrompt() {
    if (window.getSelection()?.toString()) return;
    innerInput.current?.focus();
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col font-mono ${className ?? ""}`}>
      <div
        ref={logRef}
        role="log"
        aria-label={logLabel}
        aria-relevant="additions"
        tabIndex={0}
        onClick={focusPrompt}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 text-[0.8125rem] leading-6 text-foreground focus-visible:outline-offset-[-2px]"
      >
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={
              entry.kind === "input"
                ? "mt-2 break-words whitespace-pre-wrap first:mt-0"
                : `break-words whitespace-pre-wrap ${hangClass(entry.text)}`
            }
          >
            {entry.kind === "input" ? (
              <>
                <span aria-hidden className="text-muted select-none">
                  {PROMPT_HOST}~${" "}
                </span>
                {entry.text}
              </>
            ) : entry.text === "" ? (
              " "
            ) : (
              <Linkified text={entry.text} />
            )}
          </div>
        ))}
        {loading ? <div className="text-muted">thinking...</div> : null}
      </div>

      {quick.length > 0 ? (
        <div
          role="group"
          aria-label="Quick questions"
          className={`flex shrink-0 flex-wrap gap-2 border-t px-4 py-3 ${quickVisible === "mobile" ? "sm:hidden" : ""}`}
        >
          {quick.map((item) => (
            <Button
              key={item.label}
              size="sm"
              variant="secondary"
              className="normal-case tracking-normal"
              onClick={() => void execute(item.command)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2 border-t px-4">
        <span aria-hidden className="shrink-0 text-[0.8125rem] text-muted select-none">
          <span className="max-sm:hidden">{PROMPT_HOST}</span>~$
        </span>
        <input
          ref={innerInput}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            historyCursor.current = -1;
          }}
          onKeyDown={onKeyDown}
          aria-label={promptLabel}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={MAX_INPUT}
          // 16px on phones so iOS does not zoom the page when the prompt is focused.
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none focus-visible:outline-offset-[-2px] sm:text-[0.8125rem]"
        />
      </form>
    </div>
  );
}
