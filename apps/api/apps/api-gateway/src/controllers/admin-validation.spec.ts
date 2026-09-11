import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { of } from 'rxjs';
import type { BadRequestException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { getMetadataStorage } from 'class-validator';
import { getMetadataArgsStorage } from 'typeorm';
import { GatewayValidationPipe } from '../pipes/gateway-validation.pipe';
import { AdminAuditController } from './admin-audit.controller';
import { AdminCoreController } from './admin-core.controller';
import { AdminTaxiController } from './admin-taxi.controller';
import { AuditEntryDto } from '../dto/admin-audit.dto';
import { KycDecisionDto, ReasonDto as CoreReasonDto } from '../dto/admin-core.dto';
import {
  PayoutBatchDto,
  PricingUpdateDto,
  RateCardUpsertDto,
  ReasonDto as TaxiReasonDto,
  ResolutionDto,
  RouteCreateDto,
  SettingsUpdateDto,
  SurgeUpdateDto,
  TaxiConfigUpsertDto,
} from '../dto/admin-taxi.dto';
import { TaxiRateCardEntity } from '../../../../../../modules/taxi/backend/src/entities/taxi-rate-card.entity';
import { TaxiCountryConfigEntity } from '../../../../../../modules/taxi/backend/src/entities/taxi-country-config.entity';

/**
 * Every admin body is a validated DTO.
 *
 * Three things are asserted, and they fail for three different reasons:
 *
 *  1. the handler's body parameter really has a class type — an untyped
 *     `{ reason?: string }` literal reflects as `Object`, which the global pipe
 *     skips entirely, so the route accepts anything;
 *  2. the rules reject what they are supposed to reject, *through the real
 *     pipe* rather than through a bare `validate()` call, because whitelisting,
 *     `forbidNonWhitelisted` and implicit conversion only exist there; and
 *  3. no DTO names a property its table does not have, since taxi-service
 *     assigns the forwarded payload straight onto the row and TypeORM drops
 *     what it does not recognise — a setting that saves and never applies.
 */

const pipe = new GatewayValidationPipe();

const run = (metatype: unknown, value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: metatype as never, data: undefined });

/** The messages the pipe answered with, or a failure if it accepted the body. */
const rejectionOf = async (metatype: unknown, value: unknown): Promise<string[]> => {
  try {
    await run(metatype, value);
  } catch (err) {
    const body = (err as BadRequestException).getResponse() as { message?: unknown };
    return Array.isArray(body?.message) ? (body.message as string[]) : [String(body?.message)];
  }
  throw new Error('expected the pipe to reject this body, and it did not');
};

/** A DTO or entity class, referred to by its constructor. */
type ClassRef = abstract new (...args: never[]) => object;

/** The properties class-validator knows about, without instantiating the class. */
const declaredKeys = (target: ClassRef): string[] =>
  [
    ...new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(target as never, '', true, false)
        .map((m) => m.propertyName),
    ),
  ].sort();

/**
 * The columns a client may legitimately write.
 *
 * `mode` is filtered to `'regular'` deliberately: TypeORM's storage also holds
 * `@CreateDateColumn`/`@UpdateDateColumn`, so a DTO that declared `createdAt`
 * would otherwise pass the drift test below — and a body carrying server-managed
 * fields is exactly the failure the taxi settings screen hits when it PUTs a
 * fetched row straight back.
 */
const columnsOf = (target: ClassRef): Set<string> =>
  new Set(
    getMetadataArgsStorage()
      .columns.filter((c) => c.target === (target as unknown) && c.mode === 'regular')
      .map((c) => c.propertyName),
  );

/** A market-locked administrator, so `scope` and `market` are both defined. */
const adminReq = {
  user: { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true },
  method: 'PUT',
  originalUrl: '/x',
  headers: {},
};

/** A controller whose RPC client records what it was asked to forward. */
const taxiController = (): { ctrl: AdminTaxiController; forwarded: Record<string, unknown>[] } => {
  const forwarded: Record<string, unknown>[] = [];
  const client = {
    send: (_pattern: unknown, payload: Record<string, unknown>) => {
      forwarded.push(payload);
      return of({ ok: true });
    },
  };
  return { ctrl: new AdminTaxiController(client as never), forwarded };
};

/** The smallest rate card the DTO accepts. */
const RATE_CARD = {
  countryCode: 'QA',
  vehicleType: 'economy',
  baseFare: 5,
  distanceRate: 1.5,
  timeRate: 0.4,
  minimumFare: 8,
};

