import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { CommandPalette } from "@/components/command/command-palette";
import { GraphProvider } from "@/components/graph/graph-context";
import { SecurityGraph } from "@/components/graph/security-graph";
import { SiteFooter } from "@/components/navigation/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { TerminalDialog } from "@/components/terminal/terminal";
import { buildSearchIndex } from "@/lib/search-index";
import { INIT_SCRIPT } from "@/lib/preferences";
import { personJsonLd, websiteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  keywords: [
    "security engineer",
    "detection engineering",
    "SOC",
    "SIEM",
    "incident response",
    "cloud security",
    "AI security",
    "agent security",
    "MITRE ATT&CK",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: site.url,
    locale: "en",
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico", sizes: "any" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  // <meta name="theme-color"> cannot read CSS variables, so these mirror --background in
  // app/globals.css for the dark and light themes.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090909" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Built once at export time and handed to the client palette as plain data.
  const searchItems = await buildSearchIndex();

  return (
    // The inline init script rewrites data-theme / data-view before first paint from localStorage,
    // so the attributes can differ from the server HTML on purpose.
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      data-view="engineer"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* The only inline executable script on the site. Its sha256 is added to the CSP at build time. */}
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
        <JsonLd data={personJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
      </head>
      {/* isolate: gives the page one stacking context so the fixed background graph sits above the
          body fill and below content, whatever z-index it uses. */}
      <body className="isolate flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <GraphProvider>
          <SecurityGraph />
          <SiteHeader />
          {/* tabIndex -1 lets the skip link move focus here; it is not a tab stop and needs no ring. */}
          <main id="main" tabIndex={-1} className="relative z-10 flex-1 outline-none">
            {children}
          </main>
          <SiteFooter />
          <CommandPalette items={searchItems} />
          <TerminalDialog />
        </GraphProvider>
      </body>
    </html>
  );
}
