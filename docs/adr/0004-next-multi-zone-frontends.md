# 0004 — One Next.js zone per vertical

**Status:** Accepted, 2026-09-05

## Context

Each vertical's customer-facing frontend was extracted from a single
application into its own independently built and deployed Next.js
application — a "zone" — with the shell at `apps/web` rewriting requests to
it rather than rendering the vertical's routes itself. That extraction
surfaced two failures that needed a structural fix, not a patch.

First, without `basePath` set, a zone renders once and then 404s on its own
JavaScript: Next prepends `basePath` to every internal link, router push, and
crucially every `/_next/*` asset URL, and the shell has no route pointing at
those assets unless the rewrite forwards them too. `apps/web`'s `rewrites()`
therefore declares two rules per zone, not one — the page routes themselves,
and a second rule for `/<vertical>/_next/*` — because a single rule renders
the page and then fails to hydrate on a 404 for its own bundle.

Second, image configuration does not travel with the extraction. A zone is
its own Next application, and none of the eight had image configuration
after being split out; every remote image threw `Invalid src prop ...
next-image-unconfigured-host`, which is not a broken image but a thrown
error — the nearest error boundary caught it and replaced the whole page
with "Page failed to load." Each zone's `next.config.mjs` now carries its own
`images` block rather than inheriting the shell's.

A third problem showed up in navigation rather than configuration: a
`next/link` pointing at a route in a _different_ zone gets the _current_
zone's `basePath` prepended, not the target's — `<Link href="/support">`
inside the pharmacy zone renders `/pharmacy/support`, and
`<Link href="/grocery">` renders `/pharmacy/grocery`, neither of which
exists. Crossing a zone boundary is a document request regardless, since the
target is a separately built and deployed application with no client-side
transition to preserve, so a plain anchor — exempt from `basePath` rewriting
— is both correct and honest about that. A second, narrower case exists
within a single zone: the shared route helpers (`productPath()`,
`MARKETPLACE_ROUTES`, and the rest) return the full public path as a visitor
sees it in the address bar, which is correct for the shell but doubles up
when a zone's own `next/link` renders it, since `basePath` prepends the
prefix a second time.

Not every vertical's customer surface became its own zone: `/hotel-owner` and
`/admin/taxi` (and the equivalent admin and vendor surfaces for the other
verticals) stay in the shell, because they share the shell's login, OTP,
registration and approval-status flows rather than the customer-facing
booking UI.

## Decision

Each vertical's customer-facing frontend is its own Next.js application with
`basePath: '/<vertical>'`, built and deployed independently; the shell at
`apps/web` rewrites `/<vertical>/*` and `/<vertical>/_next/*` to it.
Cross-zone links go through `<ZoneLink>` in `packages/shared-ui`, never
through `next/link` with a raw path; same-zone links built from the shared
route helpers pass through `zoneHref()` in `packages/shared-core`, which
strips the zone's own basePath.

## Consequences

The frontend is nine independently deployable applications — the shell plus
eight zones (marketplace, grocery, restaurant, pharmacy, doctor,
hotel-booking, taxi, franchise) — rather than one. Each can be built,
deployed and rolled back on its own schedule, at the cost of nine
`next.config.mjs` files, nine sets of environment variables for zone
origins, and nine Docker images instead of one.

Shared code between the shell and the zones, or between zones, can only flow
through the `packages/` workspaces (`shared-core`, `shared-ui`); a zone
cannot import another zone's source tree, since each is its own application
with its own build.

Every zone needs its own `images` configuration, its own i18n request config
wiring (loaded by literal relative path, since the plugin resolves it at
config-load time, not through a tsconfig alias), and its own `basePath`-aware
handling for any link that leaves the zone. Missing any of these does not
fail a build — it fails silently in the browser, as a 404'd asset or a
misrouted link.
