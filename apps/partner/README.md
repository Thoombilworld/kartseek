# kartseek_partner

## What this is

The KARTSEEK Partner App — a single app for both taxi drivers and delivery
partners, covering ride and delivery request handling, earnings, and
partner-side profile/settings. Package `kartseek_partner`, Android
application id `com.kartseek.partner`, version `1.1.0+3` (from
`pubspec.yaml`). 38 routes declared in `lib/routing/partner_router.dart`
across 79 Dart files. Full per-module screen counts and what is real versus
mock today are in
[`../../docs/architecture/mobile.md`](../../docs/architecture/mobile.md) —
this README does not repeat them.

## Run

```bash
cd packages/shared-mobile && flutter pub get   # shared package first
cd ../../apps/partner && flutter pub get
flutter run
flutter run -d windows   # a windows/ runner exists in this app
```

Copy `.env.example` to `.env` and fill in a Google Maps API key before
running — required for ride navigation and delivery-tracking maps.

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
├── features/    # deliveries, rides, profile, auth, dashboard, earnings,
│                # settings, notifications, support, shared
└── routing/     # partner_router.dart
```

Infrastructure shared with the other two apps — the API client, region
detection, SSL pinning, WebSocket services, and the shared auth/marketplace/
taxi feature code — lives in `packages/shared-mobile`, the Dart package
`kartseek_shared_mobile`, referenced by path in `pubspec.yaml`.

**Mock-first caveat.** The ride and delivery request streams are fixed: both
now subscribe to the real taxi WebSocket / poll a real, role-guarded
endpoint, and only synthesize data as an explicit last resort. See
[`../../docs/architecture/mobile.md`](../../docs/architecture/mobile.md#the-state-of-the-catalogues)
for the current, file-by-file state, and
[`../../docs/audits/2026-07-25-audit-report.md`](../../docs/audits/2026-07-25-audit-report.md)
for the point-in-time health score this app was previously measured against.
