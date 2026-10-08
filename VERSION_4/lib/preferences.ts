/**
 * Theme preference. The inline INIT_SCRIPT sets the attribute on <html> before
 * first paint (no flash). Everything after that goes through apply*() so storage, the DOM
 * attribute and subscribers stay in sync. Preferences live only in localStorage, never sent anywhere.
 */
export const THEME_KEY = "ds-theme";
export const PREFERENCES_EVENT = "ds:preferences";

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

/**
 * Rendered once in <head> as a static inline script. Its sha256 is added to the CSP at build time.
 * First it adds the "js" class to <html>: the server HTML ships without it, so CSS can tell a page
 * with scripts (html.js) from one without, and hide controls that only work with JavaScript
 * (`[data-js-only]` in app/globals.css). It runs before the try block so a blocked localStorage
 * cannot stop it. Then it restores the stored theme, or the default.
 */
export const INIT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("${THEME_KEY}");d.dataset.theme=t==="light"?"light":"dark"}catch(e){d.dataset.theme="dark"}})();`;

export function readTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, blocked): the preference just won't persist */
  }
}

/** Set on <html> while a theme switch repaints; app/globals.css turns every transition off for it. */
export const THEME_SWITCHING_ATTRIBUTE = "data-theme-switching";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Without this, hundreds of elements fade their colours over 200 ms at once and the click takes
  // several frames of style work on a phone. The attribute is dropped after the change has painted.
  root.setAttribute(THEME_SWITCHING_ATTRIBUTE, "");
  root.dataset.theme = theme;
  persist(THEME_KEY, theme);
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.removeAttribute(THEME_SWITCHING_ATTRIBUTE)),
  );
}

export function toggleTheme() {
  applyTheme(readTheme() === "dark" ? "light" : "dark");
}