// ── 1. The handlers are typed ────────────────────────────────────────────────

/** Nest's `RouteParamtypes.BODY`; route-arg keys are `"<paramtype>:<index>"`. */
const BODY_PARAM = '3:';

/**
 * The reflected type of the handler's `@Body()` parameter — the metatype the
 * global pipe receives. `undefined` when the handler takes no body; `Object`
 * when the body is an inline literal type, which is the case the pipe skips.
 */
const bodyParamType = (ctor: ClassRef, method: string): unknown => {
  const args =
    (Reflect.getMetadata(ROUTE_ARGS_METADATA, ctor, method) as Record<string, { index: number }>) ??
    {};
  const key = Object.keys(args).find((k) => k.startsWith(BODY_PARAM));
  if (!key) return undefined;
  const types = Reflect.getMetadata('design:paramtypes', ctor.prototype, method) as unknown[];
  return types?.[args[key].index];
};

describe('admin handlers declare a DTO for their body', () => {
  const cases: [string, ClassRef, string, unknown][] = [
    ['admin-core banUser', AdminCoreController, 'banUser', CoreReasonDto],
    ['admin-core approveKyc', AdminCoreController, 'approveKyc', KycDecisionDto],
    ['admin-core rejectKyc', AdminCoreController, 'rejectKyc', KycDecisionDto],
    ['admin-audit record', AdminAuditController, 'record', AuditEntryDto],
    ['taxi suspendVendor', AdminTaxiController, 'suspendVendor', TaxiReasonDto],
    ['taxi suspendDriver', AdminTaxiController, 'suspendDriver', TaxiReasonDto],
    ['taxi blockDriver', AdminTaxiController, 'blockDriver', TaxiReasonDto],
    ['taxi rejectDocument', AdminTaxiController, 'rejectDocument', TaxiReasonDto],
    ['taxi resolveComplaint', AdminTaxiController, 'resolveComplaint', ResolutionDto],
    ['taxi updatePricing', AdminTaxiController, 'updatePricing', PricingUpdateDto],
    ['taxi updateSurge', AdminTaxiController, 'updateSurge', SurgeUpdateDto],
    ['taxi createRoute', AdminTaxiController, 'createRoute', RouteCreateDto],
    ['taxi updateSettings', AdminTaxiController, 'updateSettings', SettingsUpdateDto],
    ['taxi upsertRateCard', AdminTaxiController, 'upsertRateCard', RateCardUpsertDto],
    ['taxi upsertConfig', AdminTaxiController, 'upsertConfig', TaxiConfigUpsertDto],
    ['taxi processPayouts', AdminTaxiController, 'processPayouts', PayoutBatchDto],
  ];

  it.each(cases)('%s takes its declared DTO', (_name, ctor, method, dto) => {
    expect(bodyParamType(ctor, method)).toBe(dto);
  });

  it('leaves no admin-core or admin-taxi body reflecting as a bare Object', () => {
    const untyped = cases
      .filter(([, ctor, method]) => {
        const type = bodyParamType(ctor, method);
        return type === undefined || type === Object || type === Array;
      })
      .map(([name]) => name);
    expect(untyped).toEqual([]);
  });
});

// ── 2. The rules bite, through the real pipe ─────────────────────────────────

