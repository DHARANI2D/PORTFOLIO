/** Timing of the home-page boot console. Pure, so it is unit-tested without a DOM. */

export const BOOT_LINES = [
  "initializing security profile",
  "loading detection systems",
  "loading AI systems",
  "loading research",
  "status: operational",
] as const;

export const START_DELAY_MS = 250;
export const CHAR_MS = 14;
export const LINE_PAUSE_MS = 160;

/** Where the sequence is: `line` is being typed and `chars` of it are shown. */
export type BootProgress = { line: number; chars: number };

/** Total length of the sequence in ms: about 2.4 s with the values above, under the 3 s budget. */
export const TOTAL_MS =
  START_DELAY_MS +
  BOOT_LINES.reduce((sum, line) => sum + line.length * CHAR_MS, 0) +
  (BOOT_LINES.length - 1) * LINE_PAUSE_MS;

/** Maps elapsed time to progress, or null once the sequence is over. */
export function progressAt(elapsedMs: number): BootProgress | null {
  if (elapsedMs >= TOTAL_MS) return null;
  let t = Math.max(0, elapsedMs - START_DELAY_MS);
  for (let line = 0; line < BOOT_LINES.length; line += 1) {
    const length = BOOT_LINES[line]?.length ?? 0;
    const typing = length * CHAR_MS;
    if (t < typing) return { line, chars: Math.floor(t / CHAR_MS) };
    t -= typing;
    if (t < LINE_PAUSE_MS) return { line, chars: length };
    t -= LINE_PAUSE_MS;
  }
  return null;
}
