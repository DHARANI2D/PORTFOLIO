import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Tests that opt into jsdom share one window per file, so reset what the site writes to it.
afterEach(() => {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-view");
  document.body.replaceChildren();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* storage can be stubbed to throw inside a test */
  }
});
