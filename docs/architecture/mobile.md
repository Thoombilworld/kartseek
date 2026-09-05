# KARTSEEK mobile apps

This document is for anyone building, running or auditing one of the three
Flutter applications, or deciding what belongs in `packages/shared-mobile`
versus a single app. It replaces the old `MOBILE_APPS_README.md`, keeping
what verified against current source and correcting a tree that used to show
`apps/api` and `apps/web` nested under "mobile" (they are the platform's
backend and web frontend, not part of the mobile workspace).

## Architecture

Three independent Flutter applications share one Dart package for
infrastructure:

```text
apps/
├── customer/     ← Customer App (Android + iOS)
├── partner/      ← Partner App — Taxi Driver + Delivery (Android + iOS)
└── seller/       ← Seller App — vendor portal for every module (Android + iOS)

packages/
├── shared-mobile/  ← kartseek_shared_mobile — core infrastructure
└── vendor/
    └── objective_c/ ← vendored, patched pub.dev `objective_c` 9.4.1
```

`apps/api` (NestJS backend) and `apps/web` (Next.js web portal) are siblings
of these under the repo's own `apps/`, not part of the mobile workspace — see
[`services.md`](./services.md) for the backend and
[`frontend-zones.md`](./frontend-zones.md) for the web shell. There is no
`packages/native-bindings` directory in the current tree; if you are looking
for FFI plumbing, it now lives inside `packages/vendor/objective_c`.

### Customer App (`apps/customer`)

- **Package**: `kartseek_customer`
- **App ID** (Android `applicationId`; iOS has no tracked Xcode project to
  verify a bundle id independently, since `flutter create` did not check one
  in): `com.kartseek.customer`
- **Version**: `1.1.0+3`
- **Entry**: `lib/main.dart`; routes declared as `static const String` route
  constants in `lib/routing/customer_router.dart` — 203 routes today, not the
  "80+" the previous README stated.
- **Feature folders** (screen count under `screens/`, where present):
  `marketplace` (55), `pharmacy` (39), `restaurant` (35), `grocery` (31),
  `taxi_booking` (23), `hotel_booking` (17), `profile` (13), `doctor` (7),
  `home` (5), `checkout` (3), `orders` (2), `cart`, `returns`, `support`,
  `wishlist` (1 each), `notifications` (0 — its screens live directly under
  `home/screens/`). Hotel booking is a customer-facing module here even
  though the previous README's module list omitted it.
- 318 `.dart` files total.

### Partner App (`apps/partner`)

- **Package**: `kartseek_partner`
- **App ID**: `com.kartseek.partner`
- **Version**: `1.1.0+3`
- **Entry**: `lib/main.dart`; `lib/routing/partner_router.dart` declares 38
  routes.
- **Feature folders**: `deliveries` (22 screens), `rides` (9), `profile` (6),
  `auth` (4), `dashboard` (3), `earnings` (3), `settings` (2),
  `notifications`, `support` (1 each), plus `shared` (blocs, models,
  providers, services, theme, widgets — no screens of its own).
- 79 `.dart` files total.

### Seller App (`apps/seller`)

- **Package**: `kartseek_seller`
- **App ID**: `com.kartseek.seller`
- **Version**: `1.0.0+1`
- **Entry**: `lib/main.dart`; `lib/routing/seller_router.dart` declares 115
  routes (a different declaration style from the other two apps — using
  `static const` without explicit `String` typing, which is why counting them
  needs a different grep pattern).
- **Feature folders**: `seller_marketplace` (54 screens), `seller_pharmacy`
  (22), `seller_restaurant` (18), `grocery` (17), `seller_hotel` (7),
  `seller_doctor` (5), `seller_grocery` (5), `seller_taxi_vendor` (4),
  `shared` (6), `hotel_owner` (1). One portal covers all seven business
  modules (Marketplace, Grocery, Restaurant, Pharmacy, Doctor, Hotel, Taxi
  Vendor).
- 179 `.dart` files total.

