"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AvailabilityStatus, Logo } from "@/components/navigation/logo";
import { getNavState, MobileMenu } from "@/components/navigation/mobile-menu";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { ViewToggle } from "@/components/navigation/view-toggle";
import { primaryNav } from "@/lib/site";
import { openCommandPalette, openTerminal } from "@/lib/ui-events";
import { cn } from "@/lib/utils";

const subscribeNever = () => () => {};

/** Mac-style shortcut label. The server snapshot is the Mac label; other platforms swap after mount. */
function useIsApplePlatform(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent),
    () => true,
  );
}

function PaletteButton() {
  const isApple = useIsApplePlatform();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => openCommandPalette()}
      // Fixed width so the Mac / non-Mac label swap cannot shift the cluster.
      className="w-16 px-0"
    >
      <span className="sr-only">Open command palette </span>
      <kbd className="font-mono">{isApple ? "⌘K" : "CTRL K"}</kbd>
    </Button>
  );
}

/** Text button, xl only: below 1280px the right cluster has no room for it (it is in the mobile sheet). */
function TerminalButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => openTerminal()}
      className="hidden px-3 xl:inline-flex"
    >
      <span aria-hidden>[ </span>Terminal<span aria-hidden> ]</span>
    </Button>
  );
}

/**
 * Sticky site header. One client boundary on purpose: the active link, both toggles, the palette and
 * terminal triggers and the mobile sheet all need client state, and the markup is small.
 * Server-rendered HTML is complete without JS (links work; only the toggles need it).
 *
 * Desktop (lg+): logo | nav | view, theme, palette, resume. At xl the availability line sits under
 * the logo and the terminal button appears: the 1200px content width has no room for either in the
 * right cluster, and the lg width (944px at 1024) is already close to full.
 * Below lg: logo + MENU, with everything else in the sheet.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const onResume = getNavState(pathname, "/resume/") !== null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-xs">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex shrink-0 flex-col justify-center">
          <Logo className="xl:min-h-8" />
          <AvailabilityStatus className="hidden xl:flex" />
        </div>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center">
            {primaryNav.map((item) => {
              const state = getNavState(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={state === "page" ? "page" : state ? "true" : undefined}
                    className={cn(
                      "relative inline-flex h-9 items-center rounded-md px-2 label-mono transition-colors duration-200 hover:text-foreground motion-reduce:transition-none",
                      state ? "text-accent" : "text-muted",
                    )}
                  >
                    {item.label}
                    {state ? (
                      <span aria-hidden className="absolute inset-x-2 bottom-1 h-px bg-accent" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <ViewToggle compact />
          <ThemeToggle />
          <PaletteButton />
          <TerminalButton />
          <ButtonLink
            href="/resume/"
            variant="secondary"
            size="sm"
            aria-current={onResume ? "page" : undefined}
          >
            Resume
          </ButtonLink>
        </div>

        <div className="lg:hidden">
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
