import { site } from "@/lib/site";

/**
 * mailto: URL for the site's own address. The address is a constant from lib/site.ts, so there is
 * no visitor input to sanitise, but it is encoded anyway ("@" restored: it is legal in a recipient).
 */
export const emailHref = `mailto:${encodeURIComponent(site.email).replace(/%40/g, "@")}`;
