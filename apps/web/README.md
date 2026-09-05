# KARTSEEK Web

## What this is

The Next.js shell that fronts the platform: home, account, auth, cart,
checkout, orders, search, the static/legal pages, `sitemap.ts`/`robots.ts`,
and `src/app/api/*` route handlers, plus three areas large enough to matter
that stayed in the shell instead of becoming their own zone — the admin
console (250 route pages), the seller portal for every vertical (181), and
the hotel-owner console (33). Eight verticals (marketplace, grocery,
restaurant, pharmacy, doctor, hotel-booking, taxi, franchise) are instead
their own independently built and deployed Next.js applications ("zones"),
and this shell rewrites each vertical's path to its zone rather than
rendering it itself. See
[`../../docs/architecture/frontend-zones.md`](../../docs/architecture/frontend-zones.md)
for the full rewrite table and why those three areas stayed put.

## Run

`npm run dev:web` from the repository root (`turbo run dev --filter=kartseek-web`).
The shell alone renders its own routes; opening a vertical path needs the API
gateway reachable and that vertical's zone running too — see
[`../../docs/guides/running-services.md`](../../docs/guides/running-services.md)
for how to start a useful subset.

## Test

- `npm test -w kartseek-web` — Jest.
- `npm run test:e2e -w kartseek-web` — Playwright, five specs under `e2e/`;
  needs the platform up.
- `npm run type-check -w kartseek-web`.
- `npm run lint -w kartseek-web` — currently crashes (a nested ESLint
  10.9.1 fails with `scopeManager.addGlobals is not a function`) rather than
  reporting problems; this is a known, pre-existing gap, not something a
  change here broke. See
  [`../../docs/guides/testing.md`](../../docs/guides/testing.md#known-pre-existing-gaps).

## Configuration

`apps/web` has no `.env.example`; `.env.local` is what `next dev` and
`next build` actually read locally. The variables that matter:

- `NEXT_PUBLIC_API_URL` — the API gateway origin **including** `/api/v1`.
- `NEXT_PUBLIC_WS_URL` — the gateway's **bare** origin, no `/api/v1` suffix
  (Socket.IO appends its own path).
- `*_ZONE_ORIGIN` (one per vertical, e.g. `MARKETPLACE_ZONE_ORIGIN`) — where
  `next.config.mjs` sends each rewritten path; unset falls back to that
  zone's local default port.

All three are resolved in one place,
[`packages/shared-core/src/config/api-base.ts`](../../packages/shared-core/src/config/api-base.ts) —
never read `process.env` directly for a gateway or WebSocket URL. A missing
variable throws at startup in production rather than silently falling back
to `localhost`.

The consent banner reserves space for itself with a `--consent-banner-height`
CSS variable rather than fixed padding, so a fixed-position sidebar or footer
does not sit underneath it — see the padding rule in
`src/app/seller/marketplace/layout.tsx` for a worked example.

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3000 | — |
<!-- prettier-ignore-end -->

The shell: serves the top-level routes and rewrites each vertical path to its zone.
Image: `kartseek/web`. Workspace: `kartseek-web`.

<!-- registry:end -->

## Layout

```
apps/web/
├── src/app/            # route groups: (home), (account), admin, seller,
│                       # hotel-owner, auth, cart, checkout, orders, search,
│                       # api/ (route handlers), sitemap.ts, robots.ts, ...
├── src/components/     # admin, seller, taxi, india, guards
├── src/lib/            # export-csv, india/pincode, seller/country-compliance;
│                       # index.ts re-exports most of packages/shared-core
│                       # through the `@/lib/*` alias map in tsconfig.json
├── scripts/
│   └── build-og-image.mjs
└── e2e/                # Playwright specs
```

Shared frontend code (the API client, i18n, routes, hooks, shared
components) lives in `packages/shared-core` and `packages/shared-ui`, not
here — neither a zone nor this shell may import another zone's source tree
directly. See
[`../../docs/architecture/frontend-zones.md`](../../docs/architecture/frontend-zones.md)
for what belongs in each package and the linking rule between zones.
