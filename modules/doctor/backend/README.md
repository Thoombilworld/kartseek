# Doctor service

Owns doctors, clinics, hospitals, specialties/departments and the appointment lifecycle built on them — booking, queueing, consultations, prescriptions, intake forms and reviews — serving patient booking and account flows, the `admin.doctor.*` directory-management patterns, and the `franchise_doctor_*` patterns the franchise portal reads through `franchise/franchise-view.service.ts`.

Part of the [doctor vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns.

## Run

```bash
npm run dev -w @kartseek/doctor-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated database instead of the platform one.

## Test

```bash
npm test -w @kartseek/doctor-backend
npm run type-check -w @kartseek/doctor-backend
```

No integration spec; `__tests__/doctor.service.spec.ts` and `__tests__/decorator-metadata.spec.ts` cover the service and its TypeORM decorator metadata at the unit level.

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3017 | `DOCTOR_SERVICE_PORT` |
| TCP (message patterns) | 4007 | `DOCTOR_TCP_PORT` |
<!-- prettier-ignore-end -->

Health: `/doctors/health` (live).
Database: `kartseek_doctor`, schema `doctor` (`DOCTOR_DB_*`).
Image: `kartseek/doctor-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

`franchise/` holds `franchise-view.service.ts`, the read-only slice the franchise portal's `franchise_doctor_*` patterns call into.
