# Frontend: shell, zones and shared packages

This document is for anyone building a page in `apps/web` or one of the eight
module frontends, or deciding whether new UI code belongs in a zone, in the
shell, or in one of the `packages/` workspaces. It covers the shell/zone
split, how the shell routes to each zone, what the two shared frontend
packages actually contain, how translations are shared across nine separate
Next.js applications, the rule for linking between them, and the current size
of the three web areas that stayed inside the shell instead of becoming their
own zone.

## The shell/zone model

[ADR 0004](../adr/0004-next-multi-zone-frontends.md) is the decision record;
this section is the as-built shape of it. `apps/web` is the shell — the
storefront's own routes (home, cart, checkout, the admin console, the seller
portals) — and eight verticals are each their own independently built and
deployed Next.js application (a "zone"), reached through the shell's
rewrites: marketplace, grocery, restaurant, pharmacy, doctor, hotel-booking,
taxi and franchise. Not every vertical's surface became a zone — `/hotel-owner`
and the various `/admin/*` and `/seller/*` vendor consoles stay in the shell
because they share its login, OTP, registration and approval-status flows
rather than the customer-facing booking UI ADR 0004 describes.

## The rewrite table

`apps/web/next.config.mjs`'s `rewrites()` resolves each zone's origin from an
environment variable (default a local port), and declares two rules per
zone — the page routes, and a second rule for the zone's own `/_next/*`
assets, because a zone's `basePath` prepends itself to every asset URL and a
single rule would render the page and then 404 on its own JavaScript:

| Path prefix      | Origin variable           |
| ---------------- | ------------------------- |
| `/marketplace`   | `MARKETPLACE_ZONE_ORIGIN` |
| `/grocery`       | `GROCERY_ZONE_ORIGIN`     |
| `/restaurant`    | `RESTAURANT_ZONE_ORIGIN`  |
| `/pharmacy`      | `PHARMACY_ZONE_ORIGIN`    |
| `/doctor`        | `DOCTOR_ZONE_ORIGIN`      |
| `/hotel-booking` | `HOTEL_ZONE_ORIGIN`       |
| `/taxi`          | `TAXI_ZONE_ORIGIN`        |
| `/franchise`     | `FRANCHISE_ZONE_ORIGIN`   |

(Each variable's local default is the same port `services.yaml`/`services.md`
declares for that deployable — see [`services.md`](./services.md) rather than
treating this table as a second source of truth for them.) `/api/v1/:path*`
and `/api/:path*` are rewritten to the API gateway's own origin
(`API_GATEWAY_ORIGIN`, read the same way in `apps/web/next.config.mjs` — see
[`services.md`](./services.md) for its port) ahead of the zone rules. The hotel zone's own
`basePath` is `/hotel-booking`, not `/hotel` — the rewrite prefix and the
zone's own `next.config.mjs` agree on that name; `/hotel-owner` is a
shell route entirely, unrelated to the hotel zone.

## What lives in the two shared packages

Neither zone nor the shell may import another zone's source tree — ADR 0004
is explicit that shared code can only flow through `packages/`. The two
frontend packages' top-level `src/` folders, as they exist today:

**`packages/shared-core/src/`**: `a11y`, `api`, `config`, `contexts`, `data`,
`demo-data`, `hooks`, `i18n`, `localization`, `marketplace`, `messages`,
`modules`, `routes`, `seo`, `socket`, `types`, `utils`, plus top-level files
including `api-client.ts`, `api-endpoints.ts`, `api-fetch.ts`,
`auth-token.ts`, `error-boundary.tsx`, `grocery-api.ts`, `locale-utils.ts`,
`product-image.ts`, `region-headers.ts`, `sanitize-html.ts` and `utils.ts`.

**`packages/shared-ui/src/`**: `orders`, `profile`, `recommendations`, `seo`,
`shared`, `styles`, `ui-widgets`, plus top-level files `app-shell.tsx`,
`kartseek-loader.tsx`, `marketplace-product-thumb.tsx`, `ui.tsx` and
`zone-link.tsx`.

## Shared i18n

