import type { Metadata } from "next";
import { emailHref } from "@/components/career/mailto";
import { PageHeader, rise } from "@/components/career/page-header";
import { GraphActivator } from "@/components/graph/graph-context";
import { Container } from "@/components/ui/container";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Privacy",
  description:
    "What this site collects, what stays on your device, and which external services it touches.",
  path: "/privacy/",
});

const LEAD =
  "This website collects minimal information. No unnecessary tracking. No sale of personal data. External services are limited to required functionality.";

/** Literal on purpose: the policy states a date, it does not compute one. */
const LAST_UPDATED = { iso: "2026-10-04", text: "4 October 2026" } as const;

/**
 * Everything this site writes to browser storage. Keep in sync with lib/preferences.ts (theme,
 * view), components/command/shortcut-preference.ts and components/hero/boot-console.tsx. If a new
 * key is added anywhere, it must be listed here.
 */
const STORED = [
  { key: "ds-theme", where: "localStorage", what: "Your theme choice, dark or light." },
  { key: "ds-view", where: "localStorage", what: "Your view choice, engineer or recruiter." },
  {
    key: "ds-shortcuts",
    where: "localStorage",
    what: "Whether the single-key go-to keyboard shortcuts are on.",
  },
  {
    key: "ds-boot-typed",
    where: "localStorage",
    what: "A flag so the home page intro plays once per browser, on your first visit only.",
  },
] as const;

const linkClass =
  "text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none";

function PolicySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
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

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-sm text-foreground">{children}</code>;
}

/**
 * /privacy. Plain language, and checked against the code: the site is a static export with no
 * cookies, analytics or third-party scripts. Server component.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader id="privacy-heading" label="PRIVACY" title="Privacy">
        <p
          className={cn(
            "mt-8 max-w-3xl text-2xl leading-snug font-medium tracking-tight md:text-3xl",
            rise,
            "delay-100",
          )}
        >
          {LEAD}
        </p>
        <p className={cn("mt-8 label-mono text-muted", rise, "delay-200")}>
          Last updated: <time dateTime={LAST_UPDATED.iso}>{LAST_UPDATED.text}</time>
        </p>
      </PageHeader>

      <div>
        <PolicySection id="collects-heading" title="WHAT THE SITE COLLECTS">
          <p>
            The site itself collects nothing about you. It has no accounts, no tracking and no
            analytics, and it sets no cookies. It loads no third-party scripts, fonts or other
            assets. Every page is a static file.
          </p>
        </PolicySection>

        <PolicySection id="device-heading" title="STORED ON YOUR DEVICE">
          <p>
            Your browser keeps a few small settings so the site remembers your choices. They stay on
            your device and are never sent anywhere. You can clear them at any time in your
            browser&apos;s site settings.
          </p>
          <dl className="border-b">
            {STORED.map((item) => (
              <div key={item.key} className="border-t py-4">
                <dt className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  <Code>{item.key}</Code>
                  <span className="label-mono text-muted">{item.where}</span>
                </dt>
                <dd className="mt-2">{item.what}</dd>
              </div>
            ))}
          </dl>
          <p>If your browser blocks storage, the site still works. It just forgets the settings.</p>
        </PolicySection>

        <PolicySection id="form-heading" title="CONTACT FORM">
          <p>
            The contact form builds an email draft from what you type and hands it to your own email
            client with a <Code>mailto:</Code> link. Nothing is sent from this site and nothing you
            type is stored here. Anything you then send goes through your email provider.
          </p>
        </PolicySection>

        <PolicySection id="github-heading" title="GITHUB ACTIVITY">
          <p>
            The build log on the home page lists public repositories from GitHub. That data is
            fetched once, when the site is built. Your browser does not contact GitHub when you
            visit, unless you follow a link.
          </p>
        </PolicySection>

        <PolicySection id="hosting-heading" title="HOSTING">
          <p>
            The site is served as static files by a hosting provider. Hosting providers commonly
            keep standard server access logs, such as IP address, request time and browser type.
            Those logs are outside this site&apos;s control and are governed by the provider&apos;s
            own policy.
          </p>
        </PolicySection>

        <PolicySection id="external-heading" title="EXTERNAL LINKS">
          <p>
            Links to LinkedIn, GitHub, Hashnode, Credly, Microsoft Learn and Google Drive (the
            resume PDF and one credential) leave this site and open in a new tab. Those services are
            governed by their own privacy policies. The links do not pass on the page you came from.
          </p>
        </PolicySection>

        <PolicySection id="security-heading" title="SECURITY">
          <p>
            Security contact details for this site are published in{" "}
            <a href="/.well-known/security.txt" className={linkClass}>
              security.txt
            </a>{" "}
            at <Code>/.well-known/security.txt</Code>. If you find a problem, please report it
            there.
          </p>
        </PolicySection>

        <PolicySection id="contact-heading" title="CONTACT">
          <p>
            Questions about this policy:{" "}
            <a href={emailHref} className={linkClass}>
              {site.email}
            </a>
            .
          </p>
        </PolicySection>

        {/* A policy about trust and control: the SOC and cloud nodes. */}
        <GraphActivator nodes={["soc", "cloud"]} />
      </div>
    </>
  );
}
