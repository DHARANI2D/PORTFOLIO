# Dharanidharan Senthilkumar — Security Engineer

The portfolio of a security engineer. It is a static site: HTML, CSS and a small amount of JavaScript, no server, no database, no third-party scripts.

The design brief was "a quiet security engineering lab". One page, with a terminal in the hero that answers questions from the site's own content. How the systems and the research work is deliberately not published: systems are cards and research is names only.

- Identity, experience, systems, research, field notes, certifications, resume, contact, privacy.
- Dark by default, light theme.
- WCAG 2.2 AA target, reduced-motion support, works without JavaScript for reading.
- Hash-based Content-Security-Policy generated at build time, in the HTML of every page and in the response headers. See [Security posture](#security-posture).

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

| Script                                   | What it does                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                               | Next.js dev server                                                                                                                  |
| `pnpm build`                             | `next build` (static export to `out/`), then `scripts/postbuild.mjs` (CSP tag in every HTML file, headers, security.txt)            |
| `BUILD_DIR=.build-x pnpm build:isolated` | The same build into a private folder (`.build-x`) instead of `out/`, for parallel builds and experiments. `.build-*` is git-ignored |
| `pnpm start`                             | Serves `out/` on http://127.0.0.1:3000 through `tests/e2e/static-server.mjs`: production headers, no download                       |
| `pnpm lint`                              | ESLint                                                                                                                              |
| `pnpm typecheck`                         | `tsc --noEmit` for the app, then `tsc -p tests/e2e --noEmit` for the Playwright specs                                               |
| `pnpm format`                            | Prettier, write                                                                                                                     |
| `pnpm format:check`                      | Prettier, check                                                                                                                     |
| `pnpm test`                              | Unit tests (Vitest)                                                                                                                 |
| `pnpm test:e2e`                          | End-to-end tests (Playwright). Needs `out/`, so run `pnpm build` first                                                              |
| `pnpm check`                             | Lint, typecheck and unit tests                                                                                                      |

To preview the built site **with its production headers**, including the CSP:

```bash
pnpm build
node tests/e2e/static-server.mjs --dir out --port 4173   # http://127.0.0.1:4173
```

That is the same server the end-to-end tests use, and `pnpm start` runs it on port 3000. It serves `out/_headers` and the 404 page the way a static host does. It removes `upgrade-insecure-requests` from the policy (header and tag) because it runs on plain http, and nothing else. `--csp-header off` drops the policy header to show what a host without header support serves: the tag in the HTML still enforces the policy.

## Project structure

```
app/              Routes (App Router). One folder per page, plus the metadata routes:
                  sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
components/       Server components by default. "use client" only on small interactive leaves.
  ui/             Button, Tag, Dialog (Base UI), Section, Container, Label
  navigation/     Header, footer, theme and view toggles, mobile menu, logo
  terminal/       Terminal dialog (its data loads on first open)
  graph/          Ambient security graph and its activation state
  hero/ home/ systems/ research/ writing/ skills/ career/ about/ contact/ resume/ certifications/
content/          Typed content: projects/, research/, experience, skills, certifications,
                  earlier-work, and writing/*.mdx
lib/              content.ts (validated accessors), site.ts, seo.ts, preferences.ts, writing.ts,
                  assistant.ts, knowledge.ts, fuzzy.ts, terminal-commands.ts, github.ts, ui-events.ts
scripts/          postbuild.mjs and lib/csp.mjs (CSP tag and headers, security.txt)
tests/            unit/ (Vitest), e2e/ (Playwright, fixtures.ts, static-server.mjs, tsconfig.json)
docs/             FACTS.md, VISION.md, ARCHITECTURE.md, SECURITY.md
public/           Favicons and the avatar
netlify.toml      Netlify build settings (headers come from out/_headers)
vercel.json       Vercel build settings and the baseline security headers
vitest.config.mts Vitest configuration (.mts so it loads as ESM without a warning)
../.github/       CI workflow and dependabot.yml (at the repository root)
```

How the pieces fit together is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Content model

Pages never hard-code facts. They read content through the accessors in `lib/content.ts`, which validate everything with the Zod schemas in `content/schema.ts` when the build starts. A schema violation fails `next build`, so malformed content cannot ship.

Before adding anything, read [`docs/FACTS.md`](docs/FACTS.md). Section C lists what must never be claimed (metrics, repo links for the private systems, papers, production use). Inferred case-study content must be listed in `CONTENT_REVIEW.md` so the owner can confirm or delete it.

### Add a project (system)

1. Create `content/projects/<slug>.ts` exporting an object `satisfies ProjectInput` (see `content/projects/helios.ts`).
2. Add it to `projectEntries` in `content/projects/index.ts`, and to a theme in `components/home/system-grid.tsx`.

Fields: `slug`, `name`, `category`, `domain`, `tagline`, `graphNodes`, and `status` only if the owner stated one. That is all the schema holds: a system is a card, with no page, case study, architecture or threat model, because how it works is not published. A test fails if a field is added.

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

## Terminal and assistant

The terminal sits inline in the hero and also opens as a dialog (header, mobile menu). It is one component, `components/terminal/terminal-surface.tsx`, and it doubles as the site's assistant.

- **Commands**: `help`, `about`, `experience`, `projects`, `skills`, `research`, `certifications`, `contact`, `resume`, `status`, `theme`, `open <slug>`, `matrix`, `ask <question>`, `clear`. Output comes from the content, and `status` numbers are computed from it, never typed in.
- **Questions**: anything that is not a command is a question. It is answered by `lib/assistant.ts`, which matches the question against `/knowledge.json`, a file built at export time from the content (`lib/knowledge.ts`), and prints the most relevant sentences with a command that opens the page. It is retrieval over the site's own content, not a language model: it can only say what the site says, and it says so when it finds nothing.
- **Privacy**: the knowledge file is a same-origin static file, fetched on the first question. Nothing a visitor types is sent anywhere.
- There is no command palette and no `Ctrl+K` shortcut.

## Accessibility and performance

Targets, checked in CI where they can be, otherwise by hand:

- **WCAG 2.2 AA.** Semantic landmarks, one `h1` per page, a skip link, visible focus, keyboard-operable everything, dialogs that trap and restore focus, 44px touch targets on phones, no information by colour alone, text contrast through tokens. `tests/e2e/a11y.spec.ts` runs axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) on the key pages in dark, light and recruiter view and on the open dialogs.
- **Reduced motion.** With `prefers-reduced-motion: reduce` nothing animates and everything is visible. `tests/e2e/reduced-motion.spec.ts` checks it, and checks that the server HTML is complete with JavaScript off.
- **No horizontal scroll** from 320px up (`tests/e2e/responsive.spec.ts`).
- **Core Web Vitals "good" thresholds** as the performance target: LCP under 2.5 s, CLS under 0.1, INP under 200 ms. These are targets, not measurements: nothing in this repository measures them yet. Measure a deployed build with Lighthouse or WebPageTest before claiming a number.
- Performance approach: server components by default, small client leaves, the terminal and its data load on first use, no layout shift (reserved space), no third-party requests.