describe('admin taxi DTOs', () => {
  it('names a negative fare and an unknown field', async () => {
    const messages = await rejectionOf(RateCardUpsertDto, {
      countryCode: 'QA',
      vehicleType: 'economy',
      baseFare: -1,
      distanceRate: 1,
      timeRate: 1,
      minimumFare: 1,
      extra: true,
    });
    expect(messages).toContain('property extra should not exist');
    expect(messages.some((m) => m.startsWith('baseFare must not be less than 0'))).toBe(true);
  });

  it('requires the four core rates', async () => {
    const messages = await rejectionOf(RateCardUpsertDto, {
      countryCode: 'QA',
      vehicleType: 'economy',
    });
    for (const field of ['baseFare', 'distanceRate', 'timeRate', 'minimumFare']) {
      expect(
        messages.some((m) => m.includes(field)),
        `${field} unvalidated`,
      ).toBe(true);
    }
  });

  it('rejects a non-uuid payout id', async () => {
    const messages = await rejectionOf(PayoutBatchDto, { payoutIds: ['nope'] });
    expect(messages).toContain('each value in payoutIds must be a UUID');
  });

  it('rejects a commission sent as a percentage rather than a fraction', async () => {
    const messages = await rejectionOf(TaxiConfigUpsertDto, { platformCommissionRate: 15 });
    expect(messages).toContain('platformCommissionRate must not be greater than 1');
  });

  it('rejects a currency symbol where an ISO code belongs', async () => {
    const messages = await rejectionOf(TaxiConfigUpsertDto, { currency: '₹' });
    expect(messages).toContain('currency must be a three-letter ISO 4217 code');
  });

  it('rejects a peak-hour band with an out-of-range hour', async () => {
    const messages = await rejectionOf(TaxiConfigUpsertDto, {
      peakHourConfig: [{ start: 7, end: 26, multiplier: 1.15, label: 'Morning Rush' }],
    });
    expect(messages.some((m) => m.includes('end must not be greater than 23'))).toBe(true);
  });

  it('requires a reason of real length on a suspension', async () => {
    const messages = await rejectionOf(TaxiReasonDto, {});
    expect(messages).toContain('reason must be longer than or equal to 3 characters');
  });

  it('requires a resolution on a complaint', async () => {
    const messages = await rejectionOf(ResolutionDto, { resolution: 'x' });
    expect(messages).toContain('resolution must be longer than or equal to 3 characters');
  });

  /**
   * The whole point of `@Type()` on the nested properties. Implicit conversion
   * rebuilds nested values from the reflected `design:type`; without it the
   * jsonb columns arrive at taxi-service as empty arrays and the console's save
   * silently erases the country's payment gateways and peak hours.
   */
  it("keeps the settings screen's arrays and nested objects intact", async () => {
    const payload = {
      countryCode: 'QA',
      currency: 'QAR',
      distanceUnit: 'km',
      otpRequired: true,
      scheduledRidesEnabled: true,
      cashEnabled: true,
      tipsEnabled: true,
      maxStops: 3,
      rideShareEnabled: false,
      vendorsEnabled: true,
      enabledPaymentGateways: ['cash', 'card', 'wallet'],
      enabledVehicleTypes: ['economy', 'comfort', 'premium', 'bike'],
      requiredVendorDocuments: ['business_license', 'tax_certificate'],
      requiredDriverDocuments: ['driving_license', 'vehicle_registration'],
      platformCommissionRate: 0.15,
      defaultVendorCommissionRate: 0.05,
      taxRate: 0,
      surgeLimits: { minMultiplier: 1, maxMultiplier: 3, autoEnabled: true },
      peakHourConfig: [
        { start: 7, end: 9, multiplier: 1.15, label: 'Morning Rush' },
        { start: 17, end: 20, multiplier: 1.2, label: 'Evening Rush' },
      ],
      emergencyNumber: '999',
      freeWaitingMinutes: 5,
      autoCancelTimeoutSeconds: 120,
      minimumDriverRating: 3,
    };
    const out = (await run(TaxiConfigUpsertDto, payload)) as TaxiConfigUpsertDto;
    expect(out.enabledPaymentGateways).toEqual(['cash', 'card', 'wallet']);
    expect(out.requiredDriverDocuments).toEqual(['driving_license', 'vehicle_registration']);
    expect(out.surgeLimits).toMatchObject({
      minMultiplier: 1,
      maxMultiplier: 3,
      autoEnabled: true,
    });
    expect(out.peakHourConfig).toHaveLength(2);
    expect(out.peakHourConfig?.[0]).toMatchObject({ start: 7, end: 9, label: 'Morning Rush' });

    // `plainToInstance` materialises the properties the screen did *not* send,
    // as own keys holding `undefined` — here `defaultLocale` and `timezone`.
    expect(Object.keys(out)).toContain('timezone');
    expect(out.timezone).toBeUndefined();

    // Which is why the controller forwards only what was sent. Spreading the
    // instance itself would hand taxi-service `Object.assign(row, { timezone:
    // undefined })` and blank two columns on every settings save.
    const { ctrl, forwarded } = taxiController();
    await ctrl.upsertConfig(adminReq, 'QA', out);
    const payloadSent = forwarded[0] ?? {};
    expect(Object.entries(payloadSent).filter(([, v]) => v === undefined)).toEqual([]);
    expect(payloadSent).toMatchObject({ countryCode: 'QA', currency: 'QAR' });
    expect(payloadSent.enabledPaymentGateways).toEqual(['cash', 'card', 'wallet']);
  });

  it('accepts a complete rate card', async () => {
    const out = (await run(RateCardUpsertDto, {
      countryCode: 'QA',
      vehicleType: 'economy',
      displayName: 'Economy',
      baseFare: 5,
      distanceRate: 1.5,
      timeRate: 0.4,
      minimumFare: 8,
      waitingRate: 0.3,
      cancellationFee: 5,
      isActive: true,
    })) as RateCardUpsertDto;
    expect(out.baseFare).toBe(5);
    expect(out).toBeInstanceOf(RateCardUpsertDto);
  });
});

