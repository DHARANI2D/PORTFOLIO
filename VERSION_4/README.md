# Dharanidharan Senthilkumar — Security Engineer

The portfolio of a security engineer. It is a static site: HTML, CSS and a small amount of JavaScript, no server, no database, no third-party scripts.

The design brief was "a quiet security engineering lab". Minimal at first glance, deep when explored: case studies with architecture diagrams and threat models, a command palette, a terminal, and a recruiter view that strips the page down to the summary.

- Identity, experience, systems, research, field notes, certifications, resume, contact, privacy.
- Dark by default, light theme, **engineer** and **recruiter** views.
- WCAG 2.2 AA target, reduced-motion support, works without JavaScript for reading.
- Hash-based Content-Security-Policy generated at build time. See [Security posture](#security-posture).

All copy comes from [`docs/FACTS.md`](docs/FACTS.md). If a fact is not in that file, the site does not state it.

## Stack

| Area      | Choice                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19, React Compiler, `output: "export"`                           |
| Language  | TypeScript, strict, `noUncheckedIndexedAccess`                                                  |
| Styling   | Tailwind CSS 4 with design tokens in `app/globals.css`, Geist Sans and Mono                     |
| UI        | Base UI (`@base-ui/react`) for dialogs, lucide icons, Motion for entrance and diagram animation |
| Content   | Typed data in `content/` validated with Zod, field notes in MDX (`@next/mdx`, Shiki, GFM)       |
| Tests     | Vitest (unit), Playwright and axe-core (end to end, accessibility)                              |

Runtime dependencies are listed in `package.json`. There is no analytics, tag manager, remote font, CDN asset or tracking of any kind.

## Getting started

Requires Node 22 or newer and pnpm (the version is pinned in `package.json`).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Scripts

| Script              | What it does                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Next.js dev server                                                                           |
| `pnpm build`        | `next build` (static export to `out/`), then `scripts/postbuild.mjs` (headers, security.txt) |
| `pnpm lint`         | ESLint                                                                                       |
| `pnpm typecheck`    | `tsc --noEmit`                                                                               |
| `pnpm format`       | Prettier, write                                                                              |
| `pnpm format:check` | Prettier, check                                                                              |
| `pnpm test`         | Unit tests (Vitest)                                                                          |
| `pnpm test:e2e`     | End-to-end tests (Playwright). Needs `out/`, so run `pnpm build` first                       |
| `pnpm check`        | Lint, typecheck and unit tests                                                               |

To preview the built site **with its production headers**, including the CSP:

```bash
pnpm build
node tests/e2e/static-server.mjs --dir out --port 4173   # http://127.0.0.1:4173
```

That is the same server the end-to-end tests use. It serves `out/_headers` and the 404 page the way a static host does. (`pnpm start` runs `serve` through `pnpm dlx`, which downloads a package at run time and sends no security headers.)

## Project structure

```
app/              Routes (App Router). One folder per page, plus the metadata routes:
                  sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
components/       Server components by default. "use client" only on small interactive leaves.
  ui/             Button, Tag, Dialog (Base UI), Section, Container, Label
  navigation/     Header, footer, theme and view toggles, mobile menu, logo
  command/        Command palette
  terminal/       Terminal dialog (its data loads on first open)
  graph/          Ambient security graph and its activation state
  hero/ home/ systems/ research/ writing/ skills/ career/ about/ contact/ resume/ certifications/
content/          Typed content: projects/, research/, experience, skills, certifications,
                  earlier-work, and writing/*.mdx
lib/              content.ts (validated accessors), site.ts, seo.ts, preferences.ts, writing.ts,
                  search-index.ts, fuzzy.ts, terminal-commands.ts, github.ts, ui-events.ts
scripts/          postbuild.mjs and lib/csp.mjs (CSP, headers, security.txt)
tests/            unit/ (Vitest) and e2e/ (Playwright, static-server.mjs)
docs/             FACTS.md, ARCHITECTURE.md, SECURITY.md
public/           Favicons and the avatar
```

How the pieces fit together is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Content model

Pages never hard-code facts. They read content through the accessors in `lib/content.ts`, which validate everything with the Zod schemas in `content/schema.ts` when the build starts. A schema violation fails `next build`, so malformed content cannot ship.

Before adding anything, read [`docs/FACTS.md`](docs/FACTS.md). Section C lists what must never be claimed (metrics, repo links for the private systems, papers, production use). Inferred case-study content must be listed in `CONTENT_REVIEW.md` so the owner can confirm or delete it.

### Add a project (system)

1. Create `content/projects/<slug>.ts` exporting an object `satisfies ProjectInput` (see `content/projects/witness.ts` for a full flagship entry and `argus.ts` for a minimal one).
2. Add it to `projectEntries` in `content/projects/index.ts`.

Required fields: `slug`, `name`, `tier` (1 flagship, 2 major, 3 supporting), `category`, `domain`, `tagline`, `summary`, `flow` (at least two steps). Optional: `status` (only if the owner stated one), `overview`, `problem`, `stack`, `architecture`, `threatModel`, `decisions`, `security`, `links`, `graphNodes`.

Flagship projects need an `architecture` and a `threatModel`; the unit tests enforce it. Architecture edges and trust boundaries must reference existing node ids. Only add a `links.github` that is real.

The page at `/systems/<slug>/`, the card on the home page, the sitemap entry, the search index entry and the terminal's `projects` list all appear without further changes.

### Add a research item

1. Create `content/research/<slug>.ts` exporting an object `satisfies ResearchInput`.
2. Add it to `researchEntries` in `content/research/index.ts`.

`relatedProjects` takes slugs of existing systems.

### Add a field note

Create `content/writing/<slug>.mdx`. The file name is the URL slug (lowercase letters, digits and hyphens). Start with the metadata, then write the note without a top-level `# ` heading (the page title is the `h1`):

```mdx
export const meta = {
  title: "Title of the note",
  summary: "One or two sentences.",
  date: "2026-10-04",
  tags: ["Detection"],
  number: 4,
};

## Problem

Text. `<Callout>`, `<CodeBlock>`, `<Diagram>` and `<Figure>` are available without imports.
```

`number` must be unique (it renders as `FIELD NOTE / 004`). The note gets a page, a sitemap entry with its date, an Article JSON-LD block and a search entry. A search for a system or research item also finds the notes that mention it.

### Other content

Experience, skills, certifications and earlier work are single files in `content/`. Certifications are `verified`, `in-progress` or `planned`. A planned item never has a year or a link. Years are only stated where the owner has stated them.

## View modes

The **VIEW AS** control switches between two presentations of the same HTML.

- **Engineer** (default) shows everything.
- **Recruiter** hides detail blocks and shows a shorter summary.

It is CSS only. `<html data-view="engineer|recruiter">` is set before first paint from `localStorage`, and the rules in `app/globals.css` hide `[data-engineer-only]` in recruiter view and `[data-recruiter-only]` in engineer view. To make a block engineer-only, add the `data-engineer-only` attribute to its wrapper. The choice is stored in `localStorage` under `ds-view`; the theme under `ds-theme`. Nothing is sent anywhere.

## Command palette and terminal

- **Command palette**: `Ctrl+K` or `⌘K`. Searches pages, systems, research, notes, skills, experience, links and actions. The index is built at export time from the content accessors, so new content is searchable immediately.
- **Go-to keys**: press `g`, then `h` home, `s` systems, `e` experience, `r` research, `w` writing, `a` about, `c` contact. They can be turned off in the palette footer (WCAG 2.1.4).
- **Terminal**: open it from the header, the mobile menu or the palette (`Open terminal`). Commands: `help`, `about`, `experience`, `projects`, `skills`, `research`, `certifications`, `contact`, `resume`, `status`, `theme`, `view`, `open <slug>`, `matrix`, `clear`. Output comes from the same content, and `status` numbers are computed from it, never typed in. Input is not sent anywhere.

## Accessibility and performance

Targets, checked in CI where they can be, otherwise by hand:

- **WCAG 2.2 AA.** Semantic landmarks, one `h1` per page, a skip link, visible focus, keyboard-operable everything, dialogs that trap and restore focus, 44px touch targets on phones, no information by colour alone, text contrast through tokens. `tests/e2e/a11y.spec.ts` runs axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) on the key pages in dark, light and recruiter view and on the open dialogs.
- **Reduced motion.** With `prefers-reduced-motion: reduce` nothing animates and everything is visible. `tests/e2e/reduced-motion.spec.ts` checks it, and checks that the server HTML is complete with JavaScript off.
- **No horizontal scroll** from 320px up (`tests/e2e/responsive.spec.ts`).
- **Core Web Vitals "good" thresholds** as the performance target: LCP under 2.5 s, CLS under 0.1, INP under 200 ms. These are targets, not measurements: nothing in this repository measures them yet. Measure a deployed build with Lighthouse or WebPageTest before claiming a number.
- Performance approach: server components by default, small client leaves, the terminal and its data load on first use, no layout shift (reserved space), no third-party requests.

