import { cn } from "@/lib/utils";

/** Page-width container: 1280px max, 24px mobile / 40px desktop gutters. */
export function Container({
  className,
  as: Tag = "div",
  ...props
}: React.ComponentProps<"div"> & {
  as?: "div" | "section" | "header" | "footer" | "main" | "nav";
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[1280px] px-6 md:px-10", className)} {...props} />
  );
}