Automated checks find only part of the accessibility problems. Before a release, also tab through every page, try a screen reader on the terminal, and zoom to 400%.

## Security posture

The site is a static export, so there is no server-side attack surface to defend: no API, no form handler, no database, no secrets.

- **Content-Security-Policy generated per build.** Next.js emits a few inline scripts (the theme init script and the React Server Components data). `scripts/postbuild.mjs` hashes each one (sha256) and writes a policy whose `script-src` is `'self'` plus those hashes. There is no `'unsafe-inline'` or `'unsafe-eval'` anywhere in the policy, scripts and styles included. `style-src` is `'self'`; the few inline `style` attributes (the Shiki colour variables of two field notes) are allowed by `style-src-attr 'unsafe-hashes'` and a hash each. `img-src` is `'self'`. Each page gets its own policy, listing only its own hashes.
- **The policy is in two places.** The same policy is written into every HTML file as `<meta http-equiv="Content-Security-Policy">`, first in `<head>` (after `<meta charset>`), including `404.html` and `_not-found`. It is also sent as a header where the host reads `out/_headers`. A browser enforces both when both arrive, and they are identical apart from `frame-ancestors`, which only a header can carry.
- **Other headers**: HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY`, and long-lived caching for fingerprinted assets.
- **Written to `out/_headers`** (Netlify and Cloudflare Pages) and **`out/headers.vercel.json`** (Vercel, the baseline headers are already in `vercel.json`).
- **`/.well-known/security.txt`** (RFC 9116) with the contact address from `lib/site.ts` and an expiry just under a year after each build.
- **No third-party scripts, fonts, images or analytics.** The build fails if the built HTML references another origin, contains inline event handlers or `javascript:` URLs.
- **The contact form sends nothing.** It composes a `mailto:` link for your own mail client.
- **The one build-time network call** is the public GitHub API for the build-log panel. It runs at build, is validated with Zod, accepts only `https://github.com` URLs, and falls back to a curated list if it fails.
- **Privacy**: no cookies. Four storage keys, all local, all listed on `/privacy/`.

### What each host enforces

| Host                                 | CSP (script, style, img, connect, form, object, base) | `frame-ancestors`, `X-Frame-Options` | HSTS and the other baseline headers | 404 pages and unknown URLs                          |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------ | ----------------------------------- | --------------------------------------------------- |
| Netlify, Cloudflare Pages            | header and tag                                        | yes                                  | yes (`_headers`)                    | tag (a header rule matches the requested path only) |
| Vercel                               | tag                                                   | `X-Frame-Options` only               | yes (`vercel.json`)                 | tag                                                 |
| Any other static host or file server | tag                                                   | no                                   | only what the host sets             | tag                                                 |

What only a header can do, and the tag cannot: `frame-ancestors` (clickjacking; `X-Frame-Options: DENY` covers it where headers work), HSTS, and `report-uri`. On a host with no header support those are missing. The tag is read only after the browser has started parsing, so the first bytes of `<head>` (the charset tag) precede it, and nothing the page loads does.