### Shared mobile package (`packages/shared-mobile`)

- **Package name**: `kartseek_shared_mobile` (the directory is still
  `shared-mobile`; only the pub package name changed). All three apps depend
  on it by path (`path: ../../packages/shared-mobile`).
- **`lib/core/`**: `api`, `blocs`, `constants`, `providers`, `routing`,
  `security`, `services`, `theme`, `utils`, `widgets` — API client, app
  theme, region detection (GPS/IP), the SSL-pinning and device-security
  layer, and WebSocket services.
- **`lib/features/`**: `auth` (the shared login/signup/biometric flow),
  `marketplace`, `taxi` (blocs shared by both the booking and driving sides).
- 51 `.dart` files total.

### Vendored dependency (`packages/vendor/objective_c`)

See [`packages/vendor/README.md`](../../packages/vendor/README.md) for the
full record. In short: `package:objective_c` 9.4.1 — the Dart FFI support
library `ffigen`-based iOS plugins depend on — runs a native `build.dart`
hook that fails on Windows when the containing path has a space, which this
project's own path does. This directory is the upstream source with that
hook disabled, pinned via `dependency_overrides` in `apps/customer`,
`apps/partner` and `packages/shared-mobile`; `apps/seller` avoids the
dependency instead rather than taking the override.

## Requirements

| Tool        | Version             | Notes                       |
| ----------- | ------------------- | --------------------------- |
| Flutter     | 3.44.0+             | Stable channel              |
| Dart        | 3.12.0+             | Bundled with Flutter        |
| Android SDK | API 36 (compileSdk) | Android Studio or CLI tools |
| Kotlin      | 2.4.0               | Set in `settings.gradle`    |
| AGP         | 8.11.1              | Set in `settings.gradle`    |
| Xcode       | 16.0+               | For iOS builds (macOS only) |
| iOS Target  | 15.0+               | Set in Podfile              |

## Running each app

```bash
# Shared package first
cd packages/shared-mobile && flutter pub get

# Customer app
cd apps/customer && flutter pub get && flutter run

# Partner app
cd apps/partner && flutter pub get && flutter run

# Seller app
cd apps/seller && flutter pub get && flutter run
```

Copy `apps/customer/.env.example` to `.env` (and the same for `apps/partner`)
before running, and fill in a Google Maps API key — required for the taxi and
grocery map screens. Point the app at a non-local API with
`--dart-define=API_BASE_URL=...`; the `API_BASE_URL`/`WS_BASE_URL` dart-define
keys and their dev-only fallback are read by `AppConstants.apiBaseUrl`/
`wsBaseUrl` in `packages/shared-mobile/lib/core/constants.dart`, which falls
back to the gateway's local origin (see
[`docs/architecture/services.md`](./services.md)) — on a physical device that
loopback address is the handset's own interface, not this machine.

### Release builds

```bash
# Android — from apps/customer or apps/partner
flutter build apk --release --no-tree-shake-icons
flutter build appbundle --release

# iOS (macOS only)
cd ios && pod install && cd ..
flutter build ipa --release
```

Release signing needs `android/app/build.gradle` → `signingConfigs.release`
plus keystore values in `.env`; iOS needs Xcode 16+ and valid Apple Developer
signing certificates.

## The state of the catalogues

The picture here is uneven and has changed significantly since the last
sweep — some of what an older audit found has since been fixed outright,
some has been narrowed, and some is still exactly as described. Rather than
repeat a point-in-time finding, this section states what the current source
actually does, module by module, verified directly.

**Marketplace (customer) — fixed.** Every marketplace screen calls
`MarketplaceApiService`, which hits the real gateway by default.
`MarketplaceMockData` is still in the codebase, but every use of it in
`marketplace_api_service.dart` is gated behind an explicit `useMock` flag
that defaults to `AppConstants.useMockData` —
`bool.fromEnvironment('USE_MOCK', defaultValue: false)`. A real API failure
throws a `MarketplaceApiException`, it does not fall back to mock data.

