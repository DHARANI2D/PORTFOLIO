import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

type HeliosMarkProps = {
  size?: number;
  className?: string;
  /** Supply a title to make the mark meaningful to assistive tech. Decorative (aria-hidden) by default. */
  title?: string;
};

/**
 * Helios glyph: a filled core (the signal), one thin ring (the boundary it is observed through)
 * and a short arc (a ray: observation becomes visibility). Geometric, one accent dot, no shield.
 * Core uses the accent token via a class so it follows the theme; the rest is currentColor.
 */
export function HeliosMark({ size = 24, className, title }: HeliosMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      focusable="false"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M22.25 5.17A12.5 12.5 0 0 1 27.75 11.72"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.25" className="fill-accent" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

/** "DS / HELIOS" lockup. The accessible name keeps the visible text so voice control matches it. */
export function Logo({ className, onClick }: LogoProps) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label={`${site.brand}, home`}
      className={cn("group/logo inline-flex min-h-11 items-center gap-3 rounded-md", className)}
    >
      <HeliosMark className="text-foreground transition-transform duration-500 motion-safe:group-hover/logo:rotate-[30deg] motion-reduce:transition-none" />
      <span className="font-mono text-xs font-medium tracking-[0.18em] whitespace-nowrap text-foreground">
        {site.handle} <span className="text-muted">/</span> HELIOS
      </span>
    </Link>
  );
}

/** Accent status dot. The ping runs only when motion is allowed; reduced motion gets a still dot. */
export function StatusDot({ pulse = true, className }: { pulse?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-1.5 shrink-0", className)}>
      {pulse ? (
        <span className="absolute inset-0 rounded-full bg-accent opacity-40 motion-safe:animate-ping" />
      ) : null}
      <span className="relative size-1.5 rounded-full bg-accent" />
    </span>
  );
}

/** "● AVAILABLE FOR SECURITY ENGINEERING" (copy from lib/site.ts). */
export function AvailabilityStatus({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 label-mono whitespace-nowrap text-muted", className)}>
      <StatusDot />
      <span>{site.availability}</span>
    </p>
  );
}
