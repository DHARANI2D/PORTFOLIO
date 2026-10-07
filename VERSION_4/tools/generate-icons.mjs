#!/usr/bin/env node
/**
 * Regenerates the site icons from the Helios glyph (components/navigation/logo.tsx): an off-black
 * tile, a near-white ring and ray, a violet core. The colours mirror the dark theme tokens in
 * app/globals.css, because an icon cannot read CSS variables.
 *
 *   public/favicon_io/favicon-16x16.png, favicon-32x32.png    tab icons, rounded tile
 *   public/favicon_io/apple-touch-icon.png (180)              full-bleed: iOS applies its own mask
 *   public/favicon_io/android-chrome-192x192.png, -512x512    full-bleed, glyph inside the maskable safe zone
 *   public/favicon_io/favicon.ico and public/favicon.ico      PNG-in-ICO with 16, 32 and 48 px images
 *
 * File names are the ones app/manifest.ts and app/layout.tsx point at. The root copy of
 * favicon.ico serves clients that never read <head>.
 *
 * Drawing is done by Chromium (Playwright, already a dev dependency), which rasterises an inline
 * SVG; the ICO container is written here with Buffer. No other dependency.
 *
 * Usage: node tools/generate-icons.mjs
 * Chromium: Playwright's own, or PLAYWRIGHT_CHROMIUM_PATH, or /opt/pw-browsers/chromium if present.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "favicon_io");

const BACKGROUND = "#090909"; // --background (dark)
const FOREGROUND = "#f5f5f5"; // --foreground (dark)
const ACCENT = "#8b5cf6"; // --accent (dark)

/**
 * The glyph is drawn in the logo's 32-unit box around (16, 16). `scale` is pixels per unit, and
 * `stroke` / `core` are in units: small sizes use a heavier ring and a larger core so they stay
 * legible at 16 px.
 */
function glyph({ size, scale, stroke, core }) {
  const c = size / 2;
  const at = (x, y) => `${(c + (x - 16) * scale).toFixed(3)} ${(c + (y - 16) * scale).toFixed(3)}`;
  const radius = (units) => (units * scale).toFixed(3);
  const sw = (stroke * scale).toFixed(3);
  return `
    <circle cx="${c}" cy="${c}" r="${radius(8)}" fill="none" stroke="${FOREGROUND}" stroke-width="${sw}"/>
    <path d="M${at(22.25, 5.17)}A${radius(12.5)} ${radius(12.5)} 0 0 1 ${at(27.75, 11.72)}"
      fill="none" stroke="${FOREGROUND}" stroke-width="${sw}" stroke-linecap="round"/>
    <circle cx="${c}" cy="${c}" r="${radius(core)}" fill="${ACCENT}"/>`;
}

/**
 * kind "tab": rounded tile with a large glyph (ray ends 0.45 of the size from the centre).
 * kind "tile": full-bleed square; the ray ends 0.40 of the size from the centre, inside the
 * 80% circle that maskable icons guarantee to keep.
 */
function svgFor(size, kind) {
  const tab = kind === "tab";
  const reach = 13.25; // units from the centre to the outer edge of the ray
  const scale = ((tab ? 0.45 : 0.4) * size) / reach;
  const small = size <= 48;
  const body = glyph({ size, scale, stroke: small ? 2.6 : 1.5, core: small ? 4.4 : 3.25 });
  const rx = tab ? Math.round(size * 0.2) : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="${BACKGROUND}"/>${body}
  </svg>`;
}

/** ICO with PNG payloads (supported since Windows Vista and by every browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(16 * images.length);
  let offset = header.length + entries.length;
  images.forEach(({ size, png }, i) => {
    const e = i * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, e); // width
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    entries.writeUInt8(0, e + 2); // palette colours
    entries.writeUInt8(0, e + 3); // reserved
    entries.writeUInt16LE(1, e + 4); // colour planes
    entries.writeUInt16LE(32, e + 6); // bits per pixel
    entries.writeUInt32LE(png.length, e + 8); // payload size
    entries.writeUInt32LE(offset, e + 12); // payload offset
    offset += png.length;
  });
  return Buffer.concat([header, entries, ...images.map((i) => i.png)]);
}

const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const fallback = "/opt/pw-browsers/chromium";
const executablePath = explicit ?? (existsSync(fallback) ? fallback : undefined);

const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();

  async function render(size, kind) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svgFor(size, kind)}`,
    );
    return page.screenshot({
      type: "png",
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
  }

  await mkdir(OUT, { recursive: true });
  const files = {
    "favicon-16x16.png": [16, "tab"],
    "favicon-32x32.png": [32, "tab"],
    "apple-touch-icon.png": [180, "tile"],
    "android-chrome-192x192.png": [192, "tile"],
    "android-chrome-512x512.png": [512, "tile"],
  };
  for (const [name, [size, kind]] of Object.entries(files)) {
    const png = await render(size, kind);
    await writeFile(path.join(OUT, name), png);
    console.log(`wrote public/favicon_io/${name} (${size}x${size}, ${png.length} bytes)`);
  }

  const images = [];
  for (const size of [16, 32, 48]) images.push({ size, png: await render(size, "tab") });
  const icon = ico(images);
  await writeFile(path.join(OUT, "favicon.ico"), icon);
  await writeFile(path.join(ROOT, "public", "favicon.ico"), icon);
  console.log(`wrote public/favicon_io/favicon.ico and public/favicon.ico (${icon.length} bytes)`);
} finally {
  await browser.close();
}
