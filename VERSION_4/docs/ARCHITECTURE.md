# Architecture

How the site is put together, in the order a request, a piece of content and a build each move through it. For the security reasoning behind the headers see [`SECURITY.md`](SECURITY.md); for what may be written on the site see [`FACTS.md`](FACTS.md).

## Shape

A Next.js App Router project exported as static files (`output: "export"` in `next.config.ts`). `next build` renders every page to HTML at build time into `out/`. Nothing runs on a server afterwards. The same `out/` deploys to Netlify, Cloudflare Pages, Vercel or any file host.

Consequences that shape the code:

- No route handlers (except metadata routes with `export const dynamic = "force-static"`), no server actions, no `headers()` or `cookies()`.
- Every dynamic route has `generateStaticParams` and `export const dynamicParams = false`, so an unknown slug is a 404 and not a runtime lookup.
- Images are not optimised at runtime (`images.unoptimized`).
- Response headers cannot be set from Next.js, so `scripts/postbuild.mjs` generates them after the build, and also writes the Content-Security-Policy into the HTML itself so a host without header support still enforces it.

## Routing

| URL                      | File                                                                | Data                                                    |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------- |
| `/`                      | `app/page.tsx`                                                      | Sections compose content accessors (see Home below)     |
| `/about/`                | `app/about/page.tsx`                                                | `getExperience()`, `site`                               |
| `/experience/`           | `app/experience/page.tsx`                                           | `getExperience()`, `getCertifications()`                |
| `/systems/`              | `app/systems/page.tsx`                                              | `getProjectsByTier()`, `getEarlierWork()`               |
| `/systems/[slug]/`       | `app/systems/[slug]/page.tsx`                                       | `getProject(slug)`; params from `getProjects()`         |
| `/research/`             | `app/research/page.tsx`                                             | `getResearch()`                                         |
| `/research/[slug]/`      | `app/research/[slug]/page.tsx`                                      | `getResearchItem(slug)`                                 |
| `/writing/`              | `app/writing/page.tsx`                                              | `getWritingPosts()`                                     |
| `/writing/[slug]/`       | `app/writing/[slug]/page.tsx`                                       | `getWritingPost(slug)`; params from `getWritingSlugs()` |
| `/certifications/`       | `app/certifications/page.tsx`                                       | `getCertifications()`                                   |
| `/resume/`               | `app/resume/page.tsx`                                               | `site`; resume preview, print styles, PDF link          |
| `/contact/`, `/privacy/` | `app/contact/`, `app/privacy/`                                      | `site`; the privacy page lists every storage key        |
| 404                      | `app/not-found.tsx`                                                 | Exported as `404.html`                                  |
| Metadata files           | `app/sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx` | Content accessors, `site`                               |

`trailingSlash: true` makes every page `dir/index.html`, so URLs end in `/` and any static host serves them without rewrites. Canonical URLs, the sitemap and the navigation all use the trailing-slash form.

`app/layout.tsx` is the one shared shell: the theme init script and JSON-LD in `<head>`, a skip link, then inside `GraphProvider` the `SecurityGraph`, `SiteHeader`, `<main id="main" tabIndex={-1}>`, `SiteFooter`, `CommandPalette` and `TerminalDialog`. It awaits `buildSearchIndex()` once and passes the result to the palette as plain data.

## Content flow

```
content/*.ts, content/projects/*.ts, content/research/*.ts     typed data
        |  z.array(Schema).parse()   at module load, content/schema.ts
        v
lib/content.ts   getProjects(), getResearch(), getExperience(), getSkills(),
                 getCertifications(), getEarlierWork(), getMetrics()
        |
        +--> server components (pages, home sections)
        +--> lib/search-index.ts  -> layout -> <CommandPalette items=...>   (plain data to the client)
        +--> components/terminal/terminal-context.ts  -> dynamic import on first terminal open

content/writing/*.mdx   export const meta = {...} + MDX body
        |  @next/mdx (remark-gfm, Shiki) compiles at build; WritingMeta.parse(meta)
        v
lib/writing.ts   getWritingSlugs(), getWritingPosts(), getWritingPost(slug), getHeadings(slug)
```

Rules that keep this honest:

