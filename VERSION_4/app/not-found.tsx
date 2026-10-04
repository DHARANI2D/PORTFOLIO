import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This address does not match any page on the site.",
  robots: { index: false, follow: false },
};

// The site's SIGNAL -> CONTEXT -> DECISION -> ACTION motif, applied to a failed request.
const record = [
  { key: "SIGNAL", value: "A request arrived for an address with no page." },
  { key: "CONTEXT", value: "The page was removed, renamed, or never existed." },
  { key: "DECISION", value: "Return 404. No guessing at what was meant." },
  { key: "ACTION", value: "Go home, open the systems, or search." },
] as const;

export default function NotFound() {
  return (
    <Container className="flex min-h-[70dvh] flex-col justify-center py-24 md:py-32">
      <Label className="block">
        <span className="text-accent">404</span> / SIGNAL LOST
      </Label>
      <h1 className="mt-6 max-w-[16ch] text-5xl display md:text-7xl">No page at this address.</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        The link may be old, or the address mistyped. There is no page here.
      </p>

      <dl className="mt-12 max-w-2xl border-t">
        {record.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-1 gap-1 border-b py-3 md:grid-cols-[8rem_1fr] md:gap-6"
          >
            <dt>
              <Label>{row.key}</Label>
            </dt>
            <dd className="text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink href="/" variant="primary" arrow>
          Back to home
        </ButtonLink>
        <ButtonLink href="/systems/" variant="secondary">
          View systems
        </ButtonLink>
      </div>

      <p className="mt-8 hidden label-mono text-muted pointer-fine:block">
        Or press <kbd className="rounded-sm border px-1 py-0.5 font-mono">⌘K</kbd> /{" "}
        <kbd className="rounded-sm border px-1 py-0.5 font-mono">CTRL K</kbd> to search
      </p>
    </Container>
  );
}
