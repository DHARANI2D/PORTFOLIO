/** Single source of truth for site-wide identity and links. */
export const site = {
  name: "Dharanidharan Senthilkumar",
  shortName: "Dharani",
  handle: "DS",
  brand: "DS / HELIOS",
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
  resumeDownload:
    "https://drive.google.com/uc?export=download&id=1D60aoGGH331ehux7CgAmwazP0CVfHhEk",
  location: "India",
  availability: "AVAILABLE FOR SECURITY ENGINEERING",
  builtOn: "2026",
} as const;

/** Primary navigation. Deliberately short: five items plus resume. */
export const primaryNav = [
  { href: "/experience/", label: "WORK" },
  { href: "/systems/", label: "SYSTEMS" },
  { href: "/research/", label: "RESEARCH" },
  { href: "/writing/", label: "WRITING" },
  { href: "/about/", label: "ABOUT" },
] as const;
