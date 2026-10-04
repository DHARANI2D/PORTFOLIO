/** Types for scripts/lib/csp.mjs, so TypeScript tests can import it under `strict`. */

export type HtmlTag = {
  name: string;
  attrs: Record<string, string>;
  /** Raw text between the tags; present for <script> and <style> only. */
  body?: string;
};

export type HeaderRule = { path: string; headers: [string, string][] };
export type PageCsp = { path: string; csp: string };
export type PageHashes = { path: string; scriptHashes: readonly string[] };
export type VercelHeaderRule = { source: string; headers: { key: string; value: string }[] };

export function iterateTags(html: string): Generator<HtmlTag>;
export function extractInlineScripts(html: string): string[];
export function auditHtml(html: string, options: { siteOrigin: string }): string[];

export function hashScript(content: string): string;
export function scriptHashesOf(html: string): string[];
export function buildCsp(input: { scriptHashes: readonly string[] }): string;
export function parseCsp(csp: string): Map<string, string[]>;
export function cspWeaknesses(csp: string): string[];

export const BASELINE_HEADERS: readonly (readonly [string, string])[];
export const IMMUTABLE_CACHE: string;
export function buildHeadersFile(input: { csp: string }): string;
export function buildPageHeadersFile(input: { pages: readonly PageCsp[] }): string;
export function buildVercelHeaders(input: {
  csp?: string;
  pages?: readonly PageCsp[];
}): VercelHeaderRule[];
export function parseHeadersFile(text: string): HeaderRule[];
export function matchingRules(rules: readonly HeaderRule[], pathname: string): HeaderRule[];
export function headersForPath(rules: readonly HeaderRule[], pathname: string): [string, string][];
export function pagePathFromFile(relativeFile: string): string | null;
export function verifyHeadersFile(input: {
  headersText: string;
  pages: readonly PageHashes[];
}): string[];

export function checkVercelConfig(input: {
  vercelJson: string;
  generated: readonly VercelHeaderRule[];
}): string[];

export const SECURITY_TXT_VALID_DAYS: number;
export function securityTxtExpires(now?: Date, days?: number): Date;
export function buildSecurityTxt(input: {
  contact: string;
  expires: Date | string;
  canonical: string;
  policy?: string;
}): string;

export function verifySecurityTxt(text: string, now?: Date): string[];

export function parseSiteConfig(
  source: string,
  env?: Record<string, string | undefined>,
): { email: string; url: string; origin: string };
