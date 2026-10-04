import { cn } from "@/lib/utils";

type TagProps = React.ComponentProps<"span"> & {
  /** Selected state: accent border + soft accent fill + full-strength text. */
  active?: boolean;
};

/**
 * Mono metadata chip. Rectangular with a 1px border, not a pill.
 * Selected is shown by border, fill and text brightness together (never colour alone).
 * The selected label stays text-foreground: accent text on the soft accent fill is ~4.2:1 in dark.
 */
export function Tag({ active = false, className, ...props }: TagProps) {
  return (
    <span
      data-active={active ? "" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-[0.6875rem] leading-none tracking-[0.1em] whitespace-nowrap uppercase transition-colors duration-200 motion-reduce:transition-none",
        active ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted",
        className,
      )}
      {...props}
    />
  );
}
