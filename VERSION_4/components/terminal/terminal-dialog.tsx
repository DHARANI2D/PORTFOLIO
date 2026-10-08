"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  TerminalSurface,
  type QuickRun,
  type TerminalHandle,
} from "@/components/terminal/terminal-surface";
import type { TerminalData } from "@/lib/terminal-commands";
import { UI_EVENTS, type OpenTerminalDetail } from "@/lib/ui-events";

const QUICK_COMMANDS: readonly QuickRun[] = ["help", "projects", "research", "status", "contact"].map(
  (command) => ({ label: command, command }),
);

/**
 * The terminal as a dialog (the client half; terminal.tsx is the server wrapper that supplies
 * `data`). Opens from the header, the mobile menu, or any code that calls openTerminal() (the
 * "ds:open-terminal" event; `detail.command` runs on open). The same terminal also sits inline in
 * the hero. Keys: Esc closes. On phones a row of quick-run buttons replaces typing.
 */
export function TerminalDialogClient({ data }: { data: TerminalData }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminal = useRef<TerminalHandle>(null);
  // Commands queued while the dialog is opening. The surface mounts with the dialog and runs them
  // from onReady, once its handle is attached.
  const pending = useRef<string[]>([]);

  async function flush() {
    while (terminal.current && pending.current.length > 0) {
      const next = pending.current.shift();
      if (next) await terminal.current.run(next);
    }
  }

  function openWith(command?: string) {
    // Each opening greets with the command list, then runs what was asked for.
    pending.current = ["help", ...(command ? [command] : [])];
    setOpen(true);
    // If the surface is already mounted (a second request while open) there is no new onReady.
    void flush();
  }

  const onOpenRequest = useEffectEvent((command?: string) => openWith(command));

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<OpenTerminalDetail | undefined>).detail;
      onOpenRequest(typeof detail?.command === "string" ? detail.command : undefined);
    };
    window.addEventListener(UI_EVENTS.openTerminal, listener);
    return () => window.removeEventListener(UI_EVENTS.openTerminal, listener);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Terminal"
      description="Command line for this portfolio. Type help to list the commands, or ask a question."
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
        <TerminalSurface
          data={data}
          quick={QUICK_COMMANDS}
          quickVisible="mobile"
          inputRef={inputRef}
          handle={terminal}
          onReady={() => void flush()}
          onNavigate={() => setOpen(false)}
        />
      </div>
    </Dialog>
  );
}
