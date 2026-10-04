/**
 * The illustrated portrait (a stylised drawing, not a photo), shown small and only on /about.
 * The PNG has an opaque black matte, so it always sits in a rounded, bordered frame: on the dark
 * theme it reads as a panel, on the light theme as an intentional dark tile rather than a cut-out.
 * 404x499 are the file's real dimensions. They reserve the aspect ratio, so there is no layout
 * shift; the frame sets the displayed width (160px).
 */
export function Avatar() {
  return (
    <figure className="w-40">
      <div className="overflow-hidden rounded-lg border border-border-strong">
        {/* A plain <img> on purpose: next/image would add an inline style, which the site's strict
            CSP forbids, and optimisation is off for the static export anyway. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/helios-avatar.png"
          width={404}
          height={499}
          alt="Illustrated portrait of Dharanidharan Senthilkumar"
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="mt-3 label-mono text-muted">Illustrated portrait</figcaption>
    </figure>
  );
}
