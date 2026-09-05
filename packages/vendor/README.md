# Vendored third-party packages

Packages copied into the repository because the published version cannot be
used as-is. Each one records what was changed and why, so it can be dropped the
day upstream fixes the problem.

## `objective_c/` — pub.dev `objective_c` 9.4.1, patched

`package:objective_c` is the Dart FFI support library that `ffigen`-based iOS
plugins (`path_provider_foundation`, `dart_webrtc`, …) depend on. Version
9.4.1 runs a native `build.dart` hook that fails on Windows when the path
contains a space — and this project is developed under `C:\Users\Hp EliteBook`.

This copy is the upstream source with the native build hook disabled. The
three Flutter workspaces that transitively need it pin it through
`dependency_overrides` in their `pubspec.yaml`:

- `apps/customer`
- `apps/partner`
- `packages/shared-mobile`

`apps/seller` avoids the dependency instead (see the comments in its
`pubspec.yaml`).

To remove the override: bump the affected plugins to versions whose
`objective_c` dependency builds on Windows paths with spaces, delete the
override lines, run `flutter pub get` in each workspace, and delete this
directory.
