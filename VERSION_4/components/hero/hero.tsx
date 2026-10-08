import "@/components/hero/home-motion.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroTerminal } from "@/components/hero/hero-terminal";
import { GraphActivator } from "@/components/graph/graph-context";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { buildIdentity } from "@/components/hero/identity";
import type { GraphNodeId } from "@/content/schema";
import { getExperience } from "@/lib/content";
import { site } from "@/lib/site";
import { buildTerminalData } from "@/lib/terminal-data";

const SUPPORT_LINE =
  "Security Engineer working across SOC operations, detection engineering, cloud security, and AI-driven security systems.";

const PROOF = [
  "SOC EXPERIENCE",
  "DETECTION ENGINEERING",
  "AI SECURITY",
  "SECURITY AUTOMATION",
] as const;

const HERO_NODES: GraphNodeId[] = ["soc", "detection", "ai"];

/** Splits the headline before " that" so the second clause can recede. The text itself is unchanged. */
function splitHeadline(headline: string): [string, string] {
  const at = headline.indexOf(" that ");
  return at === -1 ? [headline, ""] : [headline.slice(0, at), headline.slice(at + 1)];
}

/**
 * Home hero. Server component: the name (the h1), the tagline, support line, identity row, proof strip and CTAs are
 * plain HTML. The one client leaf is the terminal.
 *
 * Every piece of text on the left is painted on the first frame: the H1 and the support line are
 * the largest text above the fold, and an opacity entrance would delay Largest Contentful Paint
 * until it ended. Only the right column (the terminal) rises in, with
 * CSS only, which is skipped entirely under reduced motion.
 */
export function Hero() {
  const [lead, tail] = splitHeadline(site.headline);
  const identity = buildIdentity(getExperience(), site.location);

  return (
    <section aria-labelledby="hero-heading" className="hero-glow relative pt-12 pb-16 md:pt-20 md:pb-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-x-10">
        <div className="min-w-0 lg:col-span-7">
          <p className="label-mono text-muted">{site.eyebrow}</p>
          <h1
            id="hero-heading"
            className="mt-5 text-4xl display break-words xs:text-5xl sm:text-6xl xl:text-7xl"
          >
            {site.name}
          </h1>
          <p className="mt-6 max-w-[26ch] text-2xl headline sm:text-3xl xl:text-4xl">
            {lead}
            {tail ? (
              <>
                {" "}
                <span className="text-muted">{tail}</span>
              </>
            ) : null}
          </p>
          <p className="mt-6 max-w-xl text-base text-muted md:text-lg">{SUPPORT_LINE}</p>

          {identity ? (
            // Who, what, where in one quiet row. Same in both views: it is the recruiter's answer.
            <div aria-label="Role and location" role="group" className="mt-8 space-y-2">
              <p className="label-mono text-foreground">{identity.role}</p>
              <p className="flex flex-wrap items-center gap-x-4 label-mono text-muted">
                <span>{identity.place}</span>
                <Link
                  href="/#contact"
                  className="group/link inline-flex min-h-11 items-center gap-2 text-foreground transition-colors duration-200 hover:text-accent motion-reduce:transition-none"
                >
                  CONTACT
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform duration-200 motion-safe:group-hover/link:translate-x-0.5"
                  />
                </Link>
              </p>
            </div>
          ) : null}

          <ul
            aria-label="Focus areas"
            className="mt-12 grid grid-cols-2 gap-px border bg-border md:grid-cols-4"
          >
            {PROOF.map((item) => (
              <li key={item} className="flex min-h-12 items-center bg-background px-4 py-3">
                <span className="label-mono text-muted">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink href="#systems" variant="primary" arrow>
              EXPLORE SYSTEMS
            </ButtonLink>
            <ButtonLink href="/resume/" variant="secondary">
              VIEW RESUME
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HeroTerminal data={buildTerminalData()} className="rise-in rise-in-2" />
        </div>
      </Container>
      <GraphActivator nodes={HERO_NODES} />
    </section>
  );
}
