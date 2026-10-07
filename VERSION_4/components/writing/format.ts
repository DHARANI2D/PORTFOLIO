const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/**
 * "04 OCT 2026" from an ISO date (YYYY-MM-DD). Explicit UTC parts and no Intl, so the string is the
 * same on every build machine and in every time zone.
 */
export function formatDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  const date = new Date(time);
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getUTCMonth()] ?? ""} ${date.getUTCFullYear()}`;
}

/** 3 -> "003". */
export const pad3 = (n: number): string => String(n).padStart(3, "0");

/** "FIELD NOTE / 003" */
export const noteLabel = (n: number): string => `FIELD NOTE / ${pad3(n)}`;

/** "4 MIN READ" */
export const readLabel = (minutes: number): string => `${minutes} MIN READ`;
