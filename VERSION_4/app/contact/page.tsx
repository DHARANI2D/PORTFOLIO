import type { Metadata } from "next";
import { PageHeader } from "@/components/career/page-header";
import { ContactBlock } from "@/components/contact/contact-block";
import { GraphActivator } from "@/components/graph/graph-context";
import { Container } from "@/components/ui/container";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description:
    "Contact Dharanidharan Senthilkumar for security engineering, research collaborations, or interesting systems work.",
  path: "/contact/",
});

// An inline link inside a sentence: WCAG 2.5.8 exempts it from the minimum target size.
const linkClass =
  "text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none";

/**
 * /contact. The h1 is the small mono eyebrow, so the visual headline is the shared block's
 * "Let's build something secure." (an h2 here). Public information stays at what the owner already
 * lists. The form only composes a mailto: link. Server component.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader id="contact-heading" index="07" title="Contact" titleStyle="eyebrow" />

      <section aria-label="Get in touch" className="pb-24 md:pb-32">
        <Container>
          <ContactBlock headingAs="h2" />
          <p className="mt-16 border-t pt-8 text-sm text-muted">
            Found a security issue on this site? Details are in{" "}
            <a href="/.well-known/security.txt" className={linkClass}>
              security.txt
            </a>
            .
          </p>
        </Container>
        <GraphActivator nodes={["soc", "detection", "ai"]} />
      </section>
    </>
  );
}
