import type { Metadata } from "next";
import { PageHeader, rise } from "@/components/career/page-header";
import {
  GroupHeading,
  NextCertifications,
  VerifiedCertifications,
} from "@/components/certifications/certification-groups";
import { GraphActivator } from "@/components/graph/graph-context";
import { Container } from "@/components/ui/container";
import { getCertifications } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const all = getCertifications();
const verified = all.filter((cert) => cert.status === "verified");
// Planned and in-progress. Neither is earned, and neither is ever shown as completed.
const next = all.filter((cert) => cert.status !== "verified");

const issuers = [...new Set(verified.flatMap((cert) => (cert.issuer ? [cert.issuer] : [])))];

export const metadata: Metadata = buildMetadata({
  title: "Certifications",
  description: `Verified certifications from ${issuers.slice(0, -1).join(", ")} and ${issuers.at(-1)}, and the credentials planned next.`,
  path: "/certifications/",
});

/**
 * /certifications. Two groups that never blur: VERIFIED (earned, linked to a public record where
 * one exists) and NEXT (planned, hollow marker, dashed rule, status tag). Years and links appear
 * only when the content has them. Server component.
 */
export default function CertificationsPage() {
  return (
    <>
      <PageHeader id="certifications-heading" label="CREDENTIALS" title="Certifications">
        <p className={cn("mt-8 max-w-2xl text-lg text-muted md:text-xl", rise, "delay-100")}>
          Verified credentials link to their issuer where public.
        </p>
      </PageHeader>

      {verified.length > 0 ? (
        <section aria-labelledby="verified-heading" className="border-t py-16 md:py-24">
          <Container>
            <GroupHeading id="verified-heading" label="VERIFIED" count={verified.length} />
            <VerifiedCertifications items={verified} labelledBy="verified-heading" />
          </Container>
          {/* AWS and Azure for cloud, the Proofpoint AI specialisations for AI security. */}
          <GraphActivator nodes={["cloud", "ai"]} />
        </section>
      ) : null}

      {next.length > 0 ? (
        <section aria-labelledby="next-heading" className="border-t py-16 md:py-24">
          <Container>
            <GroupHeading id="next-heading" label="NEXT" count={next.length} />
            <p className="mt-6 max-w-2xl text-muted">
              Stated direction. None of these are earned yet.
            </p>
            <div className="mt-8">
              <NextCertifications items={next} labelledBy="next-heading" />
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}
