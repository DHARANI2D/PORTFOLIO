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
 * Home. Hero, then the numbered sections of the site:
 * 01 SIGNAL, 02 SYSTEMS, 03 EXPERIENCE, 04 RESEARCH, 05 STACK, 06 FIELD NOTES, 07 CONTACT.
 * Each section component renders its own numbered <Section>.
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
