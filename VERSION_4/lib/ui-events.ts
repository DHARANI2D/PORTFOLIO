/** Tiny window-event bus so the header, footer and palette can open overlays without prop drilling. */
export const UI_EVENTS = {
  openPalette: "ds:open-palette",
  openTerminal: "ds:open-terminal",
} as const;

export type OpenTerminalDetail = { command?: string };

export const openCommandPalette = () => window.dispatchEvent(new Event(UI_EVENTS.openPalette));
/** Opens the terminal; if `command` is given it is executed on open (e.g. "status"). */
export const openTerminal = (command?: string) =>
  window.dispatchEvent(
    new CustomEvent<OpenTerminalDetail>(UI_EVENTS.openTerminal, { detail: { command } }),
  );
