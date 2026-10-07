import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

// The manifest cannot read CSS variables, so these mirror --background in app/globals.css (dark).
const BACKGROUND = "#090909";

/**
 * Web app manifest. The site is a document, not an installable app, so `display` stays "browser":
 * the icons and colours are used by shortcuts and by Android's task switcher, nothing more.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.handle,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    icons: [
      { src: "/favicon_io/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon_io/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
