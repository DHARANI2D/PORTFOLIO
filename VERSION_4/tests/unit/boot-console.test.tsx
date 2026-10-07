// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOT_LINES, TOTAL_MS } from "@/components/hero/boot-sequence";

const KEY = "ds-boot-typed";

type Frame = (time: number) => void;

/** Manual clock: requestAnimationFrame callbacks run only when the test advances time. */
function installClock({ reduced = false }: { reduced?: boolean } = {}) {
  let now = 0;
  let queued: Frame[] = [];
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: Frame) => {
    queued.push(callback);
    return queued.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    queued = [];
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  return {
    advance(ms: number) {
      now += ms;
      const run = queued;
      queued = [];
      act(() => run.forEach((callback) => callback(now)));
    },
    pending: () => queued.length,
  };
}

/** The text of every row, exactly as a visitor would read it. */
function rows(container: HTMLElement): string[] {
  return [...container.querySelectorAll("p")].map((p) => (p.textContent ?? "").replace(/^> /, ""));
}

/** A fresh module copy per test: the component keeps a module-level "decided already" flag. */
async function load() {
  vi.resetModules();
  const mod = await import("@/components/hero/boot-console");
  return mod.BootConsole;
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe("BootConsole", () => {
  it("renders all five lines complete in the first render and keeps them while it types", async () => {
    const clock = installClock();
    const BootConsole = await load();
    const { container } = render(<BootConsole />);
    expect(rows(container)).toEqual([...BOOT_LINES]);

    // First visit: the sequence runs, and at no moment is a line blanked or shortened.
    for (let t = 0; t <= TOTAL_MS + 100; t += 40) {
      clock.advance(40);
      expect(rows(container)).toEqual([...BOOT_LINES]);
    }
    expect(clock.pending()).toBe(0);
  });

  it("types on the first ever visit and stores the flag in localStorage", async () => {
    const clock = installClock();
    const BootConsole = await load();
    const { container } = render(<BootConsole />);
    expect(localStorage.getItem(KEY)).toBe("1");
    expect(sessionStorage.getItem(KEY)).toBeNull();
    clock.advance(TOTAL_MS / 2);
    // Mid-sequence a caret is on screen; it has no width and is not text.
    expect(container.querySelector(".w-0")).not.toBeNull();
    clock.advance(TOTAL_MS);
    expect(container.querySelector(".w-0")).toBeNull();
  });

  it("does not play again in a new tab or on a later visit", async () => {
    localStorage.setItem(KEY, "1");
    const clock = installClock();
    const BootConsole = await load();
    const { container } = render(<BootConsole />);
    expect(clock.pending()).toBe(0);
    expect(container.querySelector(".w-0")).toBeNull();
    expect(rows(container)).toEqual([...BOOT_LINES]);
  });

  it("does not play again when the home page is mounted a second time in the same session", async () => {
    const clock = installClock();
    const BootConsole = await load();
    const first = render(<BootConsole />);
    clock.advance(TOTAL_MS + 100);
    first.unmount();
    localStorage.clear(); // even if storage was cleared, the finished sequence is not replayed
    const second = render(<BootConsole />);
    expect(clock.pending()).toBe(0);
    expect(rows(second.container)).toEqual([...BOOT_LINES]);
  });

  it("never plays under reduced motion, and leaves the first visit unused", async () => {
    const clock = installClock({ reduced: true });
    const BootConsole = await load();
    const { container } = render(<BootConsole />);
    expect(clock.pending()).toBe(0);
    expect(container.querySelector(".w-0")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("does not play when storage is blocked, because a first visit cannot be told apart", async () => {
    const clock = installClock();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const BootConsole = await load();
    const { container } = render(<BootConsole />);
    expect(clock.pending()).toBe(0);
    expect(rows(container)).toEqual([...BOOT_LINES]);
  });

  it("does not use up the first visit while it is hidden (recruiter view)", async () => {
    const clock = installClock();
    const style = document.createElement("style");
    style.textContent =
      '[data-view="recruiter"] [data-engineer-only] { display: none !important; }';
    document.head.append(style);
    document.documentElement.dataset.view = "recruiter";
    const BootConsole = await load();
    render(<BootConsole />);
    expect(clock.pending()).toBe(0);
    expect(localStorage.getItem(KEY)).toBeNull();
    style.remove();
  });

  it("is hidden from assistive technology", async () => {
    installClock();
    const BootConsole = await load();
    const { container } = render(<BootConsole />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
