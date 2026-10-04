"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { buildPaletteResults } from "@/components/command/palette-model";
import {
  readSequencesEnabled,
  setSequencesEnabled,
  useSequencesEnabled,
} from "@/components/command/shortcut-preference";
import { applyView, toggleTheme } from "@/lib/preferences";
import { useView } from "@/lib/use-preferences";
import type { SearchAction, SearchItem } from "@/lib/search-index";
import { openTerminal, UI_EVENTS } from "@/lib/ui-events";
import { cn } from "@/lib/utils";

/** "g" then one of these within the window goes to a page. A Map, so odd key names can never hit a prototype. */
const GO_TARGETS = new Map<string, string>([
  ["h", "/"],
  ["s", "/systems/"],
  ["e", "/experience/"],
  ["r", "/research/"],
  ["w", "/writing/"],
  ["a", "/about/"],
  ["c", "/contact/"],
  ["p", "/systems/"],
]);
const SEQUENCE_WINDOW_MS = 1200;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"], [role="searchbox"]',
    ) !== null
  );
}

/** Any open modal (mobile menu, terminal). Base UI dialogs render role="dialog" only while open. */
function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

/** Lower-cased key. Chrome autofill dispatches keydown events with no `key` at all, hence the guard. */
function keyOf(event: KeyboardEvent): string {
  return typeof event.key === "string" ? event.key.toLowerCase() : "";
}

function isPaletteHotkey(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && keyOf(event) === "k"
  );
}

const isInternalPath = (href: string) => href.startsWith("/") && !href.startsWith("//");

/**
 * Command palette: search every page, system, research item, note, skill and action.
 *
 * Opens with Cmd/Ctrl+K or the "ds:open-palette" window event. Pattern: a modal Dialog holding a
 * combobox input (focus stays in the input) that controls a listbox of grouped options, moved with
 * aria-activedescendant. One global keydown listener also handles the quiet "g then <letter>"
 * go-to sequences, so keyboard users can move around without opening anything.
 */
