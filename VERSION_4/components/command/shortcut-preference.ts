import { useSyncExternalStore } from "react";

/**
 * On/off switch for the single-letter "g then <letter>" go-to shortcuts. WCAG 2.1.4 (Character Key
 * Shortcuts) requires a way to turn such shortcuts off, because speech-input users can trigger them
 * by accident. Cmd/Ctrl+K is exempt (it needs a modifier) and stays on. The choice lives only in
 * localStorage; if storage is blocked it still holds for the life of the page.
 */
const KEY = "ds-shortcuts";
const CHANGE_EVENT = "ds:shortcuts";

// Wins over storage once set, so the switch works even where storage throws.
let override: boolean | null = null;

export function readSequencesEnabled(): boolean {
  if (override !== null) return override;
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSequencesEnabled(enabled: boolean): void {
  override = enabled;
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    /* storage unavailable: the in-memory override above still applies */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** Server snapshot is "on" so hydration matches; the stored value arrives right after mount. */
export function useSequencesEnabled(): boolean {
  return useSyncExternalStore(subscribe, readSequencesEnabled, () => true);
}
