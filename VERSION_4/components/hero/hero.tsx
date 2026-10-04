import "@/components/hero/home-motion.css";
import { BootConsole } from "@/components/hero/boot-console";
import { HeliosCore } from "@/components/hero/helios-core";
import { GraphActivator } from "@/components/graph/graph-context";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { GraphNodeId } from "@/content/schema";
import { site } from "@/lib/site";

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
 * Home hero. Server component: the headline, support line, proof strip and CTAs are plain HTML.
 * Client leaves are limited to the Helios panel and the boot console.
 * The H1 is not animated (it is the LCP element); everything else rises in with CSS only, which
 * also runs without JS and is skipped entirely under reduced motion.
 */
export function Hero() {
  const [lead, tail] = splitHeadline(site.headline);

  return (
    <section aria-labelledby="hero-heading" className="relative pt-12 pb-24 md:pt-24 md:pb-32">
      <Container className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-x-6">
        <div className="lg:col-span-7">
          <p className="label-mono text-muted">{site.eyebrow}</p>
          <h1
            id="hero-heading"
            className="mt-6 text-4xl display sm:text-5xl md:text-6xl xl:text-7xl"
          >
            {lead}
            {tail ? (
              <>
                {" "}
                <span className="text-muted">{tail}</span>
              </>
            ) : null}
          </h1>
          <p className="rise-in rise-in-1 mt-8 max-w-xl text-lg text-muted md:text-xl">
            {SUPPORT_LINE}
          </p>

          <ul
            aria-label="Focus areas"
            className="rise-in rise-in-2 mt-12 grid grid-cols-2 gap-px border bg-border md:grid-cols-4"
          >
            {PROOF.map((item) => (
              <li key={item} className="flex min-h-12 items-center bg-background px-4 py-3">
                <span className="label-mono text-muted">{item}</span>
              </li>
            ))}
          </ul>

          <div className="rise-in rise-in-3 mt-12 flex flex-wrap gap-4">
            <ButtonLink href="#systems" variant="primary" arrow>
              EXPLORE SYSTEMS
            </ButtonLink>
            <ButtonLink href="/resume/" variant="secondary">
              VIEW RESUME
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HeliosCore className="rise-in rise-in-2" />
          <BootConsole className="rise-in rise-in-4 mt-6" />
        </div>
      </Container>
      <GraphActivator nodes={HERO_NODES} />
    </section>
  );
}