- **Pages read content only through `lib/content.ts`.** A schema violation throws during `next build`.
- **Numbers are derived.** `getMetrics()` counts the content; the home panel, the terminal's `status` and the tests all read it. Nothing types a count.
- **Facts come from `docs/FACTS.md`.** Content files cite it in their header comments. Inferred case-study text (threat models, decisions) is listed in `CONTENT_REVIEW.md` for the owner to confirm.
- **The terminal and the palette are not special.** Both are views over the same accessors.
- `lib/search-index.ts` is split into pure functions (`composeSearchItems`, `findMentions`) and one server-only wrapper (`buildSearchIndex`) that reads the MDX sources, so the pure part is unit-tested.

### Home composition

`app/page.tsx` renders `Hero`, then the numbered sections: 01 SIGNAL, 02 SYSTEMS (cards with a `MiniDiagram`, and the engineering-activity panel), 03 EXPERIENCE, 04 RESEARCH, 05 STACK, 06 FIELD NOTES, 07 CONTACT. Each section component renders its own `<Section>` with its id, index and label.

The engineering-activity panel gets its repository list from `lib/github.ts`, which calls the public GitHub API at build time (5 s timeout, Zod-validated, `https://github.com` URLs only) and falls back to a curated list built from `earlier-work.ts`.

## Client boundaries

Server components are the default. `"use client"` appears only on small interactive leaves:

| Leaf                                          | Why it needs the client                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `navigation/site-header`, `mobile-menu`       | Active link from the pathname, sheet state                              |
| `navigation/theme-toggle`, `view-toggle`      | Write `data-theme` / `data-view`, read them with `useSyncExternalStore` |
| `ui/dialog`                                   | Base UI dialog (focus trap, restore, Esc)                               |
| `command/command-palette`                     | Global keyboard shortcuts, search, router navigation                    |
| `terminal/terminal`                           | Input, history; loads its interpreter and data on first open            |
| `graph/graph-context`, `graph/security-graph` | Activation store and the ambient SVG that subscribes to it              |
| `hero/helios-core`, `boot-console`, `reveal`  | Hero animation and scroll reveal, both as enhancements                  |
| `skills/count-up`                             | Number count-up                                                         |
| `systems/architecture-diagram`                | Interactive diagram: selection, signal flow                             |
| `career/scroll-phase`, `writing/note-toc`     | Scroll-linked state                                                     |
| `contact/contact-form`                        | Builds the `mailto:` link in the browser                                |
| `resume/print-button`                         | `window.print()`                                                        |

Rules for these leaves: take serializable props from a server parent, render the final state on the server and animate as an enhancement (so the page reads correctly with JavaScript off), and honour `prefers-reduced-motion`.

`lib/terminal-commands.ts` is pure (no DOM, no content imports, data arrives as a context argument) so the zod schemas and case-study text stay out of every page's JavaScript. Only `terminal-context.ts` touches `lib/content`, and only through a dynamic import.

## Preferences and view modes

`lib/preferences.ts` owns theme (`dark` | `light`) and view (`engineer` | `recruiter`).

1. The layout renders `<html data-theme="dark" data-view="engineer">` and an inline `INIT_SCRIPT` in `<head>`.
2. Before first paint the script reads `localStorage` (`ds-theme`, `ds-view`), validates the values against the two allowed ones and sets the attributes. If storage throws, it sets the defaults.
3. `applyTheme` / `applyView` set the attribute, persist, and dispatch a `ds:preferences` event. `useTheme` / `useView` subscribe with `useSyncExternalStore`, with the default as the server snapshot so hydration matches.
4. CSS does the rest. Tokens switch under `[data-theme="light"]`. In `app/globals.css`, `[data-view="recruiter"] [data-engineer-only]` and `[data-view="engineer"] [data-recruiter-only]` are `display: none !important`.

The view switch never re-renders content, so it costs nothing and works with static HTML. The init script is the only inline executable script the site owns, so its hash is the one constant entry in every page's CSP.

`lib/ui-events.ts` is a tiny window-event bus (`ds:open-palette`, `ds:open-terminal`) so the header, footer and palette can open overlays without prop drilling.

## Security graph and activation

The fixed background `SecurityGraph` shows seven nodes (`soc`, `detection`, `cloud`, `ai`, `dfir`, `agents`, `automation`, defined in `content/schema.ts`). Sections and pages say which domains they are about:

- `GraphActivator nodes={[...]}` (renders nothing) lights those nodes while its parent section is in the viewport. It can be used from server components.
- `useGraphActivation(nodes)` lights them for the lifetime of a client component.
- Registrations are reference-counted in a store outside React state (`createGraphStore`). Only `SecurityGraph` subscribes, through `useSyncExternalStore`, so scrolling re-renders one small SVG.
- Projects and research items carry `graphNodes`, so the same data drives the graph, the terminal's `matrix` command and the domain tags.

