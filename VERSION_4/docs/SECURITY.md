# Security of the site

This is the threat model of the website itself, not of the systems it describes. The site belongs to a security engineer, so it is held to a standard it can be checked against.

## Summary

- Static export. No server code runs when a visitor loads a page: no API, no form handler, no database, no secrets, no accounts.
- A Content-Security-Policy generated at build time, written into every HTML file as a `<meta>` tag and sent as a header where the host supports it. Scripts, styles and style attributes are allowed by hash only: no `'unsafe-inline'`, no `'unsafe-eval'`, no hosts.
- No third-party scripts, fonts, images or analytics. Every request a page makes goes to its own origin.
- No known compromise in the policy itself. Two things only a response header can do are missing on hosts without header support: `frame-ancestors` and HSTS. See [Host matrix](#host-matrix).
- Build fails, instead of shipping, when the output breaks these rules.

## Assets

| Asset                                 | Why it matters                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Integrity of the pages a visitor sees | A defaced or script-injected portfolio of a security engineer is the worst outcome for its owner.        |
| Visitors' browsers and privacy        | Visitors include recruiters and peers. The site should not track or expose them.                         |
| The hosting account, domain and DNS   | Control of any of them is control of the site.                                                           |
| The source repository and CI          | The build output is only as trustworthy as what built it.                                                |
| Accuracy of claims                    | Every claim is traceable to `docs/FACTS.md`. An invented metric is a credibility failure.                |
| The owner's inbox                     | The contact path. The site never receives messages, it only hands them to the visitor's own mail client. |

There is no user data to protect: the site collects none.

## Trust boundaries

```
 visitor's browser  <--HTTPS-->  static host / CDN  <--deploy--  build (local or CI)  <--  repository
                                                                        |
                                                                        +-- GitHub API (public, build time only)
```

- **Browser to host.** The only runtime boundary. Everything the host sends is a file produced by the build, plus the headers in `out/_headers`.
- **Build to host.** `pnpm build` produces `out/`. Nothing is edited after `scripts/postbuild.mjs` runs: the CSP hashes would no longer match.
- **Repository and CI.** Content is committed and reviewed. CI has read-only repository access.
- **Third parties.** The site embeds none. Outbound links (GitHub, LinkedIn, Credly, Microsoft Learn, Google Drive, Hashnode) are plain links that open in a new tab with `rel="noopener noreferrer"`. The one automated network call is at build time to the public GitHub API (see below).

## Threats and controls

| Threat                                         | Controls                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script injection (XSS)                         | Hash-only `script-src`. `dangerouslySetInnerHTML` appears twice only: the theme init script (a constant) and JSON-LD (data, with `<` escaped to `<`). No `innerHTML`, `eval` or `new Function` in the site's own code. No inline event-handler attributes (the build fails on them).               |
| Injection through content                      | Content is typed data and MDX in the repository, validated with Zod and compiled at build time. There is no user-generated content and no runtime parsing of untrusted input, apart from the terminal and the palette, which only match against build-time data and echo input as printable ASCII. |
| Malicious URLs                                 | Palette and terminal only produce internal paths built from known slugs, `https://` links from build-time data, and the owner's `mailto:`. `mailto:` links are built with `encodeURIComponent`.                                                                                                    |
| Third-party compromise (CDN, analytics, fonts) | None are used. The build fails if the HTML references another origin for scripts, styles, images, fonts or frames. `connect-src 'self'`.                                                                                                                                                           |
| Clickjacking                                   | `frame-ancestors 'none'` and `X-Frame-Options: DENY`, both headers (a `<meta>` policy ignores `frame-ancestors`). A host that sends no headers cannot refuse framing.                                                                                                                              |
| Tabnabbing and referrer leaks                  | `rel="noopener noreferrer"` on every `target="_blank"` link; `Referrer-Policy: strict-origin-when-cross-origin`; the palette opens external links with `noopener,noreferrer`.                                                                                                                      |
| Downgrade and mixed content                    | HSTS with `includeSubDomains; preload`; `upgrade-insecure-requests`.                                                                                                                                                                                                                               |
| MIME sniffing                                  | `X-Content-Type-Options: nosniff`.                                                                                                                                                                                                                                                                 |
| Base-tag and plugin abuse                      | `base-uri 'self'`, `object-src 'none'`.                                                                                                                                                                                                                                                            |
| Powerful browser features                      | `Permissions-Policy` disables camera, microphone, geolocation, payment, USB and FLoC. `Cross-Origin-Opener-Policy: same-origin`.                                                                                                                                                                   |
| Form abuse                                     | The contact form never submits to a server. It composes a `mailto:` URL in the browser. `form-action 'self' mailto:` allows nothing else.                                                                                                                                                          |
| Privacy                                        | No cookies, no analytics. Four preference keys in browser storage (theme, view, go-to shortcuts, a once-per-tab intro flag), all local and listed on `/privacy/`. Storage failures are handled: the site works without it.                                                                         |
| Build-time data (GitHub API)                   | Fetched once at build, 5 s timeout, response validated with Zod, only `https://github.com` URLs accepted, text stripped of control characters and emoji, curated fallback on any failure. A failure cannot fail the build or inject content.                                                       |
| Stale or missing security.txt                  | Generated on every build with `Expires` 364 days ahead; the build verifies the file; CI checks it.                                                                                                                                                                                                 |
| Weak policy shipped by mistake                 | `postbuild.mjs` re-reads what it wrote and fails if any HTML file lacks its policy tag, or has an inline script, `<style>` or style attribute its policy would block, or a policy with an unsafe source (scripts or styles).                                                                       |
| Vulnerable dependency                          | CI runs `pnpm audit --prod --audit-level=high` and fails on a high or critical advisory in a production dependency; development-only advisories are reported without blocking. Dependabot opens weekly update PRs.                                                                                 |

## Content-Security-Policy

### Why hashes

A nonce needs a server that issues a fresh value per response. A static export has none. Next.js still emits inline scripts, and their text is fixed at build time, so each one is allowed by its sha256 hash:

1. The theme init script (`INIT_SCRIPT` in `lib/preferences.ts`), which sets `data-theme` and `data-view` before first paint so the page does not flash.
2. The React Server Components flight data (`self.__next_f.push(...)`), which hydrates the page.
3. JSON-LD blocks are `type="application/ld+json"` data, never executed, and need no entry.

`scripts/lib/csp.mjs` finds the executable inline scripts in every built page and hashes them (`extractInlineScripts`, `hashScript`). `buildCsp` refuses anything that is not a plain `'sha…-…'` source, so a hash list cannot smuggle in another directive.

### The policy

```
default-src 'self';
script-src 'self' 'sha256-…' …;
style-src 'self';
style-src-attr 'unsafe-hashes' 'sha256-…' …;     only on pages that have style attributes
img-src 'self';
font-src 'self';
connect-src 'self';
frame-ancestors 'none';                           header only
base-uri 'self';
form-action 'self' mailto:;
object-src 'none';
upgrade-insecure-requests
```

| Directive                    | Rationale                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src 'self'`         | Anything not listed is same-origin only.                                                                                                                                                                                                        |
| `script-src 'self' hashes`   | Same-origin bundles, plus the exact inline scripts above. Dynamic `import()` of same-origin chunks (the terminal) is covered by `'self'`.                                                                                                       |
| `style-src 'self'`           | Same-origin stylesheets. No page has an inline `<style>` element (measured, see below); if one ever appears, the build hashes it into this directive instead of weakening it.                                                                   |
| `style-src-attr`             | The static `style="..."` attributes in the built HTML, each allowed by the sha256 of its value through `'unsafe-hashes'`. Present only on the pages that have any.                                                                              |
| `img-src 'self'`             | Same-origin images only. No built page or stylesheet uses a `data:` image (checked in the built HTML and CSS, and by the e2e suite across every route).                                                                                         |
| `font-src 'self'`            | Geist is self-hosted through `next/font`.                                                                                                                                                                                                       |
| `connect-src 'self'`         | Client navigation fetches same-origin payloads. Nothing else is contacted.                                                                                                                                                                      |
| `frame-ancestors 'none'`     | Nobody may embed the site. Header only: a `<meta>` policy ignores it. Also sent as `X-Frame-Options: DENY` for old browsers.                                                                                                                    |
| `base-uri`, `object-src`     | Close two classic injection routes.                                                                                                                                                                                                             |
| `form-action 'self' mailto:` | The contact form falls back to a native `mailto:` submission when JavaScript is off. That hands the message to the visitor's own mail client and posts nothing to a server. Without `mailto:` here the no-JavaScript fallback would be blocked. |
| `upgrade-insecure-requests`  | Belt and braces next to HSTS. Honoured in a `<meta>` policy too.                                                                                                                                                                                |

### In the HTML and in headers

`postbuild.mjs` puts each page's policy into the page as `<meta http-equiv="Content-Security-Policy" content="...">`, the first element in `<head>` after `<meta charset>` (the charset tag must stay within the first 1,024 bytes, and the policy is longer than that; it loads nothing). It does this for every HTML file in `out/`, including `404.html` and `_not-found/index.html`. The same policy, plus `frame-ancestors`, goes into `_headers` for hosts that read it.

- A browser enforces every policy it receives, so on Netlify and Cloudflare Pages the header and the tag both apply. They are identical except for `frame-ancestors`, so neither can block what the other allows.
- A `<meta>` policy ignores `frame-ancestors`, `report-uri` and `sandbox`. The tag omits them.
- The tag is inserted after the hashes are computed and changes no script, so no hash moves. The step is idempotent (an earlier tag is replaced) and `--check` fails if any file lacks its tag, has two, has it anywhere but first, or has a policy that differs from what that page needs.
- The e2e suite proves it: with the header switched off (`static-server.mjs --csp-header off`) an injected inline script, a `data:` image and a `style` attribute are all blocked.

### Host matrix

| Host                                 | CSP                       | `frame-ancestors` / `X-Frame-Options` | HSTS and baseline headers | Unknown URLs and 404                                         |
| ------------------------------------ | ------------------------- | ------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| Netlify, Cloudflare Pages            | header (per page) and tag | yes                                   | yes, from `_headers`      | tag; header rules match the requested path, so no header CSP |
| Vercel                               | tag                       | `X-Frame-Options` from `vercel.json`  | yes, from `vercel.json`   | tag                                                          |
| Any other static host or file server | tag                       | no                                    | only what the host sets   | tag                                                          |

Remaining header-only gaps on a host that sends no security headers: `frame-ancestors` (clickjacking), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP. The only mitigation is a host that sets them. On Vercel the baseline set comes from `vercel.json`, so only `frame-ancestors` (covered by `X-Frame-Options: DENY`) is missing.

### One policy per page

`_headers` carries the baseline headers on `/*` and a separate `Content-Security-Policy` per page path, each listing only that page's hashes. The alternative, one policy listing every hash on the site, grows with each page and hits host limits (Cloudflare Pages ignores `_headers` lines over 2,000 characters; the longest line today is 1,200). A hash valid on one page is also not valid on another, which keeps each policy minimal.

The header policy is deliberately **not** in the `/*` rule: hosts either merge or join headers from overlapping rules, and two policies on one response are both enforced, so a hash missing from either would block the script. `verifyHeadersFile` fails the build if a page ends up with zero or two header policies. A single global header policy is available with `node scripts/postbuild.mjs --mode global` (or `CSP_MODE=global`) for hosts without size limits; the tags stay per page.

### style-src: measured, not assumed

Earlier versions allowed `'unsafe-inline'` in `style-src`, on the belief that React and Motion write open-ended inline `style` attributes that cannot be hashed. That was wrong, and measured on the built output it does not hold:

- **`<style>` elements: 0** in all 27 built HTML files.
- **`style="..."` attributes**: none on 25 files. Two field notes have them, all Shiki code-highlighting custom properties (`--shiki-light`, `--shiki-dark`): 56 attributes with 7 distinct values on `deterministic-evidence-gate-for-remediation`, and 45 with 4 distinct values on `siem-alerts-to-correlated-investigations`. They are fixed at build time, so each distinct value is hashed.
- **Runtime changes** by React, Motion and Base UI go through the CSSOM (`element.style.x = ...`, `style.setProperty`), which CSP does not govern. Nothing calls `setAttribute("style", ...)` or injects a `<style>` element.
- **Result:** across every route, in both themes, after opening the palette and the terminal, switching theme and view, opening the menu and hovering a diagram, the e2e suite records zero `securitypolicyviolation` events and zero policy console errors (`tests/e2e/platform-fixes.spec.ts`, and the guard in `tests/e2e/fixtures.ts` on the routes, interactions and a11y specs).

So `style-src` is `'self'`, `style-src-attr` carries the hashes on the two pages that need them (at most 7 per page), and `'unsafe-inline'` appears nowhere. `cspWeaknesses` fails the build if it ever does. The policy stays small: a new note with highlighted code adds at most a handful of hashes, computed on every build.

Brittleness: a new library that writes a style attribute into the HTML at build time simply gets hashed. One that sets the attribute at runtime with `setAttribute`, or injects a `<style>` element, would be blocked and fail the e2e violation guard, which is the intended alarm.

### Known limits

- **Unknown URLs.** A host serves `404.html` for an unmatched path, and header rules match the requested path, so that response carries the baseline headers but no header CSP. It does carry the policy tag, which is why the tag exists. `/404.html` and `/_not-found/` (a copy of the 404 page that returns 200 when requested by name) also have header rules.
- **`/index.html` requested directly.** Rules cover the canonical `/…/` paths, not `/…/index.html`. Most hosts redirect it.
- **Hashes change on every build.** The Next.js flight data embeds the build id (`payload.b`), so hashes differ between builds even with identical content. Netlify and Cloudflare Pages are fine because headers are regenerated each build. A committed `vercel.json` cannot follow, which is why it ships baseline headers only (the policy reaches Vercel through the tag) and the build refuses a stale copy (see the README). Setting a fixed `generateBuildId` in `next.config.ts` would make hashes depend on content alone.
- **Rewriting by the host.** Any post-processing that edits HTML or inline scripts invalidates hashes. `netlify.toml` disables Netlify's. A host that injects its own scripts (an analytics or "speed" feature) would be blocked by the policy, which is the intended result.
- **Header-only protections.** `frame-ancestors`, HSTS and the rest of the baseline set need response headers. See the [host matrix](#host-matrix).
- **Reports.** There is no `report-uri` or `report-to`: it would need an endpoint, which means a server and collected data. Violations are caught by the end-to-end tests, which fail on console errors with the production policy enforced.

## Build guarantees

`scripts/postbuild.mjs` exits non-zero, failing `pnpm build`, if:

- `out/` is missing or contains no HTML;
- any page has an inline event-handler attribute, a `javascript:` URL or a subresource (script, stylesheet, image, font, frame, form target) on another origin;
- any HTML file (error pages and `_not-found` included) lacks its `<meta>` policy tag, has more than one, does not have it first in `<head>`, or has one that differs from what that page needs;
- an inline script, `<style>` element or style attribute is not allowed by its page's policy, or any policy allows `'unsafe-inline'` or `'unsafe-eval'` where it must not;
- the generated `_headers` does not give every page exactly one acceptable CSP containing the hash of each of its inline scripts, or lacks any baseline header;
- `security.txt` lacks a valid `Contact` or `Expires`, or has expired;
- on Vercel, `vercel.json` holds a stale CSP.

`node scripts/postbuild.mjs --check` repeats the verification on an existing `out/` without writing. CI runs it.

## Supply chain

- **Lockfile.** `pnpm-lock.yaml` is committed and CI installs with `--frozen-lockfile`, so a dependency cannot change without a reviewed lockfile diff.
- **Few runtime dependencies.** Shipped to the browser: React, React DOM, the Next.js client runtime, Motion, Base UI, lucide icons (tree-shaken), clsx, tailwind-merge, class-variance-authority. Zod and the content data reach the browser only in the terminal's lazily loaded chunk. MDX, Shiki, remark and Tailwind run at build time only.
- **No remote assets.** Fonts come from the `geist` package at build time. Nothing is loaded from a CDN, so a CDN compromise cannot reach the site.
- **No analytics or tag managers**, and none can load: the CSP would block them and the build would fail on a reference to another origin.
- **Advisories.** CI runs `pnpm audit --prod --audit-level=high` in the quality job. It fails on a high or critical advisory in a production dependency. Development dependencies never reach visitors; their advisories are reported by a non-blocking step. `.github/dependabot.yml` opens weekly pull requests for npm (minor and patch grouped, majors one by one) and for GitHub Actions.
- **GitHub Actions.** The workflow requests `permissions: contents: read` and uses no secrets. Checkout runs with `persist-credentials: false`. It never uses `pull_request_target`, so pull requests from forks run with a read-only token and no secrets. Actions are pinned to major version tags, which are mutable; Dependabot keeps them current through reviewed pull requests. The stricter form is a full commit SHA per action, which Dependabot also updates; adopt it if the repository starts to accept contributions from others.
- **The artifact** passed from the build job to the e2e job is the exact `out/` that was verified.

## Out of scope

- Security of the hosting account, DNS registrar and domain. Enable two-factor authentication on all of them; this is the largest real-world risk to a static site and nothing in the code can reduce it.
- Availability and denial of service. The site is files on a CDN.
- The security of linked third-party sites (GitHub, LinkedIn, Credly, Microsoft Learn, Google Drive, Hashnode).
- The owner's mailbox, devices and credentials.
- Vulnerabilities in dependencies that are not yet public. `pnpm audit`, Dependabot and the lockfile diff are the controls.
- Anything about WITNESS, SignalFusion, AEGIS or the other systems described here. Their descriptions are content, not code.
- Browser vulnerabilities, malicious extensions and compromised visitor devices.

## Reporting a vulnerability

The contact address and expiry are in `/.well-known/security.txt` on the deployed site, generated on every build from `lib/site.ts` (linked from the footer). Its `Policy` field points at `/security/`, the page that says what is in scope and how to report. Write to the contact address with a description and steps to reproduce.

## Review checklist

Before publishing a change that touches rendering, headers or dependencies:

1. `pnpm build` passes (this runs the post-build verification).
2. `pnpm test` and `pnpm test:e2e` pass; a CSP violation shows up as a failing console-error assertion.
3. No new `dangerouslySetInnerHTML`, inline event handler, `<script>` or third-party URL.
4. No new `localStorage` or `sessionStorage` key without a line on `/privacy/`.
5. No new claim without a source in `docs/FACTS.md`.
6. `git diff pnpm-lock.yaml` reviewed if dependencies changed.
