import { useSyncExternalStore } from "react";

/**
 * Theme + view-mode preferences. The inline INIT_SCRIPT sets both attributes on <html> before
 * first paint (no flash). Everything after that goes through apply*() so storage, the DOM
 * attribute and subscribers stay in sync. Preferences live only in localStorage, never sent anywhere.
 */
export const THEME_KEY = "ds-theme";
export const VIEW_KEY = "ds-view";
export const PREFERENCES_EVENT = "ds:preferences";

export type Theme = "dark" | "light";
export type View = "engineer" | "recruiter";

export const DEFAULT_THEME: Theme = "dark";
export const DEFAULT_VIEW: View = "engineer";

/** Rendered once in <head> as a static inline script. Its sha256 is added to the CSP at build time. */
export const INIT_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_KEY}");var v=localStorage.getItem("${VIEW_KEY}");d.dataset.theme=t==="light"?"light":"dark";d.dataset.view=v==="recruiter"?"recruiter":"engineer"}catch(e){d.dataset.theme="dark";d.dataset.view="engineer"}})();`;

export function readTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function readView(): View {
  if (typeof document === "undefined") return DEFAULT_VIEW;
  return document.documentElement.dataset.view === "recruiter" ? "recruiter" : "engineer";
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, blocked): the preference just won't persist */
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  persist(THEME_KEY, theme);
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export function applyView(view: View) {
  document.documentElement.dataset.view = view;
  persist(VIEW_KEY, view);
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export function toggleTheme() {
  applyTheme(readTheme() === "dark" ? "light" : "dark");
}

function subscribe(cb: () => void) {
  window.addEventListener(PREFERENCES_EVENT, cb);
  return () => window.removeEventListener(PREFERENCES_EVENT, cb);
}

/** Client hook. Server snapshot is the default so hydration matches; the real value arrives after mount. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
}
export function useView(): View {
  return useSyncExternalStore(subscribe, readView, () => DEFAULT_VIEW);
}
