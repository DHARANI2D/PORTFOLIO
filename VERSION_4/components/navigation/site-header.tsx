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

/** The Resume button is not in primaryNav (it is a button on desktop); the no-JS row lists it as a link. */
const resumeLink = { href: "/resume/", label: "RESUME" } as const;

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
 * Server-rendered HTML is complete without JS: the nav links work, the controls that need scripts
 * are marked data-js-only (hidden until the init script adds html.js), and below lg a <noscript>
 * link row stands in for the MENU button.
 *
 * Desktop (lg+): logo | nav | view, theme, palette, resume. At xl the availability line sits under
 * the logo, the terminal button appears and "VIEW AS" is spelled out: the 1200px content width has
 * no room for these in the right cluster below that, and the lg width (944px at 1024) is already
 * close to full. At xl the nav items and the gaps are one step tighter so the row still fits at
 * exactly 1280px (checked from 1280 to 1440). The availability line is also in the footer and the
 * menu sheet, so it is on screen somewhere at every width.
 * Below lg: logo + MENU, with everything else in the sheet.
 *
 * The bar is opaque: a translucent, blurred bar lets headlines and buttons ghost through the logo
 * and the nav, and the design brief rules out glass effects.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const onResume = getNavState(pathname, "/resume/") !== null;

  return (
    <header data-site-header className="sticky top-0 z-40 border-b bg-background">
      <Container className="flex h-16 items-center justify-between gap-4 xl:gap-3">
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
                      "relative inline-flex h-9 items-center rounded-md px-2 label-mono transition-colors duration-200 hover:text-foreground motion-reduce:transition-none xl:px-1.5",
                      state ? "text-accent" : "text-muted",
                    )}
                  >
                    {item.label}
                    {/* A border, not a fill: forced-colors mode keeps borders and drops backgrounds. */}
                    {state ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-2 bottom-1 border-b border-accent xl:inset-x-1.5"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <div data-js-only className="contents">
            <ViewToggle compact />
            <ThemeToggle />
            <PaletteButton />
            <TerminalButton />
          </div>
          <ButtonLink
            href="/resume/"
            variant="secondary"
            size="sm"
            aria-current={onResume ? "page" : undefined}
          >
            Resume
          </ButtonLink>
        </div>

        <div data-js-only className="lg:hidden">
          <MobileMenu />
        </div>
      </Container>

      {/* No JavaScript: the MENU button is hidden, so below lg this row is the navigation. */}
      <noscript>
        <nav aria-label="Primary" className="border-t lg:hidden">
          <Container>
            <ul className="flex flex-wrap gap-x-5">
              {[...primaryNav, resumeLink].map((item) => {
                const state = getNavState(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={state === "page" ? "page" : state ? "true" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center label-mono hover:text-foreground",
                        state ? "text-accent underline underline-offset-4" : "text-muted",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Container>
        </nav>
      </noscript>
    </header>
  );
}
