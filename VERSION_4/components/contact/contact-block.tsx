import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { Label } from "@/components/ui/label";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const contactCopy = {
  heading: "Let's build something secure.",
  intro: "For security engineering, research collaborations, or interesting systems work.",
} as const;

type ContactBlockProps = {
  /** Render the heading and intro. ContactSection turns this off because <Section> supplies them. */
  showHeading?: boolean;
  /** Heading level when shown. Use "h1" only if the page has no other h1. */
  headingAs?: "h1" | "h2" | "h3";
  /** Include the optional mailto: form. */
  showForm?: boolean;
  className?: string;
};

type ContactLink = {
  label: string;
  value: string;
  href: string;
  external: boolean;
};

// The form title sits one level below whatever heading introduces the block.
const FORM_TITLE_LEVEL = { h1: "h2", h2: "h3", h3: "h4" } as const;

function contactLinks(): ContactLink[] {
  return [
    {
      label: "EMAIL",
      value: site.email,
      // Constant address from lib/site.ts. Encoded anyway, with "@" restored (legal in a mailto recipient).
      href: `mailto:${encodeURIComponent(site.email).replace(/%40/g, "@")}`,
      external: false,
    },
    {
      label: "LINKEDIN",
      value: new URL(site.linkedin).pathname.replace(/^\/+|\/+$/g, ""),
      href: site.linkedin,
      external: true,
    },
    {
      label: "GITHUB",
      value: site.githubUser,
      href: site.github,
      external: true,
    },
  ];
}

function ContactRow({ link }: { link: ContactLink }) {
  const externalProps = link.external
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : {};

  return (
    <li className="border-b first:border-t">
      <a
        href={link.href}
        {...externalProps}
        className="group grid min-h-16 grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-4 transition-colors duration-200 motion-reduce:transition-none md:grid-cols-[6rem_1fr_auto]"
      >
        {/* Mobile: label above the value, so a long address gets the full row width. */}
        <Label className="col-span-2 md:col-span-1">{link.label}</Label>
        <span className="min-w-0 font-mono text-sm [overflow-wrap:anywhere] text-foreground transition-colors duration-200 group-hover:text-accent motion-reduce:transition-none md:text-lg">
          {link.value}
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-5 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:text-accent motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 motion-reduce:transition-none"
        />
        {link.external ? <span className="sr-only">(opens in a new tab)</span> : null}
      </a>
    </li>
  );
}

/**
 * Reusable contact content: optional heading, availability, three link rows and an optional mailto: form.
 * No <Section> wrapper, so the home page and /contact can frame it differently.
 * Public information is kept to what the owner already lists: email, LinkedIn, GitHub. No phone number.
 */
export function ContactBlock({
  showHeading = true,
  headingAs: Heading = "h2",
  showForm = true,
  className,
}: ContactBlockProps) {
  return (
    <div className={cn("grid gap-16 lg:grid-cols-12 lg:gap-x-8", className)}>
      {showHeading ? (
        <header className="lg:col-span-12">
          <Heading className="max-w-[18ch] text-4xl headline md:text-6xl">
            {contactCopy.heading}
          </Heading>
          <p className="mt-6 max-w-2xl text-lg text-muted">{contactCopy.intro}</p>
        </header>
      ) : null}

      <div className={showForm ? "lg:col-span-6" : "lg:col-span-12"}>
        <p className="flex items-center gap-3">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          <Label className="text-foreground">{site.availability}</Label>
        </p>
        <p className="mt-2 mb-8 text-sm text-muted">{site.location}. Open to global roles.</p>

        <ul aria-label="Contact methods">
          {contactLinks().map((link) => (
            <ContactRow key={link.label} link={link} />
          ))}
        </ul>
      </div>

      {showForm ? (
        <div className="lg:col-span-5 lg:col-start-8">
          <ContactForm titleAs={showHeading ? FORM_TITLE_LEVEL[Heading] : "h3"} />
        </div>
      ) : null}
    </div>
  );
}
