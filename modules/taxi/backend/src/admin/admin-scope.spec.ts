import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { TaxiAdminService } from './admin.service';
import { VendorManagementService } from '../services/vendor-management.service';
import { DriverOnboardingService } from '../services/driver-onboarding.service';
import { TaxiPayoutService } from '../services/taxi-payout.service';

/**
 * The market boundary on the seven admin commands M7 owns.
 *
 * Every assertion here is about the ROW, not the message: `scope` is the lock
 * the gateway resolved from the signed token, and what it is compared against is
 * the vendor's, driver's or payout's own `countryCode`. A handler that trusted
 * the message would pass a test that named the market in the payload, which is
 * exactly the shape of the bug this plan exists to remove.
 *
 * `:__market` is the one parameter name `applyMarketFilter` binds,
 * platform-wide (`libs/common/src/market/market-scope.ts`). It is deliberately
 * not `:country`, `:cc` or `:rc`: a predicate that reuses a name the caller also
 * binds is one a later clause can silently overwrite with a different value.
 */

/** A uuid the shape `requireUuid` accepts, so a test never fails on the id format. */
const VENDOR_ID = '11111111-1111-4111-8111-111111111111';
const DRIVER_ID = '22222222-2222-4222-8222-222222222222';
const PAYOUT_ID = '33333333-3333-4333-8333-333333333333';

const logger = () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() });

// ── The three implementation services, with their repositories stubbed ───────

function vendorService(vendor: Record<string, unknown> | null) {
  const vendorRepo = {
    findOne: vi.fn(async () => vendor),
    save: vi.fn(async (v: unknown) => v),
    count: vi.fn(async () => 0),
  };
  const driverRepo = {
    count: vi.fn(async () => 0),
    createQueryBuilder: vi.fn(() => {
      const qb: Record<string, unknown> = {};
      Object.assign(qb, {
        select: () => qb,
        addSelect: () => qb,
        where: () => qb,
        getRawOne: async () => ({ totalTrips: '0', avgRating: '0' }),
      });
      return qb;
    }),
  };
  const documentRepo = { find: vi.fn(async () => []), count: vi.fn(async () => 0) };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(VendorManagementService.prototype) as VendorManagementService;
  Object.assign(svc, { vendorRepo, driverRepo, documentRepo, kafka, logger: logger() });
  return { svc, vendorRepo, kafka };
}

function onboardingService(driver: Record<string, unknown> | null) {
  const driverRepo = {
    findOne: vi.fn(async () => driver),
    save: vi.fn(async (d: unknown) => d),
    manager: { getRepository: vi.fn() },
  };
  const documentRepo = { find: vi.fn(async () => []) };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(DriverOnboardingService.prototype) as DriverOnboardingService;
  Object.assign(svc, { driverRepo, documentRepo, configRepo: {}, kafka, logger: logger() });
  return { svc, driverRepo, kafka };
}

