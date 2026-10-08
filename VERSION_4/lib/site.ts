/** Single source of truth for site-wide identity and links. */
export const site = {
  name: "Dharanidharan Senthilkumar",
  shortName: "Dharani",
  handle: "DS",
  brand: "DS / TRACE",
  /** The wordmark after "DS /". An acronym: see brandMeaning. */
  brandName: "TRACE",
  /** What the letters stand for: the areas the work covers. */
  brandMeaning: "Threat · Response · Automation · Cloud · Evidence",
  title: "Dharanidharan Senthilkumar — Security Engineer",
  description:
    "Security Engineer focused on detection engineering, SOC operations, cloud security, AI security, and autonomous security systems.",
  headline: "Building security systems that can see, reason, and respond.",
  eyebrow: "SECURITY ENGINEER · DETECTION · AI SECURITY",
  /** Canonical origin. Override per deployment with NEXT_PUBLIC_SITE_URL. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dharani2d.netlify.app").replace(/\/$/, ""),
  email: "dharanidharan2d@gmail.com",
  github: "https://github.com/DHARANI2D",
  githubUser: "DHARANI2D",
  linkedin: "https://www.linkedin.com/in/dharanidharan-senthilkumar-b4244b232/",
  hashnode: "https://dharani2d.hashnode.dev/",
  devto: "https://dev.to/dharani2d",
  resumeDownload:
    "https://drive.google.com/uc?export=download&id=1D60aoGGH331ehux7CgAmwazP0CVfHhEk",
  location: "India",
  availability: "AVAILABLE FOR SECURITY ENGINEERING",
  builtOn: "2026",
} as const;

/**
 * Primary navigation. The site is one page: each item scrolls to its section of the home page, in
 * page order. Detail pages (a system, a research paper, a note) live under their section.
 */
export const primaryNav = [
  { href: "/#about", label: "ABOUT" },
  { href: "/#experience", label: "WORK" },
  { href: "/#systems", label: "SYSTEMS" },
  { href: "/#research", label: "RESEARCH" },
  { href: "/#certifications", label: "CERTS" },
  { href: "/#writing", label: "WRITING" },
  { href: "/#contact", label: "CONTACT" },
] as const;