Automated checks find only part of the accessibility problems. Before a release, also tab through every page, try a screen reader on the palette and the terminal, and zoom to 400%.

## Security posture

The site is a static export, so there is no server-side attack surface to defend: no API, no form handler, no database, no secrets.

- **Content-Security-Policy generated per build.** Next.js emits a few inline scripts (the theme init script and the React Server Components data). `scripts/postbuild.mjs` hashes each one (sha256) and writes a policy whose `script-src` is `'self'` plus those hashes. There is no `'unsafe-inline'` or `'unsafe-eval'` for scripts. Each page gets its own policy, listing only its own hashes.
- **Other headers**: HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY`, and long-lived caching for fingerprinted assets.
- **Written to `out/_headers`** (Netlify and Cloudflare Pages) and **`out/headers.vercel.json`** (Vercel).
- **`/.well-known/security.txt`** (RFC 9116) with the contact address from `lib/site.ts` and an expiry just under a year after each build.
- **No third-party scripts, fonts, images or analytics.** The build fails if the built HTML references another origin, contains inline event handlers or `javascript:` URLs.
- **The contact form sends nothing.** It composes a `mailto:` link for your own mail client.
- **The one build-time network call** is the public GitHub API for the build-log panel. It runs at build, is validated with Zod, accepts only `https://github.com` URLs, and falls back to a curated list if it fails.
- **Privacy**: no cookies. Four storage keys, all local, all listed on `/privacy/`.

