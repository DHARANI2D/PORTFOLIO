/**
 * Pure helpers for the contact form. Nothing here touches the network or the DOM:
 * the form composes a mailto: URL and the visitor's own email client does the sending.
 */

export const PURPOSES = [
  { value: "security-engineering", label: "Security engineering" },
  { value: "research", label: "Research collaboration" },
  { value: "systems", label: "Systems work" },
  { value: "other", label: "Something else" },
] as const;

export const MESSAGE_MAX = 1000;

export type ComposeInput = {
  /** Recipient. Constant from lib/site.ts, never user input. */
  to: string;
  name: string;
  email: string;
  /** One of PURPOSES[].value. Anything else is treated as "other". */
  purpose: string;
  message: string;
};

/** Single-line fields cannot carry line breaks into the subject or the From line. */
function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** RFC 6068 wants CRLF for line breaks inside a mailto body. */
function toCrlf(value: string): string {
  return value.replace(/\r\n?|\n/g, "\r\n");
}

/** encodeURIComponent throws on lone surrogates, so replace them with U+FFFD first. */
function wellFormed(value: string): string {
  return typeof value.toWellFormed === "function" ? value.toWellFormed() : value;
}

export function purposeLabel(value: string): string {
  return PURPOSES.find((purpose) => purpose.value === value)?.label ?? "Something else";
}

/** Builds the mailto: URL. Every user-supplied part goes through encodeURIComponent. */
export function composeMailto({ to, name, email, purpose, message }: ComposeInput): string {
  const label = purposeLabel(purpose);
  const cleanName = wellFormed(oneLine(name));
  const cleanEmail = wellFormed(oneLine(email));

  const subject = `Portfolio contact: ${label}${cleanName ? ` (${cleanName})` : ""}`;
  const body = toCrlf(
    `${wellFormed(message).trim()}\n\n--\nFrom: ${cleanName} <${cleanEmail}>\nPurpose: ${label}`,
  );

  // "@" is legal in the recipient part of a mailto URL, so restore it to keep the address readable.
  const recipient = encodeURIComponent(to).replace(/%40/g, "@");
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
