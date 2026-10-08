import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

type BrandMarkProps = {
  size?: number;
  className?: string;
  /** Supply a title to make the mark meaningful to assistive tech. Decorative (aria-hidden) by default. */
  title?: string;
};

/**
 * Brand glyph: a filled core (the signal), one thin ring (the boundary it is observed through)
 * and a short arc (a ray: observation becomes visibility). Geometric, one accent dot, no shield.
 * Core uses the accent token via a class so it follows the theme; the rest is currentColor.
 */
export function BrandMark({ size = 24, className, title }: BrandMarkProps) {
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

/** "DS / TRACE" lockup. The accessible name keeps the visible text so voice control matches it. */
export function Logo({ className, onClick }: LogoProps) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label={`${site.brand}, home`}
      className={cn("group/logo inline-flex min-h-11 items-center gap-3 rounded-md", className)}
    >
      <BrandMark className="text-foreground transition-transform duration-500 motion-safe:group-hover/logo:rotate-[30deg] motion-reduce:transition-none" />
      <span className="font-mono text-xs font-medium tracking-[0.18em] whitespace-nowrap text-foreground">
        {site.handle} <span className="text-muted">/</span> {site.brandName}
      </span>
    </Link>
  );
}

/**
 * Accent status dot. The ping is three pulses, then the dot rests (the animation is finite, see
 * .status-ping in app/globals.css: nothing may animate for more than 5 seconds). Reduced motion
 * never gets the keyframes. `pulse={false}` renders a still dot (footer).
 */
export function StatusDot({ pulse = true, className }: { pulse?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-1.5 shrink-0", className)}>
      {pulse ? (
        <span className="status-ping absolute inset-0 rounded-full bg-accent opacity-40" />
      ) : null}
      <span className="status-dot relative size-1.5 rounded-full bg-accent" />
    </span>
  );
}

/**
 * "● AVAILABLE FOR SECURITY ENGINEERING" (copy from lib/site.ts). One line from the `xs` breakpoint
 * up; below it the line wraps, because at 320px the nowrap text is 283px in a 272px column.
 */
export function AvailabilityStatus({
  className,
  pulse = true,
}: {
  className?: string;
  /** false renders a still dot, for places that are rarely on screen when the page loads (footer). */
  pulse?: boolean;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 label-mono text-muted xs:items-center xs:whitespace-nowrap",
        className,
      )}
    >
      <StatusDot pulse={pulse} className="mt-[0.2rem] xs:mt-0" />
      <span>{site.availability}</span>
    </p>
  );
}
