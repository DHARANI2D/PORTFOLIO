import createMDX from "@next/mdx";
import type { NextConfig } from "next";

/**
 * Static export: the site is pure HTML/CSS/JS with no server runtime.
 * That removes an entire class of server-side attack surface and lets the
 * same build deploy to Netlify, Vercel, Cloudflare Pages or any static host.
 * Security headers (including a hash-based CSP) are generated after the
 * build by scripts/postbuild.mjs because `headers()` is unavailable with
 * `output: "export"`.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactCompiler: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  images: { unoptimized: true },
  poweredByHeader: false,
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm", {}]],
    rehypePlugins: [
      [
        "@shikijs/rehype",
        {
          themes: { light: "github-light", dark: "github-dark-default" },
          defaultColor: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