describe('admin core DTOs', () => {
  it('refuses a ban with no reason', async () => {
    const messages = await rejectionOf(CoreReasonDto, {});
    expect(messages).toContain('reason must be longer than or equal to 3 characters');
  });

  it('refuses an actor id supplied by the caller', async () => {
    const messages = await rejectionOf(CoreReasonDto, {
      reason: 'Repeated fraudulent orders',
      adminId: 'someone-else',
    });
    expect(messages).toContain('property adminId should not exist');
  });

  it('accepts the verticals the KYC queue actually carries', async () => {
    for (const entityType of ['seller', 'pharmacy', 'restaurant', 'taxi', 'driver']) {
      const out = (await run(KycDecisionDto, { entityType })) as KycDecisionDto;
      expect(out.entityType).toBe(entityType);
    }
  });

  it('refuses an entity type that would break the redis key', async () => {
    const messages = await rejectionOf(KycDecisionDto, { entityType: 'seller:*' });
    expect(messages).toContain('entityType must be a lower-case slug of 2-31 characters');
  });
});

describe('audit entry DTO', () => {
  it('requires an action and caps it', async () => {
    expect(await rejectionOf(AuditEntryDto, {})).toContain('action should not be empty');
    expect(await rejectionOf(AuditEntryDto, { action: 'a'.repeat(81) })).toContain(
      'action must be shorter than or equal to 80 characters',
    );
  });

  it('leaves the record it points at optional', async () => {
    const out = (await run(AuditEntryDto, { action: 'seller.approved' })) as AuditEntryDto;
    expect(out.action).toBe('seller.approved');
    expect(out.entityType).toBeUndefined();
    expect(out.entityId).toBeUndefined();
  });

  it('refuses details that are not an object, and an actor named by the caller', async () => {
    expect(
      await rejectionOf(AuditEntryDto, { action: 'seller.approved', details: 'nope' }),
    ).toContain('details must be an object');
    expect(
      await rejectionOf(AuditEntryDto, { action: 'seller.approved', actorId: 'someone-else' }),
    ).toContain('property actorId should not exist');
  });
});

// ── 3. No DTO drifts away from its table ─────────────────────────────────────

describe('taxi DTOs name only real columns', () => {
  it('rate card upsert', () => {
    const columns = columnsOf(TaxiRateCardEntity);
    for (const key of declaredKeys(RateCardUpsertDto)) {
      expect(columns.has(key), `taxi_rate_cards has no column ${key}`).toBe(true);
    }
    expect(declaredKeys(RateCardUpsertDto).length).toBeGreaterThan(5);
  });

  it('pricing update, which inherits it', () => {
    const columns = columnsOf(TaxiRateCardEntity);
    for (const key of declaredKeys(PricingUpdateDto)) {
      expect(columns.has(key), `taxi_rate_cards has no column ${key}`).toBe(true);
    }
  });

  it('country configuration upsert', () => {
    const columns = columnsOf(TaxiCountryConfigEntity);
    for (const key of declaredKeys(TaxiConfigUpsertDto)) {
      expect(columns.has(key), `taxi_country_configs has no column ${key}`).toBe(true);
    }
    expect(declaredKeys(TaxiConfigUpsertDto).length).toBeGreaterThan(15);
  });

  /**
   * Server-managed fields stay out of both DTOs. A client cannot re-key a rate
   * card onto another row, and a screen that PUTs a fetched entity back gets a
   * 400 naming the offending field rather than writing a timestamp of its own.
   */
  it('declares no server-managed field', () => {
    for (const dto of [RateCardUpsertDto, PricingUpdateDto, TaxiConfigUpsertDto]) {
      for (const managed of ['id', 'createdAt', 'updatedAt']) {
        expect(declaredKeys(dto), `${dto.name} declares ${managed}`).not.toContain(managed);
      }
    }
  });

  it('refuses the fields a fetched row carries', async () => {
    const messages = await rejectionOf(TaxiConfigUpsertDto, {
      currency: 'QAR',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });
    expect(messages).toContain('property createdAt should not exist');
    expect(messages).toContain('property updatedAt should not exist');
  });
});

