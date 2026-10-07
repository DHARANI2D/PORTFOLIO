import type { Metadata } from "next";
import { ContactSection } from "@/components/contact/contact-section";
import { Hero } from "@/components/hero/hero";
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
 * Home. Hero, then the numbered sections of the site, in this order: SIGNAL, SYSTEMS, EXPERIENCE,
 * RESEARCH, STACK, FIELD NOTES, CONTACT (01 to 07 in engineer view).
 * Each section component renders its own <Section autoNumber>. The numbers are a CSS counter, so
 * the recruiter view, which hides RESEARCH and FIELD NOTES, still reads 01, 02, 03, 04, 05.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <SignalSection />
      <SystemGrid />
      <ExperiencePreview />
      <ResearchSection />
      <SkillMatrix />
      <WritingPreview />
      <ContactSection />
    </>
  );
}
