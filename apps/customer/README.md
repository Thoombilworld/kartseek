# kartseek_customer

## What this is

The KARTSEEK Customer App — the end-customer mobile app covering every
vertical: marketplace, grocery, restaurant, pharmacy, doctor booking, hotel
booking, and taxi booking, plus the shared cart/checkout/orders/profile
flows around them. Package `kartseek_customer`, Android application id
`com.kartseek.customer`, version `1.1.0+3` (from `pubspec.yaml`). 203 routes
declared in `lib/routing/customer_router.dart` across 318 Dart files. Full
per-module screen counts and what is real versus mock today are in
[`../../docs/architecture/mobile.md`](../../docs/architecture/mobile.md) —
this README does not repeat them.

## Run

```bash
cd packages/shared-mobile && flutter pub get   # shared package first
cd ../../apps/customer && flutter pub get
flutter run
flutter run -d windows   # a windows/ runner exists in this app
```

Copy `.env.example` to `.env` and fill in a Google Maps API key before
running — required for the taxi and grocery map screens.

## Test

```bash
flutter analyze
flutter test
```

## Configuration

`.env.example` keys: `GOOGLE_MAPS_API_KEY`; `API_BASE_URL` and `WS_BASE_URL`
(read by `AppConstants` in `packages/shared-mobile`, falling back to the
gateway's local origin — see
[`../../docs/architecture/services.md`](../../docs/architecture/services.md) —
on a physical device that loopback address is the handset's own interface,
not this machine); `KEYSTORE_*`/`KEY_*` for release signing; optional
`FIREBASE_*` keys for push notifications.

`dependency_overrides` pins `objective_c` to the patched copy at
`packages/vendor/objective_c`, because the published version's native build
hook fails on a Windows path containing a space — see
[`../../packages/vendor/README.md`](../../packages/vendor/README.md) for the
full record and how to remove the override once upstream fixes it.

## Layout

```
lib/
├── main.dart
├── features/    # marketplace, grocery, restaurant, pharmacy, doctor,
│                # hotel_booking, taxi_booking, cart, checkout, orders,
│                # returns, wishlist, support, notifications, profile, home
└── routing/     # customer_router.dart
```

Infrastructure shared with the other two apps — the API client, region
detection, SSL pinning, WebSocket services, and the shared auth/marketplace/
taxi feature code — lives in `packages/shared-mobile`, the Dart package
`kartseek_shared_mobile`, referenced by path in `pubspec.yaml`.

**Mock-first caveat.** Marketplace is fixed (calls the real API by default);
pharmacy category/store browsing and the orders/returns screens are still
mock-first or unconditionally mock. See
[`../../docs/architecture/mobile.md`](../../docs/architecture/mobile.md#the-state-of-the-catalogues)
for the current, file-by-file state, and
[`../../docs/audits/2026-07-25-audit-report.md`](../../docs/audits/2026-07-25-audit-report.md)
for the point-in-time health score this app was previously measured against.
