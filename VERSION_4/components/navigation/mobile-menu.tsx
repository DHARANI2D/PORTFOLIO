"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Search, Terminal, X } from "lucide-react";
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { AvailabilityStatus, Logo } from "@/components/navigation/logo";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { ViewToggle } from "@/components/navigation/view-toggle";
import { primaryNav } from "@/lib/site";
import { openCommandPalette, openTerminal } from "@/lib/ui-events";
import { cn } from "@/lib/utils";

/** "page" = this exact route, "section" = a child route of it (e.g. /systems/witness/), null = elsewhere. */
export function getNavState(pathname: string, href: string): "page" | "section" | null {
  const normalise = (value: string) => (value.endsWith("/") ? value : `${value}/`);
  const current = normalise(pathname);
  if (current === href) return "page";
  return current.startsWith(href) ? "section" : null;
}

// primaryNav labels are uppercase mono labels; the sheet shows them as large sentence-case words.
const toTitleCase = (label: string) => label.charAt(0) + label.slice(1).toLowerCase();

// Matches Tailwind's `lg`: the header switches to the full desktop layout at this width.
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Full-screen navigation sheet for viewports below `lg`. Everything the desktop header holds is
 * here, stacked, with 44px+ targets. The Dialog supplies the focus trap, Esc, scroll lock and
 * focus restore to the MENU button.
 */
export function MobileMenu() {
  const pathname = usePathname();
  // Open state is tied to the route it was opened on, so any navigation (including browser
  // back/forward) closes the sheet without an effect.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const open = openedFor === pathname;
  const setOpen = (next: boolean) => setOpenedFor(next ? pathname : null);
  // Work to run once the sheet has finished closing (opening the palette or terminal).
  const pendingAction = useRef<(() => void) | null>(null);
  // When we leave via a link or another overlay, focus must not jump back to the MENU button.
  const skipFocusRestore = useRef(false);

  function openMenu() {
    skipFocusRestore.current = false;
    setOpen(true);
  }

  function closeMenu(afterClose?: () => void) {
    pendingAction.current = afterClose ?? null;
    skipFocusRestore.current = true;
    setOpen(false);
  }

  function handleOpenChangeComplete(isOpen: boolean) {
    if (isOpen) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }

  // The sheet has no trigger on desktop; close it if the viewport grows past the breakpoint.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpenedFor(null);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Keep ctrl/cmd/shift-click (open in new tab) from closing the sheet without navigating.
  const closeOnPlainClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    closeMenu();
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openMenu}
      >
        <Menu aria-hidden className="size-4" />
        Menu
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        variant="sheet"
        title="Menu"
        hideTitle
        closeButton="none"
        finalFocus={() => !skipFocusRestore.current}
        onOpenChangeComplete={handleOpenChangeComplete}
      >
        <Container className="flex min-h-full flex-col pb-8">
          <div className="flex h-16 shrink-0 items-center justify-between">
            <Logo onClick={closeOnPlainClick} />
            <DialogClose className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <X aria-hidden className="size-4" />
              Close
            </DialogClose>
          </div>

          <nav aria-label="Primary" className="mt-8">
            <ul className="border-t">
              {primaryNav.map((item, index) => {
                const state = getNavState(pathname, item.href);
                return (
                  <li key={item.href} className="border-b">
                    <Link
                      href={item.href}
                      onClick={closeOnPlainClick}
                      aria-current={state === "page" ? "page" : state ? "true" : undefined}
                      className={cn(
                        "flex min-h-16 items-center justify-between gap-4 py-3 transition-colors duration-200 motion-reduce:transition-none",
                        state ? "text-accent" : "text-foreground hover:text-accent",
                      )}
                    >
                      <span className="flex items-baseline gap-4">
                        <Label aria-hidden>{String(index + 1).padStart(2, "0")}</Label>
                        <span className="text-3xl headline">{toTitleCase(item.label)}</span>
                      </span>
                      {state ? (
                        <Label aria-hidden>Current</Label>
                      ) : (
                        <ArrowRight aria-hidden className="size-4 text-muted" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <ButtonLink
            href="/resume/"
            variant="primary"
            arrow
            onClick={closeOnPlainClick}
            className="mt-8 w-full"
          >
            Resume
          </ButtonLink>

          <div className="mt-8 flex flex-col gap-4">
            <ViewToggle stretch />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ThemeToggle withLabel className="w-full" />
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => closeMenu(openCommandPalette)}
              >
                <Search aria-hidden className="size-4" />
                Search
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => closeMenu(() => openTerminal())}
              >
                <Terminal aria-hidden className="size-4" />
                Terminal
              </Button>
            </div>
          </div>

          <AvailabilityStatus className="mt-auto pt-12" />
        </Container>
      </Dialog>
    </>
  );
}
