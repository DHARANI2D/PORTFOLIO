/**
 * The illustrated portrait (a stylised drawing, not a photo), shown small and only on /about.
 * The artwork has an opaque black matte, so it is presented the same way in both themes: a rounded
 * tile with a 1px border on a black panel. On the light theme that reads as a deliberate dark
 * illustration card rather than a cut-out that failed to blend in.
 * 320x395 are the file's real dimensions (2x the 160px display width). They reserve the aspect
 * ratio, so there is no layout shift; the frame sets the displayed width (160px). WebP, about 14 KB.
 */
export function Avatar() {
  return (
    <figure className="w-40">
      <div className="overflow-hidden rounded-lg border border-muted bg-black">
        {/* A plain <img> on purpose: next/image would add an inline style, which the site's strict
            CSP forbids, and optimisation is off for the static export anyway. It is above the fold
            on phones, so it loads eagerly rather than lazily. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/helios-avatar.webp"
          width={320}
          height={395}
          alt="Illustrated portrait of Dharanidharan Senthilkumar"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="mt-3 label-mono text-muted">Illustrated portrait</figcaption>
    </figure>
  );
}
