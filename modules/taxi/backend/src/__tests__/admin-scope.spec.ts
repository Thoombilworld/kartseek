import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { DriverOnboardingService } from '../services/driver-onboarding.service';
import { TaxiPayoutService } from '../services/taxi-payout.service';

describe('DriverOnboardingService.getDrivers scopes by country', () => {
  function service() {
    const where: string[] = [];
    const qb: any = {
      leftJoinAndSelect: () => qb,
      andWhere: (w: string) => (where.push(w), qb),
      skip: () => qb,
      take: () => qb,
      orderBy: () => qb,
      getManyAndCount: async () => [[], 0],
    };
    const driverRepo = { createQueryBuilder: () => qb, findOne: vi.fn(), save: vi.fn() };
    const documentRepo = { findOne: vi.fn(), save: vi.fn(), createQueryBuilder: vi.fn() };
    const svc = Object.create(DriverOnboardingService.prototype) as DriverOnboardingService;
    Object.assign(svc, {
      driverRepo,
      documentRepo,
      configRepo: {},
      kafka: { publish: vi.fn(async () => undefined) },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, where };
  }

  it('adds the country predicate when a country is given', async () => {
    const { svc, where } = service();
    await svc.getDrivers({ countryCode: 'QA' });
    expect(where).toContain('d.countryCode = :cc');
  });
});

describe('DriverOnboardingService driver enforcement respects the caller market', () => {
  function service(driverCountry: string) {
    const driver = {
      id: 'drv-in',
      countryCode: driverCountry,
      fullName: 'A Driver',
      status: 'active',
    };
    const driverRepo = {
      findOne: vi.fn(async () => driver),
      save: vi.fn(async (d: any) => d),
      manager: { getRepository: vi.fn() },
    };
    const documentRepo = { findOne: vi.fn(), save: vi.fn() };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(DriverOnboardingService.prototype) as DriverOnboardingService;
    Object.assign(svc, {
      driverRepo,
      documentRepo,
      configRepo: {},
      kafka,
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, driverRepo, kafka };
  }

  it('refuses to suspend a driver from another market and writes nothing', async () => {
    const { svc, driverRepo, kafka } = service('IN');
    await expect(svc.suspendDriver('drv-in', 'docs', 'QA')).rejects.toThrow(ForbiddenException);
    expect(driverRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('lets a global admin (no scope) suspend a driver in any market', async () => {
    const { svc, driverRepo } = service('IN');
    await expect(svc.suspendDriver('drv-in', 'docs')).resolves.toMatchObject({
      status: 'suspended',
    });
    expect(driverRepo.save).toHaveBeenCalled();
  });
});

describe('DriverOnboardingService.reviewDocument resolves the market through the owner', () => {
  function service(driverCountry: string) {
    const doc = { id: 'doc-1', ownerType: 'driver', ownerId: 'drv-1', status: 'pending' };
    const documentRepo = {
      findOne: vi.fn(async () => doc),
      save: vi.fn(async (d: any) => d),
    };
    const driverRepo = {
      findOne: vi.fn(async () => ({ id: 'drv-1', countryCode: driverCountry })),
      manager: { getRepository: vi.fn() },
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(DriverOnboardingService.prototype) as DriverOnboardingService;
    Object.assign(svc, {
      driverRepo,
      documentRepo,
      configRepo: {},
      kafka,
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, documentRepo, driverRepo, kafka };
  }

  it('refuses to review a document whose driver is in another market, before any write', async () => {
    const { svc, documentRepo, driverRepo, kafka } = service('IN');
    await expect(
      svc.reviewDocument('doc-1', 'admin-qa', 'approved', undefined, 'QA'),
    ).rejects.toThrow(ForbiddenException);
    expect(documentRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
    // The owner is resolved through the driver repository, not a bare id
    // comparison — this is what makes the polymorphic document reviewable at
    // all.
    expect(driverRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'drv-1' },
      select: ['id', 'countryCode'],
    });
  });

  it('approves a document whose driver is in the caller market', async () => {
    const { svc, documentRepo } = service('QA');
    await expect(
      svc.reviewDocument('doc-1', 'admin-qa', 'approved', undefined, 'QA'),
    ).resolves.toMatchObject({ status: 'approved' });
    expect(documentRepo.save).toHaveBeenCalled();
  });
});

describe('DriverOnboardingService.getPendingDocuments joins the owner for the market predicate', () => {
  function service() {
    const joins: { alias: string; on: string }[] = [];
    const where: string[] = [];
    const qb: any = {
      leftJoin: (_entity: unknown, alias: string, on: string) => (joins.push({ alias, on }), qb),
      where: (w: string) => (where.push(w), qb),
      andWhere: (w: string) => (where.push(w), qb),
      skip: () => qb,
      take: () => qb,
      orderBy: () => qb,
      getManyAndCount: async () => [[], 0],
    };
    const documentRepo = { createQueryBuilder: () => qb, findOne: vi.fn(), save: vi.fn() };
    const driverRepo = { findOne: vi.fn(), manager: { getRepository: vi.fn() } };
    const svc = Object.create(DriverOnboardingService.prototype) as DriverOnboardingService;
    Object.assign(svc, {
      driverRepo,
      documentRepo,
      configRepo: {},
      kafka: { publish: vi.fn(async () => undefined) },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, where, joins };
  }

  it('adds the COALESCE owner-country predicate when a country is given', async () => {
    const { svc, where, joins } = service();
    await svc.getPendingDocuments({ countryCode: 'qa' });
    expect(joins.map((j) => j.alias)).toEqual(['drv', 'ven']);
    expect(where).toContain('COALESCE(drv.countryCode, ven.countryCode) = :cc');
  });

  it('leaves the queue unfiltered when no country is given', async () => {
    const { svc, where } = service();
    await svc.getPendingDocuments({});
    expect(where).not.toContain('COALESCE(drv.countryCode, ven.countryCode) = :cc');
  });
});

describe('TaxiPayoutService.processPayouts asserts every row in the batch', () => {
  function service(payoutCountry: string) {
    const payout = { id: 'p1', countryCode: payoutCountry, status: 'approved' };
    const payoutRepo = {
      find: vi.fn(async () => [payout]),
      save: vi.fn(async (p: any) => p),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(TaxiPayoutService.prototype) as TaxiPayoutService;
    Object.assign(svc, {
      payoutRepo,
      configRepo: {},
      vendorRepo: {},
      driverRepo: {},
      kafka,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
    return { svc, payoutRepo, kafka };
  }

  it('refuses a batch with a payout from another market and processes nothing', async () => {
    const { svc, payoutRepo, kafka } = service('IN');
    await expect(svc.processPayouts(['p1'], 'QA')).rejects.toThrow(ForbiddenException);
    expect(payoutRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('processes a batch entirely inside the caller market', async () => {
    const { svc, payoutRepo } = service('QA');
    await expect(svc.processPayouts(['p1'], 'QA')).resolves.toMatchObject({
      processed: 1,
      failed: 0,
    });
    expect(payoutRepo.save).toHaveBeenCalled();
  });
});