The trade-offs and the threat model are in [`docs/SECURITY.md`](docs/SECURITY.md). The one known compromise: `style-src` allows `'unsafe-inline'` because React and Motion emit inline `style` attributes.

## Deployment

`NEXT_PUBLIC_SITE_URL` sets the canonical origin (no trailing slash needed). It feeds canonical URLs, the sitemap, Open Graph tags, JSON-LD and `security.txt`. Set it in the host's environment for the production domain. The default is in `lib/site.ts`. It is read at build time, by both `next build` and `postbuild.mjs`.

The repository root holds older versions of the portfolio. Point the host at the **`VERSION_4`** folder (base or root directory) so it picks up `netlify.toml` or `vercel.json`.

### Netlify (recommended)

Everything is automatic.

1. New site from Git, base directory `VERSION_4`.
2. `netlify.toml` already sets the build command (`pnpm build`), publish directory (`out`) and Node 22.
3. Set `NEXT_PUBLIC_SITE_URL`.

Netlify applies `out/_headers`, so the CSP always matches the build. `netlify.toml` turns post-processing off: minifying or bundling would change inline scripts and break their hashes. Do not add `[[headers]]` to `netlify.toml`.

### Cloudflare Pages

Root directory `VERSION_4`, build command `pnpm build`, output directory `out`, Node 22. Pages applies `out/_headers`. It ignores `_headers` lines longer than 2,000 characters and accepts at most 100 rules; the per-page policy stays well under both and `postbuild.mjs` warns if a build ever exceeds them.

### Vercel

Root directory `VERSION_4`. `vercel.json` sets the build, the output directory (`out`), `trailingSlash` and the **baseline** security headers (everything except the CSP).

The CSP cannot live in a static `vercel.json` by default because it contains hashes that belong to one build. To enable it:

1. `pnpm build`
2. Open `out/headers.vercel.json` and copy its `headers` array.
3. Replace the `headers` array in `vercel.json` with it, and commit.

