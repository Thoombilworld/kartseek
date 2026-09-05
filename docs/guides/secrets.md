# Secrets

This guide is for anyone adding, finding, or rotating a secret in KARTSEEK —
where credentials live on disk, how to add a new one without it ending up
tracked, how scanning for leaked secrets works, and the standing incident
record for the one secret that was actually committed and has to be treated as
compromised.

## Where secrets live

Real values live only in `.env` files, and `.env` files are never committed.
`.gitignore` covers this from a few directions at once, because a single rule
turned out not to be enough:

- `.env`, `.env.local`, `.env.*.local`, and the broader `.env.*` all match —
  the broad `.env.*` rule was added after `apps/api/.env.docker` (a file the
  narrower `.env` rule does not match) was found tracked.
- `!.env.example` and `!.env.*.example` re-include the example files, which
  hold **names and safe placeholder defaults only** — never a real credential.
  `apps/api/.env.example` and each module backend's own `.env.example` are
  what you copy from; see [`local-setup.md`](local-setup.md).
- TLS and signing material is git-ignored by extension regardless of
  directory: `*.key`, `*.pem`, `*.crt`, `*.cer`, `*.p12`, `*.pfx`, `*.jks`,
  `*.keystore`, and `key.properties` — added after a real private key
  (`infra/nginx/ssl/kartseek.key`) was found tracked.
- `local.properties` (Android's machine-local SDK path file) is also ignored.

If you are ever unsure whether a file you are about to add holds a secret,
check whether an existing `.gitignore` pattern already covers it before
assuming `git add` is safe.

## How to add a new secret

1. Add its name to the relevant `.env.example` (root, `apps/api/.env.example`,
   or the module backend's own) with a comment saying what it is and, where
   one makes sense, a safe placeholder — never a working value.
2. Add validation in the consuming service's environment schema — the
   gateway's is `apps/api/apps/api-gateway/src/config/env.validation.ts`
   (a Joi schema passed to `ConfigModule.forRoot({ validationSchema })`), or
   the equivalent in a module backend's own root module. This is what turns a
   missing or malformed secret into a clear boot-time failure instead of a
   confusing runtime one.
3. If the secret needs to reach a Kubernetes deployment, add it to the
   `ConfigMap` (non-sensitive config) or `Secret` (`kartseek-secrets`) in
   `infra/k8s/config.yaml` — never put a real credential in the `ConfigMap`,
   even in a private repository.

## Scanning

Automated secret scanning (`gitleaks/gitleaks-action`, blocking) is planned as
part of the `security` job in the CI workflow phase 4 of the platform
reorganization introduces — see section 8.1 of
[`docs/superpowers/specs/2026-09-05-platform-reorganization-design.md`](../superpowers/specs/2026-09-05-platform-reorganization-design.md).
That workflow has not landed yet, so today nothing scans commits
automatically — the `.gitignore` rules above are what stands between a working
copy and a leaked credential, and the incident below is what happens when they
are not enough.

## Incident: the Google Maps key (rotate it)

The key used to be hardcoded in five tracked files. It is now supplied per
machine and per build, and nothing in the repository contains it.

### Rotate the old key first

The key beginning `AIzaSyB29-Nj3z` (full value in commit `684e3a1`) was committed and must be
treated as compromised even though this repository has no remote and has never
been pushed. Removing it from the working tree does **not** remove it from git
history.

In the Google Cloud Console, for the project that owns it:

1. **APIs & Services → Credentials** — delete or regenerate that key.
2. Create a replacement, and restrict it before use:
   - _Application restrictions_: Android apps (package name + SHA-1) and iOS apps
     (bundle id). An unrestricted Maps key is billable by anyone who finds it.
   - _API restrictions_: only Maps SDK for Android/iOS, Geocoding, and Places —
     the three this codebase calls.
3. Check **Billing → Reports** for usage you do not recognise while the old key
   was exposed.

The old key stays in git history until the history is rewritten. With no remote
and a small repo that is still cheap to do, but rotating the key is what actually
removes the risk — do that regardless.

### Supplying the new key

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

### When the key is missing

Every surface defaults to empty rather than failing the build, so maps render
blank and geocoding returns no results instead of throwing. If autocomplete or
reverse geocoding silently returns nothing, check `--dart-define` first — that
is the usual cause, not the API.