The trade-offs and the threat model are in [`docs/SECURITY.md`](docs/SECURITY.md).

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

Root directory `VERSION_4`. `vercel.json` sets the build, the output directory (`out`), `trailingSlash` and the **baseline** security headers (everything except the CSP). Vercel ignores `out/_headers`.

The Content-Security-Policy does not depend on a header: `postbuild.mjs` writes it into every HTML file as a `<meta http-equiv>` tag, so Vercel enforces it with no extra step and it cannot go stale. `frame-ancestors` is the one directive that stays header-only; `X-Frame-Options: DENY` in `vercel.json` covers clickjacking.

Optionally, to also send the policy as a header, copy the `headers` array from `out/headers.vercel.json` into `vercel.json` after each build. A stale copy would be blocked by the tag, so `postbuild.mjs` fails the Vercel build (and `node scripts/postbuild.mjs --check` fails CI) when `vercel.json` holds CSP rules that differ from the current build. A `vercel.json` with no CSP rules is never considered stale. Most deployments should skip this step.

A host that cannot set any response header (GitHub Pages) still enforces the policy through the tag, but sends no HSTS and cannot refuse framing.

## Testing

### Unit (`pnpm test`)

Vitest, Node environment by default, jsdom for tests marked `// @vitest-environment jsdom`. Files are in `tests/unit/`:

- `content.test.ts`: every accessor parses; unique slugs; systems and research hold only a name, a line and domains; only owner-published links; no unsupported claims (percentages, measured quantities, counts of users, uptime, production claims, awards) and no counts with a plus sign; note metadata and dates.
- `csp.test.ts`: hashing against the CSP specification's test vector, JSON-LD excluded, no `unsafe-inline` anywhere in the policy, style attribute and `<style>` hashing, the `<meta>` tag (position, idempotence, verification), headers file format, security.txt, and `postbuild.mjs` run end to end against fixture exports.
- `fuzzy.test.ts`, `terminal-commands.test.ts`, `search-index.test.ts`, `preferences.test.tsx`, `seo.test.tsx`, `github.test.ts`, `writing.test.ts`, `metadata-routes.test.ts` (sitemap, robots, manifest), `opengraph-image.test.ts` (renders the PNG), `static-server.test.ts` (the server the e2e suite depends on).

### End to end (`pnpm build && pnpm test:e2e`)

Playwright runs against `out/` through `tests/e2e/static-server.mjs`, which serves `out/_headers`. `tests/e2e/fixtures.ts` exports a `test` that fails ANY test in which the page fires a `securitypolicyviolation` event or logs a policy error, so specs import `test` and `expect` from `./fixtures`. A test that provokes a violation on purpose sets `test.use({ allowCspViolations: true })`. Specs:

| Spec                     | Covers                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes.spec.ts`         | Every URL in `sitemap.xml` returns 200, has one `h1` and `main#main`, no console errors, no failed requests; 404 page                                                                                   |
| `a11y.spec.ts`           | axe-core WCAG 2.2 AA on key routes in dark and light, and on the terminal and menu                                                                                             |
| `interactions.spec.ts`   | Terminal, header section links, theme persistence, mobile menu focus                                                                                                  |
| `responsive.spec.ts`     | No horizontal overflow or clipped content at 320, 375, 768 and 1280px; 44px touch targets                                                                                                               |
| `reduced-motion.spec.ts` | No running animations, all content opaque, final state without JavaScript                                                                                                                               |
| `security.spec.ts`       | Only allowed inline scripts, same-origin resources only, `rel="noopener"`, `_headers` and `security.txt`                                                                                                |
| `seo.spec.ts`            | Canonical equals sitemap URL, Open Graph image resolves to a PNG, JSON-LD parses, manifest and robots                                                                                                   |
| `platform-fixes.spec.ts` | Policy tag first in `<head>` of every HTML file, no violation on any route in both themes after the terminal, toggles and diagram hover, the tag alone enforcing the policy when no header is sent |

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
   It also runs `pnpm audit --prod --audit-level=high`, which fails on a known high or critical advisory in a production dependency. An advisory in a development dependency is reported by a second, non-blocking step.
2. **build**: `pnpm build`, then checks that `out/_headers`, `security.txt` and `headers.vercel.json` exist, that the policy never contains `unsafe-inline` or `unsafe-eval`, and runs `node scripts/postbuild.mjs --check` (a policy tag in every HTML file, a header policy for every page). Uploads `out/` as an artifact.
3. **e2e**: downloads that artifact, installs Chromium and runs Playwright against it.

The workflow has `contents: read` permission only, no secrets, and does not deploy. Actions are pinned to major version tags (mutable). `.github/dependabot.yml` opens a weekly grouped pull request for npm (minor and patch together, majors alone) and for the actions, so pins stay fresh through reviewed changes. Pinning to a commit SHA is the stricter option and can replace the tags if the owner wants it.

## Credits

Geist Sans and Geist Mono (SIL Open Font License) are self-hosted through the `geist` package.
