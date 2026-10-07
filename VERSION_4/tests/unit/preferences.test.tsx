// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THEME,
  DEFAULT_VIEW,
  INIT_SCRIPT,
  PREFERENCES_EVENT,
  THEME_KEY,
  THEME_SWITCHING_ATTRIBUTE,
  VIEW_KEY,
  applyTheme,
  applyView,
  readTheme,
  readView,
  toggleTheme,
} from "@/lib/preferences";
import { useTheme, useView } from "@/lib/use-preferences";

const html = () => document.documentElement;

/** Runs the inline init script the way the browser does: as classic script text in the page. */
const runInitScript = () => new Function(INIT_SCRIPT)();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  html().classList.remove("js");
  html().removeAttribute(THEME_SWITCHING_ATTRIBUTE);
});

describe("defaults", () => {
  it("are dark and engineer", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(DEFAULT_VIEW).toBe("engineer");
  });

  it("are returned when the attributes are missing or unknown", () => {
    expect(readTheme()).toBe("dark");
    expect(readView()).toBe("engineer");
    html().dataset.theme = "purple";
    html().dataset.view = "ceo";
    expect(readTheme()).toBe("dark");
    expect(readView()).toBe("engineer");
  });
});

describe("apply and read round trip", () => {
  it("applyTheme sets the attribute, persists it and notifies subscribers", () => {
    const listener = vi.fn();
    window.addEventListener(PREFERENCES_EVENT, listener);
    applyTheme("light");
    expect(html().dataset.theme).toBe("light");
    expect(readTheme()).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PREFERENCES_EVENT, listener);
  });

  it("applyView sets the attribute, persists it and notifies subscribers", () => {
    const listener = vi.fn();
    window.addEventListener(PREFERENCES_EVENT, listener);
    applyView("recruiter");
    expect(html().dataset.view).toBe("recruiter");
    expect(readView()).toBe("recruiter");
    expect(localStorage.getItem(VIEW_KEY)).toBe("recruiter");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PREFERENCES_EVENT, listener);
  });

  it("applyTheme turns transitions off for two frames while the theme repaints", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    applyTheme("light");
    // On <html> from the moment of the change, so app/globals.css can switch transitions off.
    expect(html().hasAttribute(THEME_SWITCHING_ATTRIBUTE)).toBe(true);
    vi.advanceTimersToNextFrame();
    expect(html().hasAttribute(THEME_SWITCHING_ATTRIBUTE)).toBe(true);
    vi.advanceTimersToNextFrame();
    expect(html().hasAttribute(THEME_SWITCHING_ATTRIBUTE)).toBe(false);
    expect(html().dataset.theme).toBe("light");
  });

  it("toggleTheme flips between dark and light", () => {
    applyTheme("dark");
    toggleTheme();
    expect(readTheme()).toBe("light");
    toggleTheme();
    expect(readTheme()).toBe("dark");
  });

  it("a stored choice survives a fresh page: the init script restores it", () => {
    applyTheme("light");
    applyView("recruiter");
    html().removeAttribute("data-theme");
    html().removeAttribute("data-view");
    runInitScript();
    expect(html().dataset.theme).toBe("light");
    expect(html().dataset.view).toBe("recruiter");
  });

  it("still applies the choice when storage refuses the write", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    });
    expect(() => applyTheme("light")).not.toThrow();
    expect(html().dataset.theme).toBe("light");
  });
});

describe("INIT_SCRIPT", () => {
  it("evaluates to the defaults when nothing is stored", () => {
    runInitScript();
    expect(html().dataset.theme).toBe("dark");
    expect(html().dataset.view).toBe("engineer");
  });

  it("applies stored values", () => {
    localStorage.setItem(THEME_KEY, "light");
    localStorage.setItem(VIEW_KEY, "recruiter");
    runInitScript();
    expect(html().dataset.theme).toBe("light");
    expect(html().dataset.view).toBe("recruiter");
  });

  it("falls back to the defaults for values it does not know", () => {
    localStorage.setItem(THEME_KEY, "<img src=x onerror=alert(1)>");
    localStorage.setItem(VIEW_KEY, "admin");
    runInitScript();
    expect(html().dataset.theme).toBe("dark");
    expect(html().dataset.view).toBe("engineer");
  });

  it("evaluates to the defaults when reading storage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    html().dataset.theme = "light";
    html().dataset.view = "recruiter";
    expect(runInitScript).not.toThrow();
    expect(html().dataset.theme).toBe("dark");
    expect(html().dataset.view).toBe("engineer");
  });

  it("evaluates to the defaults when Storage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(runInitScript).not.toThrow();
    expect(html().dataset.theme).toBe("dark");
    expect(html().dataset.view).toBe("engineer");
  });

  it("evaluates to the defaults when even touching window.localStorage throws", () => {
    // Browsers throw a SecurityError on the property access itself when storage is blocked.
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    try {
      expect(runInitScript).not.toThrow();
      expect(html().dataset.theme).toBe("dark");
      expect(html().dataset.view).toBe("engineer");
    } finally {
      if (original) Object.defineProperty(globalThis, "localStorage", original);
    }
  });

  it('adds the "js" class: the server HTML ships without it, so CSS can hide script-only controls', () => {
    expect(html().classList.contains("js")).toBe(false);
    runInitScript();
    expect(html().classList.contains("js")).toBe(true);
    // Running it again (a second inline copy, a bfcache restore) does not duplicate or remove it.
    runInitScript();
    expect(
      html()
        .className.split(/\s+/)
        .filter((name) => name === "js"),
    ).toHaveLength(1);
  });

  it('adds the "js" class even when storage is blocked and keeps the classes already on <html>', () => {
    html().classList.add("font-variable");
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    runInitScript();
    expect(html().classList.contains("js")).toBe(true);
    expect(html().classList.contains("font-variable")).toBe(true);
    html().classList.remove("font-variable");
  });

  it("is a single self-contained statement that cannot end its own <script> element", () => {
    expect(INIT_SCRIPT).not.toMatch(/<\/?script/i);
    expect(INIT_SCRIPT).not.toMatch(/\beval\b|\bFunction\b|\bimport\b|\bfetch\b|XMLHttpRequest/);
    expect(INIT_SCRIPT).toContain(THEME_KEY);
    expect(INIT_SCRIPT).toContain(VIEW_KEY);
  });
});

describe("hooks", () => {
  it("useTheme and useView follow apply* calls", () => {
    const theme = renderHook(() => useTheme());
    const view = renderHook(() => useView());
    expect(theme.result.current).toBe("dark");
    expect(view.result.current).toBe("engineer");
    act(() => applyTheme("light"));
    act(() => applyView("recruiter"));
    expect(theme.result.current).toBe("light");
    expect(view.result.current).toBe("recruiter");
  });
});
