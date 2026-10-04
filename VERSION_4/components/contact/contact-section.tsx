import { ContactBlock, contactCopy } from "@/components/contact/contact-block";
import { Section } from "@/components/ui/section";

/** "07 / CONTACT". <Section> supplies the numbered label, the h2 and the intro. */
export function ContactSection() {
  return (
    <Section
      id="contact"
      index="07"
      label="CONTACT"
      title={contactCopy.heading}
      intro={contactCopy.intro}
    >
      <ContactBlock showHeading={false} />
    </Section>
  );
}
