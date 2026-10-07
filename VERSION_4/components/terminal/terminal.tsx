import { TerminalDialogClient } from "@/components/terminal/terminal-dialog";
import { buildTerminalData } from "@/lib/terminal-data";

/**
 * Terminal easter egg, server half. This is a Server Component on purpose: it reads the validated
 * content while the page is exported and hands the client dialog plain data as props, so zod, the
 * content schema and the case-study text never enter a browser bundle (and zod's `new Function("")`
 * feature probe never runs under the site's strict Content-Security-Policy).
 *
 * The root layout renders this once. The interpreter itself loads on first open, see
 * terminal-dialog.tsx.
 */
export function TerminalDialog() {
  return <TerminalDialogClient data={buildTerminalData()} />;
}
