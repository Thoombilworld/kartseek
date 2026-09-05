# Taxi zone

Ride search and trip tracking for riders, plus the driver-facing sign-up and dashboard under `drive/`.

Part of the [taxi vertical](../../README.md). An independently built Next.js application mounted by the shell at `/taxi`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/taxi-frontend
```

Open it through the shell at http://localhost:3000/taxi, not on its own port — links and assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/taxi-frontend
npm run type-check -w @kartseek/taxi-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3008 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/taxi`; open it through http://localhost:3000/taxi.
Image: `kartseek/taxi-frontend`. Workspace: `@kartseek/taxi-frontend`.

<!-- registry:end -->

## Layout

`search`, `rides`, `trip/[id]`, `intercity` and `rentals` cover rider booking and trip tracking; `login`, `register`, `forgot-password` and `profile` cover the rider account; `drive/login` and `drive/dashboard` are the separate driver-facing sign-up and dashboard.