The graph is decorative: `aria-hidden`, `pointer-events-none`, static under reduced motion.

## Diagrams and view transitions

Projects can carry an `architecture` (nodes on an integer grid, edges, named trust boundaries). `ArchitectureDiagram` draws it; `MiniDiagram` draws the short `flow` array on cards. Both wrap the diagram in `<ViewTransition name="diagram-<slug>">`, so navigating from a card to the case study morphs the small diagram into the full one (`experimental.viewTransition` in `next.config.ts`; disabled by the reduced-motion rules in `globals.css`). Every diagram that carries meaning also has a text alternative.

## Build pipeline

```
pnpm build
 |
 +-- next build
 |     - validates content (zod) and MDX frontmatter
 |     - renders every route to out/**/index.html, plus 404.html
 |     - metadata routes: sitemap.xml, robots.txt, manifest.webmanifest, opengraph-image
 |     - copies public/ and fingerprinted assets to out/_next/static/
 |     - fetches the GitHub repo list once (falls back if it fails)
 |
 +-- node scripts/postbuild.mjs
       1. read lib/site.ts            email and canonical origin (NEXT_PUBLIC_SITE_URL overrides)
       2. walk out/**/*.html          audit: inline handlers, javascript: URLs, other-origin subresources
       3. hash inline content         sha256 per file: inline scripts, <style> elements, style="" attribute values.
                                      JSON-LD and external scripts excluded
       4. write the policy into HTML  <meta http-equiv="Content-Security-Policy"> first in <head> (after
                                      <meta charset>) of EVERY html file, 404.html and _not-found included
       5. write out/_headers          baseline headers on /*, a CSP per page (with frame-ancestors), cache and
                                      content-type rules
       6. write out/headers.vercel.json
       7. write out/.well-known/security.txt   Policy points at /security/
       8. verify what it wrote        every file has exactly one policy tag, first in <head>, equal to its page's
                                      policy; every inline script, style and attribute allowed; no unsafe source
                                      anywhere; headers present
       9. compare vercel.json         fail on Vercel if it carries a stale CSP
```

`scripts/lib/csp.mjs` holds all the logic as pure functions (tokenising HTML, hashing, building and parsing policies and `_headers`, security.txt, the site-config parser). `postbuild.mjs` only reads and writes files, which is what makes both testable. `node scripts/postbuild.mjs --check` runs the reading and verification steps (1, 2, 3, 8 and 9) against an existing `out/`, without writing. The tag insertion is idempotent: an earlier tag is replaced, and it changes no script, so no hash moves.

Do not edit `out/` after post-build, and do not let the host rewrite it: the hashes would no longer match.

## Tests

- `tests/unit` (Vitest): content integrity and claims, CSP and headers, `postbuild.mjs` end to end against fixture exports, the fuzzy matcher, the terminal interpreter, the search index and palette model, preferences and the init script, SEO helpers and JSON-LD escaping, the build-log selector, reading time, the sitemap, robots and manifest, the OG image render, and the e2e static server.
- `tests/e2e` (Playwright): run against `out/` through `tests/e2e/static-server.mjs`, which applies `out/_headers` and serves each page's policy tag (minus `upgrade-insecure-requests` in both, which would rewrite same-origin requests on plain http; `--csp-header off` drops the header to test the tag alone). Routes are discovered from `out/sitemap.xml`. `fixtures.ts` exports a `test` that fails on any CSP violation (the DOM event and policy console errors). `tests/e2e/tsconfig.json` type-checks the specs as part of `pnpm typecheck`. `helpers.ts` waits for hydration by opening and closing the palette through its own idempotent event, because a key pressed before hydration is lost.

## Where to change what

| I want to…                        | Change                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Add a system, research item, note | `content/` (see README)                                                                                                       |
| Change identity, links, brand     | `lib/site.ts`                                                                                                                 |
| Change the policy or headers      | `scripts/lib/csp.mjs`, then `docs/SECURITY.md`                                                                                |
| Add a route                       | `app/<route>/page.tsx` with `buildMetadata`, then `app/sitemap.ts` and the palette's `NAVIGATE` list in `lib/search-index.ts` |
| Store something in the browser    | Add a line to the storage table in `app/privacy/page.tsx` first                                                               |
| Add an interactive element        | A new small `"use client"` leaf; keep the server HTML complete                                                                |
