# Doctor zone

Searching and booking doctor appointments, tracking prescriptions and medical records, and managing family members and reviews.

Part of the [doctor vertical](../../README.md). An independently built Next.js application mounted by the shell at `/doctor`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/doctor-frontend
```

Open it through the shell at http://localhost:3000/doctor, not on its own port — links and assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/doctor-frontend
npm run type-check -w @kartseek/doctor-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3006 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/doctor`; open it through http://localhost:3000/doctor.
Image: `kartseek/doctor-frontend`. Workspace: `@kartseek/doctor-frontend`.

<!-- registry:end -->

## Layout

`search`, `profile/[slug]`, `hospital/[id]` and `clinic/[id]` cover discovery; `book/[doctorId]`, `my-appointments`, `review/[appointmentId]` and `family-members` cover the booking lifecycle; `prescriptions[/[id]]`, `medical-records`, `my-doctors`, `my-profile` and `wellness-rewards` round out the account area.