**Marketplace (seller) — fixed.** `marketplace_seller_bloc.dart`'s product
load handler now awaits `_api.getProducts(...)` and only falls back to an
error state on failure; its own comment documents that it used to discard the
API result and emit mock products unconditionally, "outside the try."

**Partner ride/delivery streams — fixed.**
`RequestStreamService.startRideRequestStream()` subscribes to the real taxi
WebSocket and only synthesizes a ride after 60 seconds of silence, as an
explicit last-resort fallback. `startDeliveryTaskStream()` no longer runs a
random timer that invented deliveries at all — it now polls
`GET /marketplace/delivery-assignments`, a real, role-guarded endpoint; its
own comment explains this is deliberately a poll rather than a push
subscription, because no "job offered" dispatch event exists yet to listen
to.

**Social login — removed, not fixed.** `shared-mobile`'s `auth_bloc.dart` no
longer has `_onGoogleLogin`/`_onAppleLogin` handlers at all; they, their
events, and the buttons that dispatched them were deleted rather than
patched, because they used to authenticate with a hardcoded profile and a
literal `'jwt_google_token'` after a one-second delay with no credential
check. The bloc's comment records what a real implementation needs
(provider SDK → id_token → `/auth/social/{provider}` → gateway verifies
against the provider). There is currently no social login in any of the three
apps — biometric login, next to where the social handlers used to be, is
unaffected and does revalidate a stored session.

**SSL pinning — implemented correctly, conditional on build-time secrets.**
`ssl_pinning_service.dart` now builds its `HttpClient` with
`SecurityContext(withTrustedRoots: false)` when real fingerprints are
compiled in, which means every connection reaches the pin-comparison
callback rather than only connections the device's default trust store
already rejected (the previous, non-pinning shape). When no real fingerprint
is supplied at build time it falls back to ordinary system-root TLS and logs
a loud warning rather than silently pretending to pin.

**Still mock-first: Pharmacy (customer).** `pharmacy_bloc.dart` calls the
real API only in `_onLoadHome`, and even there it discards the successful
response's category/store data and substitutes `PharmacyMockData.homeData`
for `typedHomeData`, `categories` and `allStores` regardless of whether the
API call succeeded. Category browsing and store-detail lookups
(`_onSelectCategory`, `_onLoadPharmaciesByCategory`, `_onLoadStoreDetail`)
never call an API at all — they read `PharmacyMockData` directly.

**Still a fabricated fallback: seller sub-portals for grocery, doctor,
pharmacy and restaurant.** Unlike the seller marketplace bloc above, these
four blocs (`grocery_seller_bloc.dart`, `doctor_seller_bloc.dart`,
`pharmacy_seller_bloc.dart`, `restaurant_seller_bloc.dart`) call their real
API first and, on any failure, silently substitute a `_mockDashboard()` /
`_mockOrders()` / similar result at the same "loaded" status a caller cannot
distinguish from a genuine response — confirmed directly in
`restaurant_seller_bloc.dart`'s `_onLoadDashboard`. An outage in one of these
four services renders as a normal-looking, fictional seller dashboard rather
than an error.

**Customer orders and returns — unconditional mock, no service layer at
all.** `orders_bloc.dart` and `returns_bloc.dart` read from a hardcoded
`_mockOrders` / `_mockReturns` list directly; neither goes through an API
service the way marketplace, doctor, grocery, hotel or restaurant do.

No document under `docs/audits/` names the `MockData` class or these specific
files — the closest written record is
[`../audits/2026-07-25-audit-report.md`](../audits/2026-07-25-audit-report.md),
which scores the three Flutter apps' overall health (Customer 72, Seller 55,
Partner 45) and records the general "mock fallback" pattern this section
narrows down to specific, currently-verified files. Treat this section, not
that health score, as current.

## Related

- [`services.md`](./services.md) for the gateway and services these apps
  call.
- [`security.md`](./security.md) for the JWT/refresh model these apps'
  `AuthApiService` authenticates against.
