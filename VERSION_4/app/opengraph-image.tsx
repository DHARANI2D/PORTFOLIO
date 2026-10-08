import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// Static export: rendered once at build time into a PNG next to the HTML.
export const dynamic = "force-static";
export const alt = `${site.name}. Security Engineer. Detection, cloud security, AI security.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (the renderer behind ImageResponse) cannot read CSS variables, so the palette is spelled
// out here. These mirror the dark theme tokens in app/globals.css.
const COLOR = {
  background: "#0a0a0c",
  foreground: "#f5f5f5",
  muted: "#929292",
  border: "#242424",
  accent: "#8b5cf6",
} as const;

/**
 * Satori reads TrueType, OpenType and WOFF, not WOFF2, and the site's own fonts are WOFF2 files made
 * by next/font. The `geist` package also ships the TTF sources, so the card uses the same faces as
 * the site. A missing file fails the build: a card in a fallback face would go unnoticed.
 */
const FONT_DIR = path.join(process.cwd(), "node_modules", "geist", "dist", "fonts");

async function loadFonts() {
  const [sans, mono] = await Promise.all([
    readFile(path.join(FONT_DIR, "geist-sans", "Geist-Regular.ttf")),
    readFile(path.join(FONT_DIR, "geist-mono", "GeistMono-Regular.ttf")),
  ]);
  const toBuffer = (file: Buffer) =>
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  return [
    { name: "Geist", data: toBuffer(sans), weight: 400 as const, style: "normal" as const },
    { name: "Geist Mono", data: toBuffer(mono), weight: 400 as const, style: "normal" as const },
  ];
}

const SANS = "Geist";
const MONO = "Geist Mono";

/** A small security graph: nodes joined by edges, one of them ringed like the brand mark. */
const NODES = [
  { id: "a", x: 24, y: 40 },
  { id: "b", x: 88, y: 18 },
  { id: "c", x: 152, y: 52 },
  { id: "d", x: 70, y: 96 },
  { id: "e", x: 132, y: 128 },
  { id: "f", x: 196, y: 100 },
] as const;
const EDGES = [
  ["a", "b"],
  ["b", "c"],
  ["a", "d"],
  ["b", "d"],
  ["c", "f"],
  ["d", "e"],
  ["e", "f"],
  ["c", "e"],
] as const;
const CORE = "b";

function Glyph() {
  const at = (id: string) => NODES.find((node) => node.id === id) ?? NODES[0];
  return (
    <svg width="240" height="152" viewBox="0 0 220 152" fill="none">
      {EDGES.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={at(from).x}
          y1={at(from).y}
          x2={at(to).x}
          y2={at(to).y}
          stroke={COLOR.border}
          strokeWidth="2"
        />
      ))}
      {NODES.map((node) =>
        node.id === CORE ? (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="16" stroke={COLOR.foreground} strokeWidth="2" />
            <circle cx={node.x} cy={node.y} r="6" fill={COLOR.accent} />
          </g>
        ) : (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r="5"
            fill={COLOR.background}
            stroke={COLOR.muted}
            strokeWidth="2"
          />
        ),
      )}
    </svg>
  );
}

export default async function OpengraphImage() {
  const host = new URL(site.url).hostname;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: COLOR.background,
        color: COLOR.foreground,
        fontFamily: SANS,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            display: "flex",
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: 4,
            color: COLOR.muted,
          }}
        >
          {site.brand}
        </div>
        <Glyph />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: MONO,
            fontSize: 30,
            letterSpacing: 5,
            color: COLOR.muted,
          }}
        >
          {site.name.toUpperCase()}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 92,
            lineHeight: 1,
            letterSpacing: -3,
            color: COLOR.foreground,
          }}
        >
          SECURITY ENGINEER
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontFamily: MONO,
            fontSize: 28,
            letterSpacing: 3,
            color: COLOR.accent,
          }}
        >
          DETECTION · CLOUD SECURITY · AI SECURITY
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 48,
          paddingTop: 24,
          borderTop: `1px solid ${COLOR.border}`,
          fontFamily: MONO,
          fontSize: 24,
          letterSpacing: 3,
          color: COLOR.muted,
        }}
      >
        {host}
      </div>
    </div>,
    { ...size, fonts: await loadFonts() },
  );
}
