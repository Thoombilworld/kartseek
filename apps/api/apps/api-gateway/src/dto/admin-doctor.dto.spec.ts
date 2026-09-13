import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  AdminDoctorAppointmentsQueryDto,
  AdminDoctorClinicsQueryDto,
  AdminDoctorListQueryDto,
  AdminDoctorPrescriptionsQueryDto,
  SuspendDoctorDto,
  UpdateDoctorSettingsDto,
  VerifyDoctorDto,
} from './admin-doctor.dto';

/**
 * The doctor admin DTOs, pinned against the two traps this pipe has already
 * sprung on another module.
 *
 * 1. `GatewayValidationPipe` runs with `enableImplicitConversion: true`, under
 *    which class-transformer coerces to the reflected `design:type` with
 *    `Boolean(value)` — so `Boolean('false')` is `true` and `@IsBoolean()` then
 *    passes, because by the time it looks the value really is a boolean. M3
 *    found `{"verified":"false"}` PASSING a drug licence that way. The same
 *    property name, on this module, VERIFIES a practitioner's medical
 *    registration — so it is measured here rather than assumed.
 *
 * 2. This module holds BOTH status conventions: `clinics.status` and
 *    `doctors.status` are lower-case enums, `appointments.status` and
 *    `doctor_prescriptions.status` are upper snake. A filter folded the wrong
 *    way matches nothing and reads on screen as "this market has none of those",
 *    which is indistinguishable from the truth.
 *
 * These tests exercise the real DTO classes through the pipe's own transform
 * options, so they fail if a decorator is ever reverted to `@Type(() =>
 * Boolean)` or to a `@Transform` that reads `value` instead of `obj`.
 */

/** The gateway pipe's transform options, verbatim (`gateway-validation.pipe.ts:21`). */
const PIPE = { enableImplicitConversion: true } as const;

function parse<T extends object>(cls: new () => T, plain: Record<string, unknown>) {
  const instance = plainToInstance(cls, plain, PIPE);
  const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance: instance as Record<string, any>, errors, rejected: errors.length > 0 };
}

describe('the verification decision means what the client sent', () => {
  it('reads {"verified":"false"} as a REFUSAL, not as a verification', () => {
    const { instance, rejected } = parse(VerifyDoctorDto, {
      verified: 'false',
      notes: 'registration could not be confirmed',
    });
    expect(instance.verified).toBe(false);
    expect(rejected).toBe(false);
  });

  it('reads {"verified":"true"} as a verification', () => {
    const { instance, rejected } = parse(VerifyDoctorDto, { verified: 'true' });
    expect(instance.verified).toBe(true);
    expect(rejected).toBe(false);
  });

  it('refuses {"verified":"maybe"} rather than resolving it to either answer', () => {
    expect(parse(VerifyDoctorDto, { verified: 'maybe' }).rejected).toBe(true);
  });

  it('refuses a decision that names no verdict at all', () => {
    expect(parse(VerifyDoctorDto, { notes: 'looks fine' }).rejected).toBe(true);
  });

  it('requires a note when REFUSING, and not when verifying', () => {
    expect(parse(VerifyDoctorDto, { verified: false }).rejected).toBe(true);
    expect(parse(VerifyDoctorDto, { verified: true }).rejected).toBe(false);
  });

  it('refuses a body carrying its own id — the path parameter is the target', () => {
    expect(parse(VerifyDoctorDto, { verified: true, id: 'someone-else' }).rejected).toBe(true);
  });
});

describe('a suspension carries its reason', () => {
  it('refuses an empty body', () => {
    expect(parse(SuspendDoctorDto, {}).rejected).toBe(true);
  });

  it('refuses a reason too short to review later', () => {
    expect(parse(SuspendDoctorDto, { reason: 'x' }).rejected).toBe(true);
  });

  it('accepts a real reason', () => {
    expect(parse(SuspendDoctorDto, { reason: 'Medical registration lapsed' }).rejected).toBe(false);
  });
});

describe('status filters are folded to the case the column actually holds', () => {
  it('folds a clinic status DOWN — clinics.status is a lower-case enum', () => {
    const { instance, rejected } = parse(AdminDoctorClinicsQueryDto, { status: 'Pending' });
    expect(instance.status).toBe('pending');
    expect(rejected).toBe(false);
  });

  it('folds a practitioner status down too', () => {
    expect(parse(AdminDoctorListQueryDto, { status: 'SUSPENDED' }).instance.status).toBe(
      'suspended',
    );
  });

  it('folds an appointment status UP, and turns a space into an underscore', () => {
    const { instance, rejected } = parse(AdminDoctorAppointmentsQueryDto, {
      status: 'in progress',
    });
    expect(instance.status).toBe('IN_PROGRESS');
    expect(rejected).toBe(false);
  });

  it('folds a prescription status up', () => {
    expect(parse(AdminDoctorPrescriptionsQueryDto, { status: 'dispensed' }).instance.status).toBe(
      'DISPENSED',
    );
  });

  it('refuses a status no column holds, rather than matching nothing silently', () => {
    expect(parse(AdminDoctorListQueryDto, { status: 'retired' }).rejected).toBe(true);
    expect(parse(AdminDoctorAppointmentsQueryDto, { status: 'ARRIVED' }).rejected).toBe(true);
  });
});

describe('page controls and the market', () => {
  it('caps the page size rather than clamping it silently', () => {
    expect(parse(AdminDoctorListQueryDto, { limit: '5000' }).rejected).toBe(true);
  });

  it('accepts a page size inside the cap', () => {
    const { instance, rejected } = parse(AdminDoctorListQueryDto, { page: '2', limit: '50' });
    expect(instance).toMatchObject({ page: 2, limit: 50 });
    expect(rejected).toBe(false);
  });

  it('refuses a market code that is not one', () => {
    expect(parse(AdminDoctorListQueryDto, { countryCode: 'Qatar' }).rejected).toBe(true);
  });

  it('accepts a sub-region such as IN-MH', () => {
    expect(parse(AdminDoctorListQueryDto, { countryCode: 'IN-MH' }).rejected).toBe(false);
  });

  it('refuses a full timestamp where the column is a DATE', () => {
    expect(parse(AdminDoctorAppointmentsQueryDto, { date: '2026-09-13T10:00:00Z' }).rejected).toBe(
      true,
    );
    expect(parse(AdminDoctorAppointmentsQueryDto, { date: '2026-09-13' }).rejected).toBe(false);
  });
});

describe("a market's configuration is bounded", () => {
  it('refuses a commission above 100 per cent', () => {
    expect(parse(UpdateDoctorSettingsDto, { commissionPercent: 150 }).rejected).toBe(true);
  });

  it('refuses a negative fee', () => {
    expect(parse(UpdateDoctorSettingsDto, { platformFeePercent: -5 }).rejected).toBe(true);
  });

  it('reads autoApproveClinics="false" as false', () => {
    const { instance, rejected } = parse(UpdateDoctorSettingsDto, { autoApproveClinics: 'false' });
    expect(instance.autoApproveClinics).toBe(false);
    expect(rejected).toBe(false);
  });

  it('refuses a property no screen declares, rather than dropping it silently', () => {
    expect(parse(UpdateDoctorSettingsDto, { commisionPercent: 10 }).rejected).toBe(true);
  });
});