export function CommandPalette({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const view = useView();
  const sequencesEnabled = useSequencesEnabled();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Work to run after the palette has finished closing (opening the terminal over it would fight for focus).
  const afterClose = useRef<(() => void) | null>(null);
  // Timestamp of the "g" that arms a go-to sequence.
  const armedAt = useRef<number | null>(null);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const results = buildPaletteResults(items, query, view);
  const count = results.flat.length;
  const active = count === 0 ? -1 : Math.min(activeIndex, count - 1);

  function openPalette() {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function runAction(action: SearchAction) {
    switch (action) {
      case "toggle-theme":
        toggleTheme();
        break;
      case "view-engineer":
        applyView("engineer");
        break;
      case "view-recruiter":
        applyView("recruiter");
        break;
      case "open-terminal":
        afterClose.current = () => openTerminal();
        break;
      case "system-overview":
        afterClose.current = () => openTerminal("status");
        break;
      case "print-resume":
        // The resume page owns printing; this lands there.
        router.push("/resume/");
        break;
    }
  }

  function runItem(item: SearchItem) {
    setOpen(false);
    if (item.action) {
      runAction(item.action);
      return;
    }
    const href = item.href;
    if (!href) return;
    if (item.external) {
      // Only ever https, only ever from the build-time index, and never with an opener handle.
      if (href.startsWith("https://")) window.open(href, "_blank", "noopener,noreferrer");
    } else if (href.startsWith("mailto:")) {
      window.location.href = href;
    } else if (isInternalPath(href)) {
      router.push(href);
    }
  }

  function handleSequence(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      armedAt.current = null;
      return;
    }
    if (isEditableTarget(event.target) || isDialogOpen()) {
      armedAt.current = null;
      return;
    }

    const key = keyOf(event);
    const armed = armedAt.current;
    armedAt.current = null;
    // Cheap exit before touching storage: only "g", or the key after one, can matter.
    if (key !== "g" && armed === null) return;
    if (!readSequencesEnabled()) return;

    if (armed !== null && event.timeStamp - armed <= SEQUENCE_WINDOW_MS) {
      const href = GO_TARGETS.get(key);
      if (href) {
        event.preventDefault();
        router.push(href);
        return;
      }
    }
    if (key === "g" && !event.repeat) armedAt.current = event.timeStamp;
  }

  // Effect Events always see the latest state without re-subscribing the window listeners.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isPaletteHotkey(event)) {
      if (open) {
        event.preventDefault();
        setOpen(false);
      } else if (!isDialogOpen()) {
        event.preventDefault();
        openPalette();
      }
      return;
    }
    handleSequence(event);
  });
  const onOpenRequest = useEffectEvent(() => {
    if (!open && !isDialogOpen()) openPalette();
  });

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => onKeyDown(event);
    const request = () => onOpenRequest();
    window.addEventListener("keydown", keydown);
    window.addEventListener(UI_EVENTS.openPalette, request);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener(UI_EVENTS.openPalette, request);
    };
  }, []);

  // Keep the highlighted option visible. Index 0 scrolls fully up so its group heading shows too.
  useEffect(() => {
    if (!open || active < 0) return;
    if (active === 0) {
      if (listRef.current) listRef.current.scrollTop = 0;
      return;
    }
    document.getElementById(`${baseId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, baseId]);

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (count > 0) setActiveIndex((active + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (count > 0) setActiveIndex((active - 1 + count) % count);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = results.flat[active];
      if (item) runItem(item);
    }
  }

  const status =
    query.trim() === ""
      ? ""
      : count === 0
        ? "No results"
        : `${count} ${count === 1 ? "result" : "results"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search pages, systems, research, writing and actions. Arrow keys move, Enter opens."
      hideTitle
      initialFocus={inputRef}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return;
        const next = afterClose.current;
        afterClose.current = null;
        next?.();
      }}
      className="max-w-xl md:top-[15dvh] md:translate-y-0"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4">
          <Search aria-hidden className="size-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search the portfolio"
            aria-expanded={count > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search systems, research, writing..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={100}
            // 16px on phones so iOS does not zoom the page when the field is focused.
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted focus-visible:outline-offset-[-2px] md:text-sm"
          />
        </div>

        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Results"
          className="max-h-[min(24rem,50dvh)] overflow-y-auto overscroll-contain p-2"
        >
          {results.groups.map(({ group, items: groupItems }) => {
            const headingId = `${baseId}-group-${group}`;
            return (
              <div key={group} role="group" aria-labelledby={headingId}>
                <div
                  id={headingId}
                  role="presentation"
                  className="px-3 pt-3 pb-1 label-mono text-muted"
                >
                  {group}
                </div>
                {groupItems.map((item) => {
                  const index = results.flat.indexOf(item);
                  const isActive = index === active;
                  return (
                    <div
                      key={item.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isActive}
                      // Keep focus in the input when pressing an option with a pointer.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => runItem(item)}
                      onMouseMove={() => {
                        if (!isActive) setActiveIndex(index);
                      }}
                      className={cn(
                        "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2",
                        isActive && "bg-surface-hover",
                      )}
                    >
                      {isActive ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-foreground">
                          {item.title}
                          {item.external ? (
                            <span className="sr-only"> (opens in a new tab)</span>
                          ) : null}
                        </div>
                        {item.subtitle ? (
                          <div className="truncate text-xs text-muted">{item.subtitle}</div>
                        ) : null}
                      </div>
                      {item.external ? (
                        <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-muted" />
                      ) : null}
                      {isActive ? (
                        <CornerDownLeft
                          aria-hidden
                          className="size-3.5 shrink-0 text-muted max-sm:hidden"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {count === 0 && query.trim() !== "" ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No matches for &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : null}

        <div role="status" className="sr-only">
          {status}
        </div>

        {/* Quiet key hints. Hidden where there is no keyboard to press them. */}
        <div className="flex items-center justify-between gap-4 border-t px-4 py-3 max-sm:hidden pointer-coarse:hidden">
          <p className="flex items-center gap-4 label-mono text-muted">
            <span>
              <kbd aria-hidden className="font-mono">
                &uarr;&darr;
              </kbd>
              <span className="sr-only">Arrow keys</span> navigate
            </span>
            <span>
              <kbd aria-hidden className="font-mono">
                &crarr;
              </kbd>
              <span className="sr-only">Enter</span> open
            </span>
            <span>
              <kbd className="font-mono">esc</kbd> close
            </span>
          </p>
          <button
            type="button"
            aria-pressed={sequencesEnabled}
            onClick={() => setSequencesEnabled(!sequencesEnabled)}
            title="Press G, then H home, S systems, E experience, R research, W writing, A about, C contact. Click to turn these shortcuts off or on."
            className="inline-flex min-h-6 items-center gap-2 rounded-sm label-mono text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none"
          >
            <span aria-hidden>G then H S E R W A C</span>
            <span aria-hidden>{sequencesEnabled ? "ON" : "OFF"}</span>
            <span className="sr-only">
              Go-to keyboard shortcuts: press G, then H for home, S systems, E experience, R
              research, W writing, A about, C contact. Active when this palette is closed.
            </span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
