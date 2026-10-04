# Security of the site

This is the threat model of the website itself, not of the systems it describes. The site belongs to a security engineer, so it is held to a standard it can be checked against.

## Summary

- Static export. No server code runs when a visitor loads a page: no API, no form handler, no database, no secrets, no accounts.
- A Content-Security-Policy generated at build time. Scripts are allowed by hash only: no `'unsafe-inline'`, no `'unsafe-eval'`, no hosts.
- No third-party scripts, fonts, images or analytics. Every request a page makes goes to its own origin.
- One known compromise: `style-src` allows `'unsafe-inline'` (inline `style` attributes). See [style-src](#style-src-the-one-compromise).
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
| Clickjacking                                   | `frame-ancestors 'none'` and `X-Frame-Options: DENY`.                                                                                                                                                                                                                                              |
| Tabnabbing and referrer leaks                  | `rel="noopener noreferrer"` on every `target="_blank"` link; `Referrer-Policy: strict-origin-when-cross-origin`; the palette opens external links with `noopener,noreferrer`.                                                                                                                      |
| Downgrade and mixed content                    | HSTS with `includeSubDomains; preload`; `upgrade-insecure-requests`.                                                                                                                                                                                                                               |
| MIME sniffing                                  | `X-Content-Type-Options: nosniff`.                                                                                                                                                                                                                                                                 |
| Base-tag and plugin abuse                      | `base-uri 'self'`, `object-src 'none'`.                                                                                                                                                                                                                                                            |
| Powerful browser features                      | `Permissions-Policy` disables camera, microphone, geolocation, payment, USB and FLoC. `Cross-Origin-Opener-Policy: same-origin`.                                                                                                                                                                   |
| Form abuse                                     | The contact form never submits to a server. It composes a `mailto:` URL in the browser. `form-action 'self' mailto:` allows nothing else.                                                                                                                                                          |
| Privacy                                        | No cookies, no analytics. Four preference keys in browser storage (theme, view, go-to shortcuts, a once-per-tab intro flag), all local and listed on `/privacy/`. Storage failures are handled: the site works without it.                                                                         |
| Build-time data (GitHub API)                   | Fetched once at build, 5 s timeout, response validated with Zod, only `https://github.com` URLs accepted, text stripped of control characters and emoji, curated fallback on any failure. A failure cannot fail the build or inject content.                                                       |
| Stale or missing security.txt                  | Generated on every build with `Expires` 364 days ahead; the build verifies the file; CI checks it.                                                                                                                                                                                                 |
| Weak policy shipped by mistake                 | `postbuild.mjs` re-reads what it wrote and fails if any page has an inline script its CSP would block, or a `script-src` with an unsafe source.                                                                                                                                                    |

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
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self' mailto:;
object-src 'none';
upgrade-insecure-requests
```

| Directive                    | Rationale                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src 'self'`         | Anything not listed is same-origin only.                                                                                                                                                                                                        |
| `script-src 'self' hashes`   | Same-origin bundles, plus the exact inline scripts above. Dynamic `import()` of same-origin chunks (the terminal) is covered by `'self'`.                                                                                                       |
| `img-src 'self' data:`       | Same-origin images; `data:` for small inlined assets.                                                                                                                                                                                           |
| `font-src 'self'`            | Geist is self-hosted through `next/font`.                                                                                                                                                                                                       |
| `connect-src 'self'`         | Client navigation fetches same-origin payloads. Nothing else is contacted.                                                                                                                                                                      |
| `frame-ancestors 'none'`     | Nobody may embed the site. Also sent as `X-Frame-Options: DENY` for old browsers.                                                                                                                                                               |
| `base-uri`, `object-src`     | Close two classic injection routes.                                                                                                                                                                                                             |
| `form-action 'self' mailto:` | The contact form falls back to a native `mailto:` submission when JavaScript is off. That hands the message to the visitor's own mail client and posts nothing to a server. Without `mailto:` here the no-JavaScript fallback would be blocked. |
| `upgrade-insecure-requests`  | Belt and braces next to HSTS.                                                                                                                                                                                                                   |

### One policy per page

`_headers` carries the baseline headers on `/*` and a separate `Content-Security-Policy` per page path, each listing only that page's hashes. The alternative, one policy listing every hash on the site, grows with each page and hits host limits (Cloudflare Pages ignores `_headers` lines over 2,000 characters). A hash valid on one page is also not valid on another, which keeps each policy minimal.

The policy is deliberately **not** in the `/*` rule: hosts either merge or join headers from overlapping rules, and two policies on one response are both enforced, so a hash missing from either would block the script. `verifyHeadersFile` fails the build if a page ends up with zero or two policies. A single global policy is available with `node scripts/postbuild.mjs --mode global` (or `CSP_MODE=global`) for hosts without size limits.

### style-src: the one compromise

`style-src` is `'self' 'unsafe-inline'`.

React and Motion write inline `style` attributes (positions, transforms, custom properties, animated values). A CSP can allow an attribute only with `'unsafe-inline'`, or with `'unsafe-hashes'` plus a hash for every distinct attribute value. The values are open-ended (animation frames, measured sizes), so hashing them is not possible.

What limits the risk:

- CSS cannot execute script, and `script-src` still blocks every injected script, hashed or not.
- The usual CSS exfiltration routes are closed by `img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'` and `form-action`.
- There is no untrusted input anywhere in the page that could carry CSS.

The residual risk is UI redressing by an attacker who can already inject markup, which `script-src` and the absence of user content make unlikely. A future tightening would split the directive (`style-src 'self'` plus `style-src-attr 'unsafe-inline'`) after confirming in a browser that no inline `<style>` element or injected stylesheet is needed. That has not been verified against the built output, so it has not been done.

### Known limits

- **Unknown URLs.** A host serves `404.html` for an unmatched path, and header rules match the requested path, so that response carries the baseline headers but no CSP. The page is static and trusted, so the exposure is small. `/404.html` itself has a policy.
- **`/index.html` requested directly.** Rules cover the canonical `/…/` paths, not `/…/index.html`. Most hosts redirect it.
- **Hashes change on every build.** The Next.js flight data embeds the build id (`payload.b`), so hashes differ between builds even with identical content. Netlify and Cloudflare Pages are fine because headers are regenerated each build. A committed `vercel.json` cannot follow, which is why it ships baseline headers only and the build refuses a stale copy (see the README). Setting a fixed `generateBuildId` in `next.config.ts` would make hashes depend on content alone.
- **Rewriting by the host.** Any post-processing that edits HTML or inline scripts invalidates hashes. `netlify.toml` disables Netlify's.
- **Reports.** There is no `report-uri` or `report-to`: it would need an endpoint, which means a server and collected data. Violations are caught by the end-to-end tests, which fail on console errors with the production policy enforced.

## Build guarantees

`scripts/postbuild.mjs` exits non-zero, failing `pnpm build`, if:

- `out/` is missing or contains no HTML;
- any page has an inline event-handler attribute, a `javascript:` URL or a subresource (script, stylesheet, image, font, frame, form target) on another origin;
- the generated `_headers` does not give every page exactly one acceptable CSP containing the hash of each of its inline scripts, or lacks any baseline header;
- `security.txt` lacks a valid `Contact` or `Expires`, or has expired;
- on Vercel, `vercel.json` holds a stale CSP.

`node scripts/postbuild.mjs --check` repeats the verification on an existing `out/` without writing. CI runs it.

## Supply chain

- **Lockfile.** `pnpm-lock.yaml` is committed and CI installs with `--frozen-lockfile`, so a dependency cannot change without a reviewed lockfile diff.
- **Few runtime dependencies.** Shipped to the browser: React, React DOM, the Next.js client runtime, Motion, Base UI, lucide icons (tree-shaken), clsx, tailwind-merge, class-variance-authority. Zod and the content data reach the browser only in the terminal's lazily loaded chunk. MDX, Shiki, remark and Tailwind run at build time only.
- **No remote assets.** Fonts come from the `geist` package at build time. Nothing is loaded from a CDN, so a CDN compromise cannot reach the site.
- **No analytics or tag managers**, and none can load: the CSP would block them and the build would fail on a reference to another origin.
- **GitHub Actions.** The workflow requests `permissions: contents: read` and uses no secrets. Checkout runs with `persist-credentials: false`. It never uses `pull_request_target`, so pull requests from forks run with a read-only token and no secrets. Actions are pinned to major version tags, which are mutable. The stronger form is pinning each action to a commit SHA and letting Dependabot update them; that is not set up.
- **The artifact** passed from the build job to the e2e job is the exact `out/` that was verified.

## Out of scope

- Security of the hosting account, DNS registrar and domain. Enable two-factor authentication on all of them; this is the largest real-world risk to a static site and nothing in the code can reduce it.
- Availability and denial of service. The site is files on a CDN.
- The security of linked third-party sites (GitHub, LinkedIn, Credly, Microsoft Learn, Google Drive, Hashnode).
- The owner's mailbox, devices and credentials.
- Vulnerabilities in dependencies that are not yet public. `pnpm audit` and the lockfile diff are the controls.
- Anything about WITNESS, SignalFusion, AEGIS or the other systems described here. Their descriptions are content, not code.
- Browser vulnerabilities, malicious extensions and compromised visitor devices.

## Reporting a vulnerability

The contact address and expiry are in `/.well-known/security.txt` on the deployed site, generated on every build from `lib/site.ts` (linked from the footer). Write there with a description and steps to reproduce.

## Review checklist

Before publishing a change that touches rendering, headers or dependencies:

1. `pnpm build` passes (this runs the post-build verification).
2. `pnpm test` and `pnpm test:e2e` pass; a CSP violation shows up as a failing console-error assertion.
3. No new `dangerouslySetInnerHTML`, inline event handler, `<script>` or third-party URL.
4. No new `localStorage` or `sessionStorage` key without a line on `/privacy/`.
5. No new claim without a source in `docs/FACTS.md`.
6. `git diff pnpm-lock.yaml` reviewed if dependencies changed.
