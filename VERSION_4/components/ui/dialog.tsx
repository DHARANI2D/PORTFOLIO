"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type PopupProps = React.ComponentProps<typeof BaseDialog.Popup>;

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Always required: it is the dialog's accessible name. Visually hidden when `hideTitle`. */
  title: string;
  description?: React.ReactNode;
  /** Hide the title (and description) visually but keep them for assistive tech. */
  hideTitle?: boolean;
  /**
   * modal: centred card, top-aligned on mobile (default).
   * sheet: full-screen surface at every width (mobile menu).
   */
  variant?: "modal" | "sheet";
  /**
   * Close control inside the popup. Base UI asks for one so touch screen-reader users can leave.
   * sr-only (default): present for assistive tech, visible only on keyboard focus, so it never
   * overlaps content such as a search field. visible: a 44px icon button top-right. none: omit.
   */
  closeButton?: "sr-only" | "visible" | "none";
  /**
   * Classes for the popup. Width: `max-w-*`. Pin a tall, changing popup (search results) to the
   * top on desktop with `md:top-[15dvh] md:translate-y-0` instead of the default centring.
   */
  className?: string;
  initialFocus?: PopupProps["initialFocus"];
  finalFocus?: PopupProps["finalFocus"];
  onOpenChangeComplete?: (open: boolean) => void;
  children: React.ReactNode;
};

const popupBase = [
  "z-50 flex flex-col overflow-y-auto overscroll-contain bg-surface text-foreground outline-none",
  "transition-[opacity,scale,translate] duration-200 ease-out motion-reduce:transition-none",
  "data-starting-style:opacity-0 data-ending-style:opacity-0",
].join(" ");

const popupVariants = {
  // Centred on desktop, pinned near the top on mobile with safe margins. No box-shadow: a 1px border carries the edge.
  modal: cn(
    popupBase,
    "fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] mx-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl rounded-lg border border-border-strong",
    "md:top-1/2 md:-translate-y-1/2",
    "data-starting-style:scale-[0.98] data-ending-style:scale-[0.98]",
  ),
  sheet: cn(
    popupBase,
    "fixed inset-0 h-dvh w-full bg-background",
    "data-starting-style:translate-y-2 data-ending-style:translate-y-2",
  ),
} as const;

/**
 * Modal dialog on Base UI: focus trap, focus restore to the opener, Esc and outside-press dismissal,
 * page scroll lock and inert background all come from the primitive. Entrance is CSS only.
 * With a visible title the body is padded; with `hideTitle` children render bare so palettes and
 * terminals can own their layout.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  variant = "modal",
  closeButton = "sr-only",
  className,
  initialFocus,
  finalFocus,
  onOpenChangeComplete,
  children,
}: DialogProps) {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-background/80 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <BaseDialog.Popup
          initialFocus={initialFocus}
          finalFocus={finalFocus}
          className={cn(popupVariants[variant], className)}
        >
          {hideTitle ? (
            <div className="sr-only">
              <BaseDialog.Title>{title}</BaseDialog.Title>
              {description ? <BaseDialog.Description>{description}</BaseDialog.Description> : null}
            </div>
          ) : (
            <div className="flex flex-col gap-2 px-6 pt-6 pr-16 pb-4">
              <BaseDialog.Title className="text-2xl headline">{title}</BaseDialog.Title>
              {description ? (
                <BaseDialog.Description className="text-sm text-muted">
                  {description}
                </BaseDialog.Description>
              ) : null}
            </div>
          )}
          {hideTitle ? children : <div className="px-6 pb-6">{children}</div>}
          {closeButton === "none" ? null : (
            // Last in DOM order so initial focus lands on the first tabbable item of the content.
            <BaseDialog.Close
              aria-label="Close"
              className={cn(
                "absolute top-3 right-3 z-10 inline-flex size-11 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground motion-reduce:transition-none",
                closeButton === "sr-only" &&
                  "border border-border-strong bg-surface text-foreground [clip-path:inset(50%)] focus-visible:[clip-path:none]",
              )}
            >
              <X aria-hidden className="size-4" />
            </BaseDialog.Close>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/** Styled close control for dialogs that lay out their own header (e.g. the mobile sheet). */
export function DialogClose({
  className,
  ...props
}: Omit<React.ComponentProps<typeof BaseDialog.Close>, "className"> & { className?: string }) {
  return <BaseDialog.Close className={className} {...props} />;
}
