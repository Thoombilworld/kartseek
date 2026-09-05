# kartseek_seller

## What this is

The KARTSEEK Seller App — one vendor portal covering all seven business
modules: marketplace, grocery, restaurant, pharmacy, doctor, hotel, and taxi
vendor. Package `kartseek_seller`, Android application id
`com.kartseek.seller`, version `1.0.0+1` (from `pubspec.yaml`). 115 routes
declared in `lib/routing/seller_router.dart` across 179 Dart files. Full
per-module screen counts and what is real versus mock today are in
[`../../docs/architecture/mobile.md`](../../docs/architecture/mobile.md) —
this README does not repeat them.

## Run

```bash
cd packages/shared-mobile && flutter pub get   # shared package first
cd ../../apps/seller && flutter pub get
flutter run
```

There is no `windows/` runner in this app (unlike `apps/customer` and
`apps/partner`); it does carry a `web/` target.

## Test

```bash
flutter analyze
flutter test
```

## Configuration

`.env.example` keys: `API_BASE_URL` and `WS_BASE_URL` (read by
`AppConstants` in `packages/shared-mobile`, falling back to the gateway's
local origin — see
[`../../docs/architecture/services.md`](../../docs/architecture/services.md) —
on a physical device that loopback address is the handset's own interface,
not this machine); `STUN_SERVER_URL`/`TURN_*` for the doctor module's
WebRTC video calls; `UPLOAD_ENDPOINT` for signed product-image and
prescription uploads; `KEYSTORE_*`/`KEY_*` for release signing; optional
`FIREBASE_*` keys for push notifications.

Unlike `apps/customer` and `apps/partner`, this app does **not** take the
`objective_c` override — it avoids the dependency instead by pinning
`path_provider_foundation` to `2.5.1`, the last version that does not pull
in `objective_c` (a newer, FFI-based implementation runs the same native
build hook that fails on a Windows path containing a space). See
[`../../packages/vendor/README.md`](../../packages/vendor/README.md) for the
full record of that problem and the override the other two apps take
instead.

## Layout

```
lib/
├── main.dart
├── features/    # seller_marketplace, seller_pharmacy, seller_restaurant,
│                # grocery, seller_hotel, seller_doctor, seller_grocery,
│                # seller_taxi_vendor, hotel_owner, shared
└── routing/     # seller_router.dart
```

Infrastructure shared with the other two apps — the API client, region
detection, SSL pinning, WebSocket services, and the shared auth/marketplace/
taxi feature code — lives in `packages/shared-mobile`, the Dart package
`kartseek_shared_mobile`, referenced by path in `pubspec.yaml`.

**Mock-first caveat.** The marketplace seller bloc is fixed (calls the real
API and only falls back to an error state on failure). The grocery, doctor,
pharmacy and restaurant seller sub-portals are not: each calls its real API
first but silently substitutes a fabricated dashboard/orders result on any
failure, at the same "loaded" status a caller cannot distinguish from a
genuine response. See
[`../../docs/architecture/mobile.md`](../../docs/architecture/mobile.md#the-state-of-the-catalogues)
for the current, file-by-file state, and
[`../../docs/audits/2026-07-25-audit-report.md`](../../docs/audits/2026-07-25-audit-report.md)
for the point-in-time health score this app was previously measured against.
