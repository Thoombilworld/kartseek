# @kartseek/shared-core

Framework-agnostic TypeScript shared by the Next.js shell (`apps/web`) and
every module frontend zone under `modules/*/frontend`. It is where the API
client and its endpoint definitions live, the auth token helper, the i18n
loader and the localization registry, the route builders, the shared React
hooks and contexts, the SEO metadata helpers, the Socket.IO client wrapper,
`sanitize-html.ts`, the shared domain types, and demo/fixture data used by a
handful of pages.

## How it is consumed

`packages/shared-core` is not an npm workspace — it is not listed in the root
`package.json` `workspaces` array. Every consumer (`apps/web` and each
`modules/*/frontend`) reaches it through `tsconfig` `paths` entries that map
`@/lib/*` and similar aliases straight to files under `src/`, so imports
resolve at compile time with no build step of their own and no published
package. Turning `shared-core` and `shared-ui` into real workspaces is a known
follow-up, recorded as a follow-up in the spec rather than as an ADR yet — see
section 13 of
[the platform reorganization design](../../docs/superpowers/specs/2026-09-05-platform-reorganization-design.md).

## The localization rule

Currency symbols and formats, the list of supported languages, address field
layouts, and available payment methods all come from the registry in
[`src/localization`](src/localization). No zone, component, or module may
hard-code a currency symbol, a language list, or a country-specific address
field — add or change a market there, and every consumer picks it up through
`getCountry()`/`getLanguages()` and the rest of that module's exports.

## `src/` layout

| Folder         | Holds                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y`         | A small keyboard-activation helper shared by interactive components.                                                                                                                                                                  |
| `api`          | Typed fetch wrappers per domain — the admin console (core plus each of the seven verticals), franchise, seller, loyalty, brand-follow, and vendor-facing endpoints.                                                                   |
| `config`       | Cross-cutting settings: API base URL resolution (`api-base.ts`), module display titles, rental policies, social links.                                                                                                                |
| `contexts`     | React contexts shared by the shell and every zone: auth, cart, wishlist, region, seller, marketplace, toast and login-prompt UI state, audit logging.                                                                                 |
| `data`         | Static reference data — the franchise catalogue today.                                                                                                                                                                                |
| `demo-data`    | Sample catalogue and storefront data (marketplace, grocery, restaurant) used to render pages before or without a live backend for that surface.                                                                                       |
| `hooks`        | Shared React hooks: a Socket.IO hook per vertical, region filters, seller data/login/money, recommendations, async and background-refresh helpers.                                                                                    |
| `i18n`         | The translation loader and request-scoped locale resolution, wrapping the per-language string tables in `i18n/locales` (`ar`, `en`, `es`, `hi`, `ml`, `ta`, plus regional variants).                                                  |
| `localization` | The registry described above: countries, currencies, languages, address formats, payment methods, tax/legal/compliance text, corporate details.                                                                                       |
| `marketplace`  | Marketplace domain helpers: pricing, delivery, order status, product URLs, variant display.                                                                                                                                           |
| `messages`     | JSON UI-string catalogs (`ar`, `en`, `hi`).                                                                                                                                                                                           |
| `modules`      | Per-vertical API clients used by the franchise owner console and other cross-vertical screens, plus grocery categories, loyalty and profile data.                                                                                     |
| `routes`       | Path builders per vertical (`marketplace-routes.ts`, `doctor-routes.ts`, and the rest) and `zone-href.ts`, the same-zone link helper — see [`packages/shared-ui`](../shared-ui/README.md) for when to use it instead of `<ZoneLink>`. |
| `seo`          | Canonical/metadata builders, the AEO/GEO helpers, the city registry, and the analytics tags every zone's `generateMetadata` calls into.                                                                                               |
| `socket`       | The shared Socket.IO client wrapper.                                                                                                                                                                                                  |
| `types`        | Shared domain types per vertical: marketplace, grocery, pharmacy, restaurant (dine-in and takeaway), doctor, taxi, seller.                                                                                                            |
| `utils`        | Small domain utilities — Indian GST calculation today.                                                                                                                                                                                |

Top-level files not inside a folder — `api-client.ts`, `api-endpoints.ts`,
`api-fetch.ts`, `auth-token.ts`, `error-boundary.tsx`, `grocery-api.ts`,
`locale-utils.ts`, `product-image.ts`, `region-headers.ts`,
`sanitize-html.ts`, `utils.ts` — are each a single-purpose module used across
zones; read their own header comments for specifics.

## Related

[Frontend: shell, zones and shared packages](../../docs/architecture/frontend-zones.md)
covers the shell/zone split, shared i18n wiring, and the linking rule in full.
