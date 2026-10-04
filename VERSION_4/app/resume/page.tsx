import type { Metadata } from "next";
import { PageHeader, rise } from "@/components/career/page-header";
import { GraphActivator } from "@/components/graph/graph-context";
import { PrintButton } from "@/components/resume/print-button";
import { ResumePreview } from "@/components/resume/resume-preview";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Resume",
  description: `Resume of ${site.name}, Security Engineer. Preview it here, print it, or download the PDF.`,
  path: "/resume/",
});

/**
 * /resume. A header with the actions, then a miniature resume built from the site's content. No
 * PDF embed: the PDF lives on Google Drive and is a plain external link, so no third-party frame
 * or script runs on this site. The header is hidden in print, so only the paper prints.
 */
export default function ResumePage() {
  return (
    <>
      <PageHeader id="resume-heading" label="RESUME" title="Resume" className="print:hidden">
        <p
          className={cn(
            "mt-8 text-2xl leading-snug font-medium tracking-tight md:text-3xl",
            rise,
            "delay-100",
          )}
        >
          {site.name} <span className="text-muted">/ Security Engineer</span>
        </p>

        <div className={cn("mt-12 flex flex-wrap items-center gap-4", rise, "delay-200")}>
          <ButtonLink href="#resume-preview" variant="secondary">
            VIEW RESUME
          </ButtonLink>
          <ButtonLink href={site.resumeDownload} external variant="primary" arrow>
            DOWNLOAD PDF
          </ButtonLink>
          <PrintButton />
        </div>
        <p className="mt-6 max-w-xl text-sm text-muted">
          The PDF downloads from Google Drive. The preview below is built from this site&apos;s
          content.
        </p>
      </PageHeader>

      <section
        aria-label="Resume preview"
        className="border-t py-16 md:py-24 print:border-0 print:py-0"
      >
        <Container className="print:max-w-none print:px-0">
          <ResumePreview />
        </Container>
        {/* The resume spans the whole stack. */}
        <GraphActivator nodes={["soc", "detection", "cloud", "ai", "automation"]} />
      </section>
    </>
  );
}
