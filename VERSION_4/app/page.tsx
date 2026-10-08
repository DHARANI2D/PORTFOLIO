import type { Metadata } from "next";
import { ContactSection } from "@/components/contact/contact-section";
import { Hero } from "@/components/hero/hero";
import { AboutSection } from "@/components/home/about-section";
import { CertificationsSection } from "@/components/home/certifications-section";
import { ExperiencePreview } from "@/components/home/experience-preview";
import { ResearchSection } from "@/components/home/research-section";
import { SignalSection } from "@/components/home/signal-section";
import { SystemGrid } from "@/components/home/system-grid";
import { WritingPreview } from "@/components/home/writing-preview";
import { SkillMatrix } from "@/components/skills/skill-matrix";
import { buildMetadata } from "@/lib/seo";

// No title: the layout's default (site.title) applies to the home page.
export const metadata: Metadata = buildMetadata({ path: "/" });

/**
 * The whole site on one page. Hero, then the numbered sections in the order of the header
 * navigation: SIGNAL, ABOUT, WORK (experience), SYSTEMS, RESEARCH, STACK, CERTIFICATIONS, WRITING,
 * CONTACT (01 to 09). Each section component renders its own <Section autoNumber>, so the numbers
 * are a CSS counter and cannot drift from the order. The header links scroll to these sections.
 * Systems, research papers and field notes keep their own detail pages.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <SignalSection />
      <AboutSection />
      <ExperiencePreview />
      <SystemGrid />
      <ResearchSection />
      <SkillMatrix />
      <CertificationsSection />
      <WritingPreview />
      <ContactSection />
    </>
  );
}