Every zone's `next.config.mjs` — and the shell's — wraps its config with
`createNextIntlPlugin('../../packages/shared-core/src/i18n/request.ts')`,
loading `request.ts` by its literal relative path rather than a tsconfig
alias, because the plugin resolves that path at config-load time, before any
alias is available. `request.ts` reads the region/language the edge proxy
already resolved (`x-country-code`, `x-detected-language` request headers, or
the `kartseek_country`/`kartseek_language` cookies as a fallback for requests
the proxy's matcher skips) and constrains the chosen locale to
`AVAILABLE_MESSAGE_LOCALES` — currently `en`, `ar`, `hi` — falling back to
`en` for anything without a message bundle, which is deliberately narrower
than the set of languages `packages/shared-core/src/localization/languages.ts`
may offer a market — most of the app's own strings go through a separate
`useTranslation` dictionary that covers more languages than this next-intl
surface does, and the two lists are expected to drift as markets are added.

## The linking rule

Two different helpers exist because a link either leaves the current zone or
it does not, and the wrong choice 404s silently rather than failing a build:

- **Crossing a zone boundary** (or going from a zone to the shell, or the
  shell to a zone) always uses `<ZoneLink>` from
  `packages/shared-ui/src/zone-link.tsx` — a plain `<a>` tag, deliberately
  exempt from `basePath` rewriting, because the destination is a separately
  built and deployed application and there is no client-side transition to
  preserve regardless.
- **Staying inside the same zone**, when the link is built from one of the
  shared route helpers (`productPath()`, `MARKETPLACE_ROUTES`, `DOCTOR_ROUTES`
  and the rest — which return the full public path as a visitor sees it in
  the address bar, correct for canonical URLs and the sitemap but wrong for
  `next/link`), passes the result through `zoneHref()` in
  `packages/shared-core/src/routes/zone-href.ts` before handing it to
  `next/link`. `zoneHref()` reads `NEXT_PUBLIC_ZONE_BASE_PATH` (declared
  alongside `basePath` in that zone's own `next.config`) and strips it, so
  `/marketplace/product/x` becomes `/product/x` inside the marketplace zone
  and passes through unchanged in the shell, where there is no basePath to
  strip. A path belonging to a _different_ zone is deliberately left
  untouched by `zoneHref()` — it must never reach `next/link` at all, since
  `basePath` would prepend the current zone's own prefix and mis-route it;
  the function's own comment states this is "NOT sufficient on its own" and
  the mistake is meant to stay visible rather than being half-corrected.

## `components/india/`: a country-specific implementation, not yet generalized

`apps/web/src/components/india/` (`pin-code-input.tsx`,
`state-district-selector.tsx`) and `apps/web/src/lib/india/` hold logic
specific to Indian addressing — a hardcoded India PIN code validator/lookup
and a static table of all 28 states and 8 union territories with their
districts. This exists ahead of and outside the localization registry the
rest of the platform uses for market-specific address/currency/language
behaviour (see the localization architecture note: "never hard-code a
language list or a postal code field"). Treat this directory as known,
scoped debt rather than a pattern to extend — a second market's address form
should not get its own `components/<country>/` sibling; it should go through
the registry these components predate.

## The three web areas that stayed in the shell

Per `git ls-files apps/web/src/app/<area> | grep -c page.tsx`, re-run today:

| Area          | Route (`page.tsx`) count |
| ------------- | ------------------------ |
| `admin`       | 250                      |
| `seller`      | 181                      |
| `hotel-owner` | 33                       |

These are the platform admin console, the seller portals for every vertical
(marketplace, grocery, restaurant, pharmacy, doctor, taxi vendor), and the
hotel owner console — none of which became a zone, for the reason ADR 0004
gives: they share the shell's authentication and approval-status flows.

## Related

- [ADR 0004 — One Next.js zone per vertical](../adr/0004-next-multi-zone-frontends.md)
- [`services.md`](./services.md) for the shell's and every zone's port,
  health path and dependencies
- [`security.md`](./security.md) for the CSP/CORS configuration that governs
  what the shell and each zone may call
