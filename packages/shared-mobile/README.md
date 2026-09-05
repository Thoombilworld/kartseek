# kartseek_shared_mobile

The Dart package shared by KARTSEEK's three Flutter apps. It holds the core
mobile infrastructure — the secure API client, SSL pinning, sockets,
geocoding and background-refresh services, routing, theming and reusable
widgets under `lib/core/` — plus the auth flow, a region-detection service
(`lib/core/services/region_service.dart`), and the marketplace and taxi
feature code shared across apps under `lib/features/`.

## `lib/` layout

- `lib/core/` — `api/`, `blocs/`, `constants/`, `providers/`, `routing/`,
  `security/` (the secure API client and SSL pinning), `services/` (region
  detection, sockets per vertical, geocoding, camera, background refresh,
  recommendations), `theme/`, `utils/`, `widgets/`.
- `lib/features/` — `auth/`, `marketplace/`, `taxi/`.

## How it is consumed

The directory stays `packages/shared-mobile` even though the package name is
`kartseek_shared_mobile` — Dart does not tie a path dependency's directory
name to its package name. `apps/customer`, `apps/partner` and `apps/seller`
each declare it as a path dependency in their own `pubspec.yaml`:

```yaml
kartseek_shared_mobile:
  path: ../../packages/shared-mobile
```

## `flutter analyze` baseline

`flutter analyze` on this package reports one pre-existing issue —
`deprecated_export_use` in
[`lib/core/security/secure_api_client.dart:70`](lib/core/security/secure_api_client.dart) —
and nothing else. Any new warning this package introduces is a regression;
that one is tracked, not fixed, because it originates in a dependency's own
deprecation rather than in this file.

## The `objective_c` override

`pubspec.yaml` pins `dependency_overrides.objective_c` to
`../../packages/vendor/objective_c`, a patched copy of the upstream package
that `ffigen`-based iOS plugins depend on transitively. See
[`packages/vendor/README.md`](../vendor/README.md) for what was patched, why,
and the three workspaces (including this one) that carry the override.
