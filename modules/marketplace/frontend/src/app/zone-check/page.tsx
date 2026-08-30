/**
 * Zone reachability probe.
 *
 * Renders from the marketplace zone (port 3002) but is requested through the
 * shell (port 3000) at /marketplace/zone-check. If this page returns, the
 * shell rewrite, the zone's basePath and its asset prefix all line up. It is
 * the smallest thing that proves the multi-zone wiring before any real route
 * is migrated onto it.
 *
 * Named without a leading underscore on purpose: App Router treats a folder
 * beginning with `_` as a private folder and excludes it from routing, so the
 * first version of this probe 404'd on both the zone and the shell.
 *
 * Remove once the migration is complete and real routes cover the same ground.
 */
export const dynamic = 'force-dynamic';

export default function ZoneCheck() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', lineHeight: 1.6 }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Marketplace zone is serving</h1>
      <p style={{ color: '#555' }}>
        Rendered by <code>@kartseek/marketplace-frontend</code> on port 3002, reached through the
        shell on port 3000.
      </p>
      <p style={{ color: '#555' }}>
        Served at <code>{new Date().toISOString()}</code>
      </p>
    </main>
  );
}
