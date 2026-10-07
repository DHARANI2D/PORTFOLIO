import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CommandPalette } from "@/components/command/command-palette";
import { GraphProvider } from "@/components/graph/graph-context";
import { SecurityGraph } from "@/components/graph/security-graph";
import { SiteFooter } from "@/components/navigation/site-footer";
import { RouteFocus } from "@/components/navigation/route-focus";
import { SiteHeader } from "@/components/navigation/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { TerminalDialog } from "@/components/terminal/terminal";
import { buildSearchIndex } from "@/lib/search-index";
import { INIT_SCRIPT } from "@/lib/preferences";
import { personJsonLd, websiteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

/*
 * Geist Sans and Mono, self-hosted as Latin subsets (app/fonts, made by tools/subset-fonts.sh from
 * the `geist` package). The package files carry about 1,000 glyphs each (70 KB); the site uses about
 * 100 characters, so the subsets are 26 KB and 21 KB, both still variable (weight 100-900). Smaller
 * files arrive at about the time of first paint on a slow connection, so the swap from the fallback
 * font no longer moves the text.
 *
 * Sans gets a size- and metric-matched Arial fallback (next/font's adjustFontFallback) for the
 * moment before it loads. Mono gets none on purpose: next/font can only match Arial or Times, and
 * Arial scaled to monospace widths is a worse stand-in than the system monospace stack, whose
 * advance width (about 0.6em) is already Geist Mono's 0.6em.
 */
const geistSans = localFont({
  src: "./fonts/Geist-Variable-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
});
const geistMono = localFont({
  src: "./fonts/GeistMono-Variable-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
});

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
      // Root /favicon.ico: clients that never read <head> (a bare file view, feed readers) ask for it.
      { url: "/favicon.ico", sizes: "any" },
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
    // The inline init script rewrites data-theme / data-view before first paint from localStorage
    // and adds the "js" class, so the attributes can differ from the server HTML on purpose.
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      data-view="engineer"
      // Next calls `scroll-behavior: auto` for the length of a route change, so the router's
      // scroll to the new page is instant while in-page anchors keep scrolling smoothly
      // (html { scroll-behavior: smooth } in app/globals.css).
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
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
          <RouteFocus />
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
