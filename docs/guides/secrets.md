# Google Maps API key

The key used to be hardcoded in five tracked files. It is now supplied per
machine and per build, and nothing in the repository contains it.

## Rotate the old key first

The key beginning `AIzaSyB29-Nj3z` (full value in commit `684e3a1`) was committed and must be
treated as compromised even though this repository has no remote and has never
been pushed. Removing it from the working tree does **not** remove it from git
history.

In the Google Cloud Console, for the project that owns it:

1. **APIs & Services → Credentials** — delete or regenerate that key.
2. Create a replacement, and restrict it before use:
   - *Application restrictions*: Android apps (package name + SHA-1) and iOS apps
     (bundle id). An unrestricted Maps key is billable by anyone who finds it.
   - *API restrictions*: only Maps SDK for Android/iOS, Geocoding, and Places —
     the three this codebase calls.
3. Check **Billing → Reports** for usage you do not recognise while the old key
   was exposed.

The old key stays in git history until the history is rewritten. With no remote
and a small repo that is still cheap to do, but rotating the key is what actually
removes the risk — do that regardless.

## Supplying the new key

Four surfaces read it. All four are gitignored or build-time only.

**Android** (`apps/customer`, `apps/partner`) — `android/local.properties`,
already gitignored:

```properties
maps.apiKey=YOUR_KEY_HERE
```

`app/build.gradle` feeds it to the manifest placeholder `${MAPS_API_KEY}`, and
falls back to a `MAPS_API_KEY` environment variable for CI.

**iOS** (`apps/customer`, `apps/partner`) — copy the example and fill it in:

```bash
cp apps/customer/ios/Flutter/Maps.xcconfig.example apps/customer/ios/Flutter/Maps.xcconfig
```

`Debug.xcconfig` and `Release.xcconfig` pull it in with `#include?`, so a
checkout without the file still builds. `Info.plist` reads `$(MAPS_API_KEY)`.

**Dart** (`packages/shared-mobile` geocoding/places calls) — a compile-time
define:

```bash
flutter run --dart-define=MAPS_API_KEY=YOUR_KEY_HERE
```

## When the key is missing

Every surface defaults to empty rather than failing the build, so maps render
blank and geocoding returns no results instead of throwing. If autocomplete or
reverse geocoding silently returns nothing, check `--dart-define` first — that
is the usual cause, not the API.
