# @kartseek/shared-ui

React components shared by the Next.js shell (`apps/web`) and every module
frontend zone under `modules/*/frontend`: the app shell providers, the
loading indicator, the one product-image frame every listing surface uses,
order and profile UI, cross-module recommendation carousels, SEO components,
a larger `shared/` folder of smaller building blocks (forms, banners, guards,
the header), a small widget set, and the shared Tailwind design system.

## `src/` layout

| Item                            | Holds                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app-shell.tsx`                 | The provider tree every application mounts once at the root — auth, audit, region, cart, wishlist, toast, login-prompt and i18n context, plus the global error boundary, navigation progress bar and consent banner.                                                                                               |
| `kartseek-loader.tsx`           | A compatibility re-export of `shared/kartseek-loader`; new code should import from `shared/` directly.                                                                                                                                                                                                             |
| `marketplace-product-thumb.tsx` | The one `ProductThumb` — every listing surface (home grid, offers, search, brand page, wishlist, the shared card) used to bring its own image well at a different height and padding; this component is the single fixed frame all of them now use, with the object-fit measured per image rather than hard-coded. |
| `orders/`                       | Order detail, order history and order tracking UI shared across verticals that sell physical goods.                                                                                                                                                                                                                |
| `profile/`                      | The per-module profile screen.                                                                                                                                                                                                                                                                                     |
| `recommendations/`              | Cross-module recommendation carousels.                                                                                                                                                                                                                                                                             |
| `seo/`                          | Breadcrumbs, an FAQ section, and JSON-LD structured data components.                                                                                                                                                                                                                                               |
| `shared/`                       | The bulk of the component set: account menu, address form, auth gate, the site header, currency display, locale switcher, payment method selector, consent banner, protected route, seller role guard, wallet/loyalty tiles, wishlist button, and more.                                                            |
| `ui-widgets/`                   | `ProgressBar` today.                                                                                                                                                                                                                                                                                               |
| `ui.tsx`                        | A compatibility re-export of `shared/ui`; new code should import from `shared/` directly.                                                                                                                                                                                                                          |
| `zone-link.tsx`                 | `<ZoneLink>` — see "The linking rule" below.                                                                                                                                                                                                                                                                       |
| `styles/`                       | `globals.css`, the design tokens (`design-tokens.css` / `.json`), and a couple of page-specific stylesheets.                                                                                                                                                                                                       |

## How it is consumed

Like `shared-core`, this package is reached through `tsconfig` `paths` from
the shell and every zone rather than as an npm workspace — see
[`packages/shared-core`](../shared-core/README.md) for the same note and the
follow-up recorded in the spec.

## Tailwind

`tailwind.config.ts` lives here, not in `apps/web`, because it _is_ the
design system every application shares. Its `content` globs reach back into
`shared-core`, `apps/web` and every `modules/*/frontend`, so a class used only
inside one zone's route is still seen by this config's Tailwind build —
without that, the class would never be scanned from here and would get purged
as unused, and the page would mount unstyled.

## The linking rule

- **Crossing a zone boundary** — including shell-to-zone or zone-to-shell —
  always uses `<ZoneLink>` from [`src/zone-link.tsx`](src/zone-link.tsx): a
  plain anchor, deliberately exempt from a zone's `basePath` rewriting, since
  the destination is a separately built and deployed application and there is
  no client-side transition to preserve anyway.
- **Staying inside the same zone**, when the link is built from one of the
  shared route helpers (`productPath()`, `MARKETPLACE_ROUTES`,
  `DOCTOR_ROUTES`, …), pass the result through `zoneHref()` in
  [`packages/shared-core/src/routes/zone-href.ts`](../shared-core/src/routes/zone-href.ts)
  before handing it to `next/link`. Those helpers return the full public path
  as a visitor sees it in the address bar — correct for canonical URLs and the
  sitemap, wrong for `next/link` inside the zone that owns the prefix —
  and `zoneHref()` strips that zone's own `basePath` back off.

The full rationale, including why a path into another zone must never pass
through `zoneHref()`, is in
[Frontend: shell, zones and shared packages](../../docs/architecture/frontend-zones.md).
