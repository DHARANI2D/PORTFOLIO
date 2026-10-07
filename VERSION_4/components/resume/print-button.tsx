"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const getHydrated = () => true;
const getHydratedOnServer = () => false;

/**
 * Opens the browser's print dialog. Without JavaScript the button would do nothing, so it stays
 * invisible (space reserved, so nothing shifts) until the page has hydrated. Printing is the
 * browser's own; nothing leaves the device.
 */
export function PrintButton({ className }: { className?: string }) {
  const hydrated = useSyncExternalStore(subscribe, getHydrated, getHydratedOnServer);

  return (
    <Button
      variant="ghost"
      onClick={() => window.print()}
      className={cn(!hydrated && "invisible", "print:hidden", className)}
    >
      PRINT
    </Button>
  );
}
