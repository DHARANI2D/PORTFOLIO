import type { Metadata } from "next";
import Link from "next/link";
import { emailHref } from "@/components/career/mailto";
import { PageHeader, rise } from "@/components/career/page-header";
import { GraphActivator } from "@/components/graph/graph-context";
import { Container } from "@/components/ui/container";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Reporting a security issue with this site",
  description:
    "How to report a security issue with this website or its repository: contact by email, what is in scope and what to include.",
  path: "/security/",
});

const linkClass =
  "text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none";

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t py-12 md:py-16">
      <Container className="grid gap-6 lg:grid-cols-12 lg:gap-x-6">
        <h2 id={id} className="label-mono text-foreground lg:col-span-4">
          {title}
        </h2>
        <div className="max-w-2xl space-y-4 text-muted lg:col-span-8">{children}</div>
      </Container>
    </section>
  );
}

/**
 * /security. A short, plain disclosure page for this website: who to write to, what is in scope,
 * what to include. It makes no promises about response times or legal protection, because the
 * site is a personal portfolio, not a service. Server component.
 */
export default function SecurityPage() {
  return (
    <>
      <PageHeader
        id="security-heading"
        title="Reporting a security issue with this site"
        titleStyle="eyebrow"
      >
        <p className={cn("mt-8 max-w-3xl text-3xl headline md:text-5xl", rise, "delay-100")}>
          If you find a security problem with this website, please tell me by email.
        </p>
      </PageHeader>

      <div>
        <Block id="contact-heading" title="HOW TO REPORT">
          <p>
            Write to{" "}
            <a href={emailHref} className={linkClass}>
              {site.email}
            </a>
            . The same address is published in{" "}
            <a href="/.well-known/security.txt" className={linkClass}>
              security.txt
            </a>
            .
          </p>
        </Block>

        <Block id="scope-heading" title="IN SCOPE">
          <p>
            This website and its source repository: the pages served from{" "}
            <span className="font-mono text-sm text-foreground">{new URL(site.url).host}</span>,
            their HTTP headers and the code that builds them.
          </p>
          <p>
            Third-party services that the site links to, such as LinkedIn, GitHub, Credly or Google
            Drive, are out of scope. Please report problems with them to those services.
          </p>
        </Block>

        <Block id="include-heading" title="WHAT TO INCLUDE">
          <ul className="list-disc space-y-2 pl-5 marker:text-muted">
            <li>The page or URL where you saw the problem.</li>
            <li>The steps to reproduce it, and what you expected to happen instead.</li>
            <li>The browser and version, if it depends on the browser.</li>
            <li>Any proof of concept, kept to what is needed to show the problem.</li>
          </ul>
          <p>Please do not access data that is not yours or disrupt the site while testing.</p>
        </Block>

        <Block id="expect-heading" title="WHAT TO EXPECT">
          <p>
            This is a personal site, so there are no response-time commitments. Reports are read and
            answered as time allows. Related:{" "}
            <Link href="/privacy/" className={linkClass}>
              privacy
            </Link>
            .
          </p>
        </Block>

        <GraphActivator nodes={["soc", "detection"]} />
      </div>
    </>
  );
}