// ── 4. null is a value, not an absence ───────────────────────────────────────

describe('an explicit null', () => {
  it('is refused on a NOT NULL column', async () => {
    expect(await rejectionOf(TaxiConfigUpsertDto, { currency: null })).toContain(
      'currency must be a three-letter ISO 4217 code',
    );
    expect(await rejectionOf(TaxiConfigUpsertDto, { maxStops: null })).toContain(
      'maxStops must be an integer number',
    );
    expect(await rejectionOf(RateCardUpsertDto, { ...RATE_CARD, isActive: null })).toContain(
      'isActive must be a boolean value',
    );
  });

  it('is allowed on the one nullable column, and survives to the payload', async () => {
    const out = (await run(TaxiConfigUpsertDto, {
      currency: 'QAR',
      timezone: null,
    })) as TaxiConfigUpsertDto;
    expect(out.timezone).toBeNull();

    const { ctrl, forwarded } = taxiController();
    await ctrl.upsertConfig(adminReq, 'QA', out);
    expect(forwarded[0]).toMatchObject({ currency: 'QAR', timezone: null });
  });
});

// ── 5. sent() forwards what was sent, and only that ──────────────────────────

describe('AdminTaxiController.sent()', () => {
  it('keeps null, drops undefined, and passes nested values through untouched', () => {
    const { ctrl } = taxiController();
    const nested = { minMultiplier: 1, maxMultiplier: 3, autoEnabled: true };
    const list = [{ start: 7, end: 9, multiplier: 1.15, label: 'Morning Rush' }];
    const out = (ctrl as unknown as { sent: (d: object) => Record<string, unknown> }).sent({
      timezone: null,
      currency: 'QAR',
      distanceUnit: undefined,
      surgeLimits: nested,
      peakHourConfig: list,
    });
    expect(out).toEqual({
      timezone: null,
      currency: 'QAR',
      surgeLimits: nested,
      peakHourConfig: list,
    });
    expect(Object.keys(out)).not.toContain('distanceUnit');
    // Untouched, not merely equal: the same objects travel on to the RPC call.
    expect(out.surgeLimits).toBe(nested);
    expect(out.peakHourConfig).toBe(list);
  });

  /**
   * All six handlers that spread the body, not just `upsertConfig`. Each body is
   * a minimal-but-valid payload driven through the real pipe, so every optional
   * property the caller omitted is present as an own key holding `undefined` by
   * the time the handler sees it.
   */
  const spreadSites: [string, ClassRef, object, (c: AdminTaxiController, d: never) => unknown][] = [
    ['updatePricing', PricingUpdateDto, RATE_CARD, (c, d) => c.updatePricing(adminReq, d)],
    [
      'updateSurge',
      SurgeUpdateDto,
      { zoneId: 'zone-doha-west', multiplier: 1.8 },
      (c, d) => c.updateSurge(adminReq, d),
    ],
    [
      'createRoute',
      RouteCreateDto,
      {
        name: 'Doha - Al Khor',
        countryCode: 'QA',
        origin: 'Hamad Airport',
        destination: 'Al Khor',
        fixedFare: 120,
      },
      (c, d) => c.createRoute(adminReq, d),
    ],
    [
      'updateSettings',
      SettingsUpdateDto,
      { dispatchMode: 'auto' },
      (c, d) => c.updateSettings(adminReq, d),
    ],
    ['upsertRateCard', RateCardUpsertDto, RATE_CARD, (c, d) => c.upsertRateCard(adminReq, d)],
    [
      'upsertConfig',
      TaxiConfigUpsertDto,
      { currency: 'QAR' },
      (c, d) => c.upsertConfig(adminReq, 'QA', d),
    ],
  ];

  it.each(spreadSites)('%s forwards no undefined key', async (_name, dto, body, invoke) => {
    const validated = await run(dto, body);
    const { ctrl, forwarded } = taxiController();
    await invoke(ctrl, validated as never);
    const payload = forwarded[0] ?? {};
    expect(Object.entries(payload).filter(([, v]) => v === undefined)).toEqual([]);
    // …and still carries everything the caller did send.
    expect(payload).toMatchObject(body);
  });
});
