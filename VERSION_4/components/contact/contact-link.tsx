import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A quiet inline pointer to /contact/, for pages that end a reader's path (work, resume). Plain
 * underlined text, no button: it adds an inbound link without competing with the page's own actions.
 */
export function ContactLink({
  lead = "Questions about this work?",
  className,
}: {
  lead?: string;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted", className)}>
      {lead}{" "}
      <Link
        href="/contact/"
        className="text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none"
      >
        Get in touch
      </Link>
      .
    </p>
  );
}
