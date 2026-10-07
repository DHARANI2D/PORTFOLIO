"use client";

import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { applyTheme, applyView, readTheme, readView } from "@/lib/preferences";
import type { runCommand, TerminalData } from "@/lib/terminal-commands";
import { UI_EVENTS, type OpenTerminalDetail } from "@/lib/ui-events";

const PROMPT_HOST = "dharanidharan@portfolio:";
const QUICK_COMMANDS = ["help", "projects", "research", "status", "contact"] as const;
const MAX_ENTRIES = 400;
const MAX_HISTORY = 50;
const MAX_INPUT = 200;

type Entry = { id: number; kind: "input" | "output"; text: string };

type Engine = typeof runCommand;

/**
 * The interpreter loads on first use, in its own small chunk, so none of it is in the page JS of
 * visitors who never open the terminal. The data it prints from does not: it arrives as props from
 * the server (see terminal.tsx), already validated, so no schema library is needed here. This file
 * only imports types from the interpreter. A failed load is not cached, so the next command retries.
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

/**
 * Terminal easter egg (the client half; terminal.tsx is the server wrapper that supplies `data`).
 * Opens from the header, the mobile menu, the command palette, or any code that calls
 * openTerminal() (the "ds:open-terminal" event; `detail.command` runs on open).
 * Nothing on the site depends on it. Commands are interpreted by lib/terminal-commands.ts and
 * everything printed comes from `data`, the site's own content; input is never sent anywhere.
 *
 * Keys: Enter runs, Up/Down recall history, Ctrl+L clears, Esc closes. The output region is a
 * polite live log. On phones a row of quick-run buttons replaces typing for the common commands.
 */
export function TerminalDialogClient({ data }: { data: TerminalData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const history = useRef<string[]>([]);
  // -1 = not browsing history; `draft` keeps what was typed before the first Up press.
  const historyCursor = useRef(-1);
  const draft = useRef("");
  const greeted = useRef(false);

  function append(items: readonly { kind: Entry["kind"]; text: string }[]) {
    const added = items.map((item) => ({ id: nextId.current++, ...item }));
    setEntries((previous) => [...previous, ...added].slice(-MAX_ENTRIES));
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
        {
          kind: "output",
          text: "The terminal could not load. Reload the page and try again.",
        },
      ]);
      return;
    } finally {
      if (timer !== null) clearTimeout(timer);
      setLoading(false);
    }

    // Nothing a command does may take the terminal down: report it and keep the prompt.
    try {
      // Preferences are read at run time so `theme` and `view` can toggle without an argument.
      const result = run(command, { ...data, theme: readTheme(), view: readView() });
      if (result.clear) {
        setEntries([]);
        return;
      }
      append([
        { kind: "input", text: command },
        ...result.lines.map((text) => ({ kind: "output" as const, text })),
      ]);
      if (result.theme) applyTheme(result.theme);
      if (result.view) applyView(result.view);
      if (isInternalPath(result.navigate)) {
        setOpen(false);
        router.push(result.navigate);
      }
    } catch {
      append([
        { kind: "input", text: command },
        { kind: "output", text: "That command failed. Type help for the list of commands." },
      ]);
    }
  }

  async function openWith(command?: string) {
    setOpen(true);
    if (!greeted.current) {
      greeted.current = true;
      await execute("help");
    }
    if (command) await execute(command);
  }

  const onOpenRequest = useEffectEvent((command?: string) => {
    void openWith(command);
  });

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<OpenTerminalDetail | undefined>).detail;
      onOpenRequest(typeof detail?.command === "string" ? detail.command : undefined);
    };
    window.addEventListener(UI_EVENTS.openTerminal, listener);
    return () => window.removeEventListener(UI_EVENTS.openTerminal, listener);
  }, []);

  // Stick to the newest output. Instant, never smooth: it is a log, not a transition.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries, open]);

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
    inputRef.current?.focus();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Terminal"
      description="Command line for this portfolio. Type help to list the commands."
      hideTitle
      closeButton="visible"
      initialFocus={inputRef}
      // Fixed height so output growing never moves the dialog. Shorter on phones so the prompt
      // stays above the on-screen keyboard.
      className="h-[min(32rem,58dvh)] max-w-2xl md:h-[min(34rem,70dvh)]"
    >
      <div className="flex min-h-0 flex-1 flex-col font-mono">
        <div className="flex h-12 shrink-0 items-center justify-between border-b pr-14 pl-4">
          <Label>TERMINAL</Label>
          <Label className="max-sm:hidden">ESC TO CLOSE</Label>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-label="Terminal output"
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
                "\u00a0"
              ) : (
                <Linkified text={entry.text} />
              )}
            </div>
          ))}
          {loading ? <div className="text-muted">loading...</div> : null}
        </div>

        <div
          role="group"
          aria-label="Quick commands"
          className="flex shrink-0 flex-wrap gap-2 border-t px-4 py-3 sm:hidden"
        >
          {QUICK_COMMANDS.map((command) => (
            <Button
              key={command}
              size="sm"
              variant="secondary"
              onClick={() => void execute(command)}
            >
              {command}
            </Button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2 border-t px-4">
          <span aria-hidden className="shrink-0 text-[0.8125rem] text-muted select-none">
            <span className="max-sm:hidden">{PROMPT_HOST}</span>~$
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              historyCursor.current = -1;
            }}
            onKeyDown={onKeyDown}
            aria-label="Terminal command"
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
    </Dialog>
  );
}
