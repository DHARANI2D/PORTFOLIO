import { ArrowUpRight } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import type { Certification } from "@/content/schema";

/** Only https links are ever rendered, whatever the content says. */
const isHttps = (url: string | undefined): url is string => !!url && /^https:\/\//i.test(url);

/** Shown next to the link so a visitor sees where it leads before clicking. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "ISSUER · YEAR". The year is shown only when the content has one. */
function metaLine(cert: Certification): string {
  return [cert.issuer, cert.year].filter(Boolean).join(" · ");
}

export function GroupHeading({ id, label, count }: { id: string; label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b pb-4">
      <h2 id={id} className="label-mono text-foreground">
        {label}
      </h2>
      <span className="label-mono text-muted">
        {pad(count)} {count === 1 ? "ITEM" : "ITEMS"}
      </span>
    </div>
  );
}

function VerifiedRow({ cert }: { cert: Certification }) {
  const meta = metaLine(cert);

  return (
    <li className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 border-b py-6 md:grid-cols-[0.5rem_minmax(0,1fr)_auto] md:items-center">
      {/* Filled marker: earned. The group heading says EARNED, so no extra text is needed. */}
      <span
        aria-hidden
        className="mt-3 size-2 self-start rounded-full bg-accent md:mt-0 md:self-center"
      />
      <div className="min-w-0">
        <p className="text-lg text-foreground">{cert.name}</p>
        {meta ? <p className="mt-2 label-mono text-muted">{meta}</p> : null}
      </div>

      {isHttps(cert.url) ? (
        <a
          href={cert.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link col-start-2 inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-2 self-start label-mono text-foreground transition-colors duration-200 hover:text-accent motion-reduce:transition-none md:col-start-3 md:ml-6 md:self-center"
        >
          <span>
            VIEW CREDENTIAL
            <span className="sr-only"> for {cert.name}</span>
          </span>
          <span className="[overflow-wrap:anywhere] text-muted">{hostOf(cert.url)}</span>
          <ArrowUpRight
            aria-hidden
            className="size-3.5 shrink-0 transition-transform duration-200 motion-safe:group-hover/link:translate-x-0.5 motion-safe:group-hover/link:-translate-y-0.5 motion-reduce:transition-none"
          />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="col-start-2 label-mono text-muted md:col-start-3 md:ml-6">
          NO PUBLIC LINK
        </span>
      )}
    </li>
  );
}

/** Earned credentials, in the order the content lists them. A link only where a URL exists. */
export function VerifiedCertifications({
  items,
  labelledBy,
}: {
  items: readonly Certification[];
  labelledBy: string;
}) {
  return (
    <ul aria-labelledby={labelledBy}>
      {items.map((cert) => (
        <VerifiedRow key={cert.name} cert={cert} />
      ))}
    </ul>
  );
}

const STATUS_LABEL: Record<Certification["status"], string> = {
  verified: "VERIFIED",
  "in-progress": "IN PROGRESS",
  planned: "PLANNED",
};

function NextRow({ cert }: { cert: Certification }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-dashed py-6">
      <div className="flex items-start gap-3">
        {/* Hollow marker: not earned. The PLANNED / IN PROGRESS tag says it in text as well. */}
        <span
          aria-hidden
          className="mt-3 size-2 shrink-0 rounded-full border border-muted bg-transparent"
        />
        <div className="min-w-0">
          <p className="text-lg text-foreground">{cert.name}</p>
          {cert.issuer ? <p className="mt-2 label-mono text-muted">{cert.issuer}</p> : null}
        </div>
      </div>
      <Tag className="border-dashed">{STATUS_LABEL[cert.status]}</Tag>
    </li>
  );
}

/** Planned and in-progress items. Never styled as completed: dashed rule, hollow marker, status tag. */
export function NextCertifications({
  items,
  labelledBy,
}: {
  items: readonly Certification[];
  labelledBy: string;
}) {
  return (
    <ul aria-labelledby={labelledBy}>
      {items.map((cert) => (
        <NextRow key={cert.name} cert={cert} />
      ))}
    </ul>
  );
}