Hashes change whenever page content or the Next.js build changes, so repeat these steps after every content or code change. A stale copy would block the new inline scripts and break every page, so the build refuses to ship one: `postbuild.mjs` fails the Vercel build (and `node scripts/postbuild.mjs --check` fails CI) when `vercel.json` holds CSP rules that differ from the current build. A `vercel.json` with no CSP rules is never considered stale.

If that routine is not worth it, use Netlify or Cloudflare Pages, where it is automatic. A host that cannot set response headers (GitHub Pages) cannot enforce any of this.

## Testing

### Unit (`pnpm test`)

Vitest, Node environment by default, jsdom for tests marked `// @vitest-environment jsdom`. Files are in `tests/unit/`:

- `content.test.ts`: every accessor parses; unique slugs; every project has a flow; flagship projects have an architecture and a threat model; diagram edges and boundaries reference real nodes; only owner-published links; no unsupported claims (percentages, measured quantities, counts of users, uptime, production, awards) and none of the banned hype words.
- `csp.test.ts`: hashing against the CSP specification's test vector, JSON-LD excluded, no `unsafe-inline` in `script-src`, headers file format, security.txt, and `postbuild.mjs` run end to end against fixture exports.
- `fuzzy.test.ts`, `terminal-commands.test.ts`, `search-index.test.ts`, `preferences.test.tsx`, `seo.test.tsx`, `github.test.ts`, `writing.test.ts`, `metadata-routes.test.ts` (sitemap, robots, manifest), `opengraph-image.test.ts` (renders the PNG), `static-server.test.ts` (the server the e2e suite depends on).

### End to end (`pnpm build && pnpm test:e2e`)

Playwright runs against `out/` through `tests/e2e/static-server.mjs`, which serves `out/_headers`. A CSP violation therefore appears as a console error and fails the page test. Specs:

| Spec                     | Covers                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `routes.spec.ts`         | Every URL in `sitemap.xml` returns 200, has one `h1` and `main#main`, no console errors, no failed requests; 404 page |
| `a11y.spec.ts`           | axe-core WCAG 2.2 AA on key routes in dark, light and recruiter view, and on the palette, terminal and menu           |
| `interactions.spec.ts`   | Palette (`Ctrl+K`, search, Enter), go-to keys, terminal, theme and view persistence, mobile menu focus                |
| `responsive.spec.ts`     | No horizontal overflow or clipped content at 320, 375, 768 and 1280px; 44px touch targets                             |
| `reduced-motion.spec.ts` | No running animations, all content opaque, final state without JavaScript                                             |
| `security.spec.ts`       | Only allowed inline scripts, same-origin resources only, `rel="noopener"`, `_headers` and `security.txt`              |
| `seo.spec.ts`            | Canonical equals sitemap URL, Open Graph image resolves to a PNG, JSON-LD parses, manifest and robots                 |

Projects: `desktop` (1440x900), `mobile` (Pixel 5) and `reduced-motion`.

Browser: Playwright's own Chromium by default (`pnpm exec playwright install chromium`). Environment variables:

| Variable                   | Meaning                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| `PLAYWRIGHT_CHROMIUM_PATH` | Use this Chromium executable. `/opt/pw-browsers/chromium` is used if present |
| `E2E_PORT`                 | Port for the static server (default 4173)                                    |
| `E2E_OUT_DIR`              | Export folder the specs read from disk (default `out`)                       |

## CI

`.github/workflows/portfolio.yml` (repository root) runs on pushes and pull requests that touch `VERSION_4/**`:

1. **quality**: `pnpm install --frozen-lockfile`, lint, typecheck, format check, unit tests.
2. **build**: `pnpm build`, then checks that `out/_headers`, `security.txt` and `headers.vercel.json` exist, that no `script-src` allows `unsafe-inline` or `unsafe-eval`, and runs `node scripts/postbuild.mjs --check`. Uploads `out/` as an artifact.
3. **e2e**: downloads that artifact, installs Chromium and runs Playwright against it.

The workflow has `contents: read` permission only, no secrets, and does not deploy.

## Credits

Geist Sans and Geist Mono (SIL Open Font License) are self-hosted through the `geist` package.
