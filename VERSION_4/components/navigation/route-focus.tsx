"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** A pathname change this soon after a popstate is the Back or Forward button, not a link click. */
const TRAVERSAL_WINDOW_MS = 1500;
/** Frames to keep trying to focus <main>: about a second, enough for a closing overlay to leave. */
const MAX_FOCUS_FRAMES = 60;

const overlayIsOpen = () =>
  document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;

/**
 * Focuses <main id="main" tabIndex={-1}> without scrolling. While an overlay (the menu sheet, the
 * palette or the terminal) is still closing the page behind it is inert and focus would be refused,
 * and the overlay hands focus back to its opener when it unmounts, so this waits for it to go.
 * Returns a cancel function.
 */
function focusMainWhenReady(): () => void {
  let frame = 0;
  let handle = 0;
  const tick = () => {
    frame += 1;
    const main = document.getElementById("main");
    if (main && !overlayIsOpen()) {
      main.focus({ preventScroll: true });
      if (document.activeElement === main) return;
    }
    if (frame < MAX_FOCUS_FRAMES) handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(handle);
}

/**
 * Starts every client-side page change at the top with focus in the page.
 *
 * Without it a link click leaves keyboard and screen reader users on the link they pressed, and
 * the new page can land partway down (the router scrolls to a segment while `scroll-behavior:
 * smooth` is animating). After the pathname changes this scrolls to the top at once, whatever the
 * CSS scroll-behavior, and moves focus to <main> so the next Tab starts inside the new page and the
 * heading is in view.
 *
 * It leaves alone: the first load (nothing changed), a change that carries a #hash (the browser
 * scrolls to that element), and the scroll position on Back and Forward (focus still moves, the
 * page keeps the position it is restoring). Renders nothing.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const lastPopState = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    const onPopState = () => {
      lastPopState.current = performance.now();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (window.location.hash) return;
    const traversal = performance.now() - lastPopState.current < TRAVERSAL_WINDOW_MS;
    if (!traversal) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return focusMainWhenReady();
  }, [pathname]);

  return null;
}
