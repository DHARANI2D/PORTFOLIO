import {
  GroupHeading,
  NextCertifications,
  VerifiedCertifications,
} from "@/components/certifications/certification-groups";
import { GraphActivator } from "@/components/graph/graph-context";
import { Section } from "@/components/ui/section";
import { getCertifications } from "@/lib/content";

/**
 * "CERTIFICATIONS" (auto-numbered). Two groups that never blur: EARNED (linked to a public record
 * where one exists) and NEXT (planned: hollow marker, dashed rule, status tag). Years and links
 * appear only when the content has them. Server component.
 */
export function CertificationsSection() {
  const all = getCertifications();
  const verified = all.filter((cert) => cert.status === "verified");
  // Planned and in-progress. Neither is earned, and neither is ever shown as completed.
  const next = all.filter((cert) => cert.status !== "verified");

  return (
    <Section
      id="certifications"
      autoNumber
      label="CERTIFICATIONS"
      title="Credentials."
      intro="Where a public verification page exists, the credential links to it."
    >
      {verified.length > 0 ? (
        <div>
          <GroupHeading id="verified-heading" label="EARNED" count={verified.length} />
          <div className="mt-6">
            <VerifiedCertifications items={verified} labelledBy="verified-heading" />
          </div>
        </div>
      ) : null}

      {next.length > 0 ? (
        <div className="mt-12">
          <GroupHeading id="next-heading" label="NEXT" count={next.length} />
          <p className="mt-4 max-w-2xl text-muted">Stated direction. None of these are earned yet.</p>
          <div className="mt-6">
            <NextCertifications items={next} labelledBy="next-heading" />
          </div>
        </div>
      ) : null}

      {/* AWS and Azure for cloud, the Proofpoint AI specialisations for AI security. */}
      <GraphActivator nodes={["cloud", "ai"]} />
    </Section>
  );
}
