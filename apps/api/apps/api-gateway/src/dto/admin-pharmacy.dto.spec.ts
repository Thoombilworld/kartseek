import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToInstance, Type } from 'class-transformer';
import { IsBoolean, validateSync } from 'class-validator';
import {
  AdminPharmacyProductsQueryDto,
  AdminPharmacyStoresQueryDto,
  UpdatePharmacySettingsDto,
  VerifyLicenceDto,
} from './admin-pharmacy.dto';

/**
 * The booleans on the pharmacy admin DTOs, pinned against the coercion that
 * inverted two of them.
 *
 * `GatewayValidationPipe` runs with `enableImplicitConversion: true`, and under
 * it class-transformer coerces to the reflected `design:type` with
 * `Boolean(value)` — so `Boolean('false')` is `true` and `@IsBoolean()` then
 * passes, because by the time it looks the value really is a boolean. Two
 * properties shipped with that: `?available=false` listed the products that ARE
 * available, and `{"verified":"false"}` PASSED a drug licence.
 *
 * These tests exercise the real DTO classes through the pipe's own transform
 * options, so they fail if the decorator is ever reverted to `@Type(() =>
 * Boolean)` or to a `@Transform` that reads `value` instead of `obj`.
 */

/** The gateway pipe's transform options, verbatim (`gateway-validation.pipe.ts:21`). */
const PIPE = { enableImplicitConversion: true } as const;

function parse<T extends object>(cls: new () => T, plain: Record<string, unknown>) {
  const instance = plainToInstance(cls, plain, PIPE);
  const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance: instance as Record<string, any>, errors, rejected: errors.length > 0 };
}

describe('a boolean query parameter means what the client sent', () => {
  it('reads ?available=false as false, not as true', () => {
    const { instance, rejected } = parse(AdminPharmacyProductsQueryDto, { available: 'false' });
    expect(instance.available).toBe(false);
    expect(rejected).toBe(false);
  });

  it('reads ?available=true as true', () => {
    const { instance, rejected } = parse(AdminPharmacyProductsQueryDto, { available: 'true' });
    expect(instance.available).toBe(true);
    expect(rejected).toBe(false);
  });

  it('refuses ?available=maybe rather than resolving it to either answer', () => {
    const { rejected } = parse(AdminPharmacyProductsQueryDto, { available: 'maybe' });
    expect(rejected).toBe(true);
  });

  it('leaves the filter absent when the parameter is omitted', () => {
    const { instance, rejected } = parse(AdminPharmacyProductsQueryDto, {});
    expect(instance.available).toBeUndefined();
    expect(rejected).toBe(false);
  });

  it('accepts 1 and 0, which is how several consoles spell a checkbox', () => {
    expect(parse(AdminPharmacyProductsQueryDto, { available: '1' }).instance.available).toBe(true);
    expect(parse(AdminPharmacyProductsQueryDto, { available: '0' }).instance.available).toBe(false);
  });
});

describe('a boolean on a DECISION body means what the client sent', () => {
  /**
   * The one that matters most: this route passes or fails a drug licence.
   * `{"verified":"false"}` used to reach the handler as `true`.
   */
  it('reads verified:"false" as false — a string must not pass a licence', () => {
    const { instance, rejected } = parse(VerifyLicenceDto, { verified: 'false' });
    expect(instance.verified).toBe(false);
    expect(rejected).toBe(false);
  });

  it('reads a real false as false', () => {
    expect(parse(VerifyLicenceDto, { verified: false }).instance.verified).toBe(false);
  });

  it('refuses verified:"no" rather than reading it as a pass', () => {
    expect(parse(VerifyLicenceDto, { verified: 'no' }).rejected).toBe(true);
  });

  it('requires the field at all', () => {
    expect(parse(VerifyLicenceDto, {}).rejected).toBe(true);
  });
});

describe('the settings booleans are not inverted either', () => {
  it.each(['requirePrescriptionForScheduleH', 'allowColdChainDelivery', 'autoApproveStores'])(
    'reads %s:"false" as false',
    (key) => {
      const { instance, rejected } = parse(UpdatePharmacySettingsDto, { [key]: 'false' });
      expect(instance[key]).toBe(false);
      expect(rejected).toBe(false);
    },
  );

  it('refuses an unknown setting key', () => {
    expect(parse(UpdatePharmacySettingsDto, { nonesuch: 1 }).rejected).toBe(true);
  });
});

/**
 * The guard on the guard.
 *
 * If a future edit "simplifies" one of these back to `@Type(() => Boolean)`,
 * the tests above fail — but only while this remains true of the library. This
 * pins the platform behaviour the fix is a response to, so that if
 * class-transformer ever changes it, the reason for `BooleanParam` is visibly
 * spent rather than quietly obsolete.
 */
describe('why BooleanParam exists', () => {
  class Naive {
    @Type(() => Boolean)
    @IsBoolean()
    flag?: boolean;
  }

  it('shows that @Type(() => Boolean) still turns the string "false" into true', () => {
    const instance = plainToInstance(Naive, { flag: 'false' }, PIPE) as Record<string, any>;
    expect(instance.flag).toBe(true);
    expect(validateSync(instance as object)).toHaveLength(0);
  });
});

describe('the status filters fold what a human clicked onto the stored value', () => {
  it('upper-snakes "Pending KYC" to PENDING_KYC', () => {
    const { instance, rejected } = parse(AdminPharmacyStoresQueryDto, { status: 'Pending KYC' });
    expect(instance.status).toBe('PENDING_KYC');
    expect(rejected).toBe(false);
  });

  it('refuses a status this module does not have, naming the set', () => {
    expect(parse(AdminPharmacyStoresQueryDto, { status: 'nonesuch' }).rejected).toBe(true);
  });

  it('caps limit rather than silently clamping an export to 100', () => {
    expect(parse(AdminPharmacyStoresQueryDto, { limit: '5000' }).rejected).toBe(true);
  });

  it('refuses a market code this platform cannot read', () => {
    expect(parse(AdminPharmacyStoresQueryDto, { countryCode: 'ZZZZZZ' }).rejected).toBe(true);
  });
});
