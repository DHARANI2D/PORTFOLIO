/** Tiny window-event bus so the header and the menu can open the terminal without prop drilling. */
export const UI_EVENTS = {
  openTerminal: "ds:open-terminal",
} as const;

export type OpenTerminalDetail = { command?: string };

/** Opens the terminal; if `command` is given it is executed on open (e.g. "status"). */
export const openTerminal = (command?: string) =>
  window.dispatchEvent(
    new CustomEvent<OpenTerminalDetail>(UI_EVENTS.openTerminal, { detail: { command } }),
  );
