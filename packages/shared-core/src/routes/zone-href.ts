/**
 * Convert a full public path into an href that is correct for `next/link` in
 * whichever application is rendering it.
 *
 * ── The problem this solves ────────────────────────────────────────────────
 *
 * The shared route helpers — `productPath()`, `MARKETPLACE_ROUTES`,
 * `DOCTOR_ROUTES` and the rest — return the path as a visitor sees it in the
 * address bar: `/marketplace/product/abc`. That is the right answer for the
 * shell (which has no basePath), for canonical and og:url, and for the sitemap.
 *
 * It is the wrong answer for `next/link` *inside the zone that owns the
 * prefix*. Each zone sets `basePath`, and Next prepends it to every next/link
 * href and router push. So the marketplace zone rendering
 * `<Link href={productPath(p)}>` emitted
 * `/marketplace/marketplace/product/abc`, which matches no route: the layout
 * rendered, the page did not, and the visitor got the zone's chrome wrapped
 * around a 404.
 *
 * One return value cannot serve all three callers, so the adjustment happens
 * at the call site that knows it is inside a zone.
 *
 * ── What it does ───────────────────────────────────────────────────────────
 *
 *   in the shell (no basePath)     '/marketplace/product/x' -> unchanged
 *   in the marketplace zone        '/marketplace/product/x' -> '/product/x'
 *   in the grocery zone            '/marketplace/product/x' -> unchanged
 *
 * That last case is deliberate and is NOT sufficient on its own: a path into
 * another zone must not go through `next/link` at all, because basePath would
 * prepend the *current* zone's prefix and produce `/grocery/marketplace/...`.
 * Cross-zone destinations belong in `<ZoneLink>`, which renders a plain anchor
 * and is exempt from basePath. `zoneHref` leaves those paths untouched so the
 * mistake stays visible rather than being half-corrected.
 */

/**
 * The basePath of the application doing the rendering, or '' in the shell.
 *
 * Read from an environment variable rather than Next's internal
 * `__NEXT_ROUTER_BASEPATH`, so the value is declared in the same next.config
 * that sets `basePath` and does not depend on a private field.
 */
const ZONE_BASE_PATH = (process.env.NEXT_PUBLIC_ZONE_BASE_PATH ?? '').replace(/\/$/, '');

export function zoneHref(fullPath: string | null | undefined): string {
  const path = fullPath ?? '';
  if (!ZONE_BASE_PATH) return path;            // the shell renders full paths
  if (path === ZONE_BASE_PATH) return '/';
  if (path.startsWith(ZONE_BASE_PATH + '/')) return path.slice(ZONE_BASE_PATH.length);
  if (path.startsWith(ZONE_BASE_PATH + '?') || path.startsWith(ZONE_BASE_PATH + '#')) {
    return '/' + path.slice(ZONE_BASE_PATH.length);
  }
  return path;                                  // another zone, or already relative
}

/** The current application's basePath — '' in the shell. Exported for tests and guards. */
export function currentZoneBasePath(): string {
  return ZONE_BASE_PATH;
}