function payoutService(payout: Record<string, unknown> | null) {
  const payoutRepo = {
    findOne: vi.fn(async () => payout),
    save: vi.fn(async (p: unknown) => p),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(TaxiPayoutService.prototype) as TaxiPayoutService;
  Object.assign(svc, {
    payoutRepo,
    configRepo: {},
    vendorRepo: {},
    driverRepo: {},
    kafka,
    logger: logger(),
  });
  return { svc, payoutRepo, kafka };
}

/** The admin service, wired onto whichever implementation services a test needs. */
function adminService(parts: {
  vendors?: VendorManagementService;
  onboarding?: DriverOnboardingService;
  payouts?: TaxiPayoutService;
  vendorRepo?: unknown;
  driverRepo?: unknown;
  documentRepo?: unknown;
}) {
  const svc = Object.create(TaxiAdminService.prototype) as TaxiAdminService;
  Object.assign(svc, {
    vendorRepo: parts.vendorRepo ?? {},
    driverRepo: parts.driverRepo ?? {},
    documentRepo: parts.documentRepo ?? {},
    vendors: parts.vendors ?? {},
    onboarding: parts.onboarding ?? {},
    payouts: parts.payouts ?? {},
    logger: logger(),
  });
  return svc;
}

describe('admin.taxi.approveVendor asserts the vendor’s own market', () => {
  const inVendor = () => ({
    id: VENDOR_ID,
    name: 'Delhi Cabs',
    countryCode: 'IN',
    status: 'pending',
  });

  it('refuses a vendor in another market and writes nothing', async () => {
    const { svc: vendors, vendorRepo, kafka } = vendorService(inVendor());
    const admin = adminService({ vendors });

    await expect(
      admin.approveVendor({ id: VENDOR_ID, scope: 'QA', actorId: 'admin-qa' }),
    ).rejects.toThrow(ForbiddenException);

    expect(vendorRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('carries the platform’s backend denial copy', async () => {
    const { svc: vendors } = vendorService(inVendor());
    const admin = adminService({ vendors });

    await expect(
      admin.approveVendor({ id: VENDOR_ID, scope: 'QA', actorId: 'admin-qa' }),
    ).rejects.toThrow('This vendor belongs to IN, not to the QA market.');
  });

  it('approves in the caller’s own market and records the actor', async () => {
    const { svc: vendors, vendorRepo } = vendorService(inVendor());
    const admin = adminService({ vendors });

    const saved: any = await admin.approveVendor({
      id: VENDOR_ID,
      scope: 'IN',
      actorId: 'admin-in',
    });

    expect(vendorRepo.save).toHaveBeenCalled();
    expect(saved.status).toBe('active');
    expect(saved.approvedBy).toBe('admin-in');
    expect(saved.approvedAt).toBeInstanceOf(Date);
  });

  it('lets a global admin (no scope) approve a vendor in any market', async () => {
    const { svc: vendors } = vendorService(inVendor());
    const admin = adminService({ vendors });

    await expect(
      admin.approveVendor({ id: VENDOR_ID, actorId: 'superadmin' }),
    ).resolves.toMatchObject({ status: 'active' });
  });

  it('reports a missing vendor as 404, never as a market denial', async () => {
    const { svc: vendors } = vendorService(null);
    const admin = adminService({ vendors });

    await expect(
      admin.approveVendor({ id: VENDOR_ID, scope: 'QA', actorId: 'admin-qa' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuses a malformed id with a 400 rather than letting Postgres answer', async () => {
    const { svc: vendors } = vendorService(inVendor());
    const admin = adminService({ vendors });

    await expect(
      admin.approveVendor({ id: 'not-a-uuid', scope: 'IN', actorId: 'admin-in' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a decision with no actor rather than recording it against undefined', async () => {
    const { svc: vendors, vendorRepo } = vendorService(inVendor());
    const admin = adminService({ vendors });

    await expect(admin.approveVendor({ id: VENDOR_ID, scope: 'IN' })).rejects.toThrow(
      BadRequestException,
    );
    expect(vendorRepo.save).not.toHaveBeenCalled();
  });
});

describe('admin.taxi.suspendVendor records who suspended, and only in their market', () => {
  const inVendor = () => ({
    id: VENDOR_ID,
    name: 'Delhi Cabs',
    countryCode: 'IN',
    status: 'active',
  });

  it('refuses a vendor in another market and writes nothing', async () => {
    const { svc: vendors, vendorRepo, kafka } = vendorService(inVendor());
    const admin = adminService({ vendors });

    await expect(
      admin.suspendVendor({ id: VENDOR_ID, reason: 'Expired licence', scope: 'QA', actorId: 'a' }),
    ).rejects.toThrow(ForbiddenException);

    expect(vendorRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('stores the actor and the moment beside the reason', async () => {
    const { svc: vendors } = vendorService(inVendor());
    const admin = adminService({ vendors });

    const saved: any = await admin.suspendVendor({
      id: VENDOR_ID,
      reason: 'Expired licence',
      scope: 'IN',
      actorId: 'admin-in',
    });

    expect(saved.status).toBe('suspended');
    expect(saved.suspensionReason).toBe('Expired licence');
    expect(saved.suspendedBy).toBe('admin-in');
    expect(saved.suspendedAt).toBeInstanceOf(Date);
  });

  it('refuses a suspension with no reason', async () => {
    const { svc: vendors, vendorRepo } = vendorService(inVendor());
    const admin = adminService({ vendors });

    await expect(
      admin.suspendVendor({ id: VENDOR_ID, scope: 'IN', actorId: 'admin-in' }),
    ).rejects.toThrow(BadRequestException);
    expect(vendorRepo.save).not.toHaveBeenCalled();
  });
});

describe('admin.taxi.vendorDetail refuses a foreign vendor', () => {
  it('throws on a vendor in another market', async () => {
    const { svc: vendors } = vendorService({
      id: VENDOR_ID,
      name: 'Delhi Cabs',
      countryCode: 'IN',
      status: 'active',
    });
    const admin = adminService({ vendors });

    await expect(admin.getVendorDetail({ id: VENDOR_ID, scope: 'QA' })).rejects.toThrow(
      'This vendor belongs to IN, not to the QA market.',
    );
  });

  it('returns the vendor and its fleet figures to the market’s own admin', async () => {
    const { svc: vendors } = vendorService({
      id: VENDOR_ID,
      name: 'Delhi Cabs',
      countryCode: 'IN',
      status: 'active',
    });
    const admin = adminService({ vendors });

    const detail: any = await admin.getVendorDetail({ id: VENDOR_ID, scope: 'IN' });
    expect(detail.vendor.id).toBe(VENDOR_ID);
    expect(detail.stats).toMatchObject({ totalDrivers: 0, activeDrivers: 0 });
  });
});

describe('admin.taxi.driverDetail and approveDriver assert the driver’s own market', () => {
  const inDriver = () => ({
    id: DRIVER_ID,
    firstName: 'A',
    lastName: 'Driver',
    countryCode: 'IN',
    status: 'onboarding',
    vendorId: null,
  });

  it('refuses a foreign driver’s detail with the backend copy', async () => {
    const { svc: onboarding } = onboardingService(inDriver());
    const admin = adminService({ onboarding });

    await expect(admin.getDriverDetail({ id: DRIVER_ID, scope: 'QA' })).rejects.toThrow(
      'This driver belongs to IN, not to the QA market.',
    );
  });

  it('refuses to approve a foreign driver and writes nothing', async () => {
    const { svc: onboarding, driverRepo, kafka } = onboardingService(inDriver());
    const admin = adminService({ onboarding });

    await expect(
      admin.approveDriver({ id: DRIVER_ID, scope: 'QA', actorId: 'admin-qa' }),
    ).rejects.toThrow(ForbiddenException);

    expect(driverRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('approves in the caller’s own market and records the actor', async () => {
    const { svc: onboarding, kafka } = onboardingService(inDriver());
    const admin = adminService({ onboarding });

    const saved: any = await admin.approveDriver({
      id: DRIVER_ID,
      scope: 'IN',
      actorId: 'admin-in',
    });

    expect(saved.status).toBe('active');
    expect(saved.approvedBy).toBe('admin-in');
    expect(saved.approvedAt).toBeInstanceOf(Date);
    expect(kafka.publish).toHaveBeenCalledWith(
      'taxi.driver.approved',
      expect.objectContaining({ countryCode: 'IN', approvedBy: 'admin-in' }),
    );
  });

  it('reports a missing driver as 404', async () => {
    const { svc: onboarding } = onboardingService(null);
    const admin = adminService({ onboarding });

    await expect(
      admin.approveDriver({ id: DRIVER_ID, scope: 'IN', actorId: 'admin-in' }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('admin.taxi.approvePayout asserts the payout record’s market', () => {
  const inPayout = (status = 'pending') => ({
    id: PAYOUT_ID,
    countryCode: 'IN',
    status,
    recipientType: 'driver',
    recipientId: DRIVER_ID,
    netPayout: 420,
    currency: 'INR',
  });

  it('refuses a payout belonging to another market and writes nothing', async () => {
    const { svc: payouts, payoutRepo, kafka } = payoutService(inPayout());
    const admin = adminService({ payouts });

    await expect(
      admin.approvePayout({ id: PAYOUT_ID, scope: 'QA', actorId: 'admin-qa' }),
    ).rejects.toThrow('This payout belongs to IN, not to the QA market.');

    expect(payoutRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('changes what it claims: status, actor and moment, and says so', async () => {
    const { svc: payouts, kafka } = payoutService(inPayout());
    const admin = adminService({ payouts });

    const saved: any = await admin.approvePayout({
      id: PAYOUT_ID,
      scope: 'IN',
      actorId: 'admin-in',
    });

    expect(saved.status).toBe('approved');
    expect(saved.approvedBy).toBe('admin-in');
    expect(saved.approvedAt).toBeInstanceOf(Date);
    expect(kafka.publish).toHaveBeenCalledWith(
      'taxi.payout.approved',
      expect.objectContaining({ payoutId: PAYOUT_ID, approvedBy: 'admin-in', amount: 420 }),
    );
  });

  it('refuses a payout that is not pending rather than reporting a silent no-op', async () => {
    const { svc: payouts, payoutRepo } = payoutService(inPayout('settled'));
    const admin = adminService({ payouts });

    await expect(
      admin.approvePayout({ id: PAYOUT_ID, scope: 'IN', actorId: 'admin-in' }),
    ).rejects.toThrow(BadRequestException);
    expect(payoutRepo.save).not.toHaveBeenCalled();
  });
});

describe('admin.taxi.pendingApprovals filters vendors, drivers and documents on the market', () => {
  /** A query builder that records every `andWhere` expression it is given. */
  function recordingQb(rows: unknown[] = [], count = 0) {
    const where: string[] = [];
    const qb: Record<string, unknown> = {};
    Object.assign(qb, {
      leftJoin: () => qb,
      addSelect: () => qb,
      where: (w: string) => (where.push(w), qb),
      andWhere: (w: string) => (where.push(w), qb),
      orderBy: () => qb,
      addOrderBy: () => qb,
      take: () => qb,
      getManyAndCount: async () => [rows, count],
      getCount: async () => count,
    });
    return { qb, where };
  }

  function queue() {
    const vendors = recordingQb([{ id: VENDOR_ID }], 1);
    const drivers = recordingQb([{ id: DRIVER_ID }], 2);
    const documents = recordingQb([], 3);
    const admin = adminService({
      vendorRepo: { createQueryBuilder: () => vendors.qb },
      driverRepo: { createQueryBuilder: () => drivers.qb },
      documentRepo: { createQueryBuilder: () => documents.qb },
    });
    return { admin, vendors, drivers, documents };
  }

  it('adds the market predicate to all three legs for a locked caller', async () => {
    const { admin, vendors, drivers, documents } = queue();

    await admin.getPendingApprovals({ scope: 'IN' });

    expect(vendors.where).toContain('v.countryCode = :__market');
    expect(drivers.where).toContain('d.countryCode = :__market');
    expect(documents.where).toContain('COALESCE(drv.countryCode, ven.countryCode) = :__market');
  });

  it('reports the market it filtered on and the three counts', async () => {
    const { admin } = queue();

    const result = await admin.getPendingApprovals({ scope: 'IN' });

    expect(result.market).toBe('IN');
    expect(result.counts).toEqual({ vendors: 1, drivers: 2, documents: 3, total: 3 });
  });

  it('adds no predicate for a global caller, and says the market is null', async () => {
    const { admin, vendors, drivers, documents } = queue();

    const result = await admin.getPendingApprovals({});

    expect(result.market).toBeNull();
    expect(vendors.where).not.toContain('v.countryCode = :__market');
    expect(drivers.where).not.toContain('d.countryCode = :__market');
    expect(documents.where).not.toContain('COALESCE(drv.countryCode, ven.countryCode) = :__market');
  });

  it('lets the lock win over a requested market rather than widening', async () => {
    const { admin } = queue();

    const result = await admin.getPendingApprovals({ scope: 'IN', countryCode: 'QA' });

    expect(result.market).toBe('IN');
  });

  it('refuses an unreadable requested market rather than dropping the predicate', async () => {
    const { admin } = queue();

    await expect(admin.getPendingApprovals({ countryCode: 'NOT-A-COUNTRY' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('clamps the queue page so an unbounded read cannot be asked for', async () => {
    const { admin } = queue();

    await expect(admin.getPendingApprovals({ scope: 'IN', limit: 5000 })).resolves.toMatchObject({
      limit: 100,
    });
    await expect(admin.getPendingApprovals({ scope: 'IN', limit: 0 })).resolves.toMatchObject({
      limit: 20,
    });
  });
});
