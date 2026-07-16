/**
 * CORS origin matching (NFR-5). `ALLOWED_ORIGINS` is a comma-separated list of
 * origins; two extensions beyond exact matching:
 *
 * - An entry may use a leading wildcard label (`https://*.example.com`) to
 *   allow any subdomain explicitly.
 * - A Cloudflare Pages production origin (`https://<project>.pages.dev`)
 *   implicitly allows its per-commit preview deployments
 *   (`https://<hash>.<project>.pages.dev`) — they are builds of the same app,
 *   so requiring a secret update per commit would make previews useless.
 */

/** Parse the comma-separated `ALLOWED_ORIGINS` value into trimmed entries. */
export function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((allowed) => matchesEntry(origin, allowed));
}

function matchesEntry(origin: string, allowed: string): boolean {
  if (origin === allowed) return true;

  // Explicit wildcard entry: https://*.example.com
  const wildcard = splitOrigin(allowed.replace('://*.', '://'));
  if (allowed.includes('://*.') && wildcard) {
    return isSubdomainOf(origin, wildcard.scheme, wildcard.host);
  }

  // Implicit Pages previews: https://<hash>.<project>.pages.dev
  const parsed = splitOrigin(allowed);
  if (parsed?.host.endsWith('.pages.dev')) {
    return isSubdomainOf(origin, parsed.scheme, parsed.host);
  }

  return false;
}

function isSubdomainOf(origin: string, scheme: string, parentHost: string): boolean {
  const parsed = splitOrigin(origin);
  return parsed?.scheme === scheme && parsed.host.endsWith(`.${parentHost}`);
}

/** `https://a.b.dev` → scheme + host; null when the value is not an origin. */
function splitOrigin(value: string): { scheme: string; host: string } | null {
  const match = /^(https?):\/\/([^/:]+)(?::\d+)?$/.exec(value);
  const scheme = match?.[1];
  const host = match?.[2];
  if (scheme === undefined || host === undefined) return null;
  return { scheme, host };
}
