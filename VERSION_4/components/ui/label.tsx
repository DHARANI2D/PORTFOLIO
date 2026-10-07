import { cn } from "@/lib/utils";

/** Small mono uppercase metadata label: dates, IDs, section numbers, tags. */
export function Label({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("label-mono text-muted", className)} {...props} />;
}
