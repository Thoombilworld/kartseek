import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyStoreStatus, PrescriptionStatus } from './entities';

/**
 * The first market assertions in pharmacy-service.
 *
 * Until now there was no `assertInMarket` anywhere in this module: approve,
 * suspend and commission crossed markets freely, and
 * `PUT /pharmacy/admin/<IN store>/commission {"rate":90}` answered 200 for a
 * Qatar-locked admin (audit V9 / X-41). `setCommission` did not even read the
 * row — it called `update(storeId, …)`, so there was nothing to check a market
 * against and no 404 for an id that matched nothing.
 *
 * The market is `regionCode` (`pharmacy_stores.region_code`), the platform's
 * ISO-2 identifier — not `countryCode`, which carries a legacy alpha-3 default
 * ('KEN'). A store with no `regionCode` is outside every locked admin's scope.
 */

function service(
  store: { id: string; regionCode: string | null } | null = null,
  prescription: { id: string; storeId: string | null } | null = null,
) {
  const row = store ? { ...store, status: PharmacyStoreStatus.PENDING } : null;
  const storeRepo = {
    findOneBy: vi.fn(async () => row),
    findOne: vi.fn(async () => row),
    save: vi.fn(async (e: any) => e),
    update: vi.fn(async () => ({ affected: 1 })),
    findAndCount: vi.fn(async () => [[], 0]),
  };
  const predicates: string[] = [];
  const params: Record<string, unknown> = {};
  const qb: Record<string, any> = { predicates, params };
  const add = (predicate?: string, values?: Record<string, unknown>) => {
    if (predicate) predicates.push(predicate);
    if (values) Object.assign(params, values);
    return qb;
  };
  qb.where = add;
  qb.andWhere = add;
  qb.innerJoin = (_entity: unknown, _alias: string, condition: string) => add(condition);
  for (const passthrough of ['orderBy', 'skip', 'take']) qb[passthrough] = () => qb;
  qb.getManyAndCount = async () => [[], 0];
  const prescriptionRepo = {
    findOneBy: vi.fn(async () => prescription),
    save: vi.fn(async (e: any) => e),
    createQueryBuilder: vi.fn(() => qb),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(PharmacyService.prototype) as PharmacyService;
  Object.assign(svc, {
    storeRepo,
    prescriptionRepo,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, storeRepo, prescriptionRepo, kafka, qb };
}

describe('PharmacyService admin decisions assert the store market', () => {
  it("refuses approve, suspend and commission on another market's store, writing nothing", async () => {
    for (const call of [
      (svc: PharmacyService) => svc.approveStore('st-in', 'QA'),
      (svc: PharmacyService) => svc.suspendStore('st-in', 'probe', 'QA'),
      (svc: PharmacyService) => svc.setCommission('st-in', 90, 'QA'),
    ]) {
      const { svc, storeRepo, kafka } = service({ id: 'st-in', regionCode: 'IN' });
      await expect(call(svc)).rejects.toThrow('This pharmacy belongs to IN, not to the QA market.');
      expect(storeRepo.save).not.toHaveBeenCalled();
      expect(storeRepo.update).not.toHaveBeenCalled();
      expect(kafka.publish).not.toHaveBeenCalled();
    }
  });

  it('allows all three inside the scoped market', async () => {
    const approve = service({ id: 'st-qa', regionCode: 'QA' });
    await expect(approve.svc.approveStore('st-qa', 'QA')).resolves.toMatchObject({
      status: PharmacyStoreStatus.APPROVED,
    });
    expect(approve.storeRepo.save).toHaveBeenCalled();

    const suspend = service({ id: 'st-qa', regionCode: 'QA' });
    await expect(suspend.svc.suspendStore('st-qa', 'probe', 'QA')).resolves.toMatchObject({
      status: PharmacyStoreStatus.SUSPENDED,
    });
    expect(suspend.storeRepo.save).toHaveBeenCalled();

    const commission = service({ id: 'st-qa', regionCode: 'QA' });
    await expect(commission.svc.setCommission('st-qa', 12, 'QA')).resolves.toMatchObject({
      success: true,
      commissionRate: 12,
    });
    expect(commission.storeRepo.update).toHaveBeenCalled();
  });

  it('leaves a global admin able to decide on any market', async () => {
    const approve = service({ id: 'st-in', regionCode: 'IN' });
    await expect(approve.svc.approveStore('st-in')).resolves.toMatchObject({
      status: PharmacyStoreStatus.APPROVED,
    });

    const suspend = service({ id: 'st-in', regionCode: 'IN' });
    await expect(suspend.svc.suspendStore('st-in', 'probe')).resolves.toMatchObject({
      status: PharmacyStoreStatus.SUSPENDED,
    });

    const commission = service({ id: 'st-in', regionCode: 'IN' });
    await expect(commission.svc.setCommission('st-in', 12)).resolves.toMatchObject({
      success: true,
    });
    expect(commission.storeRepo.update).toHaveBeenCalled();
  });

  it('refuses a locked admin a store that belongs to no market, and 404s a missing id', async () => {
    const none = service({ id: 'st-none', regionCode: null });
    await expect(none.svc.setCommission('st-none', 12, 'QA')).rejects.toThrow(ForbiddenException);
    expect(none.storeRepo.update).not.toHaveBeenCalled();

    // `setCommission` used to write without reading, so an id that matched
    // nothing answered `{ success: true }`.
    const missing = service(null);
    await expect(missing.svc.setCommission('st-gone', 12)).rejects.toThrow(
      'Store st-gone not found',
    );
    expect(missing.storeRepo.update).not.toHaveBeenCalled();
  });
});

describe('PharmacyService prescription verification is scoped too', () => {
  it("refuses a prescription for another market's pharmacy, writing nothing", async () => {
    const { svc, prescriptionRepo } = service(
      { id: 'st-in', regionCode: 'IN' },
      { id: 'p-1', storeId: 'st-in' },
    );
    await expect(
      svc.verifyPrescription('p-1', {
        status: PrescriptionStatus.VERIFIED_APPROVED,
        adminId: 'admin-qa',
        scope: 'QA',
      }),
    ).rejects.toThrow('This prescription belongs to IN, not to the QA market.');
    expect(prescriptionRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a locked admin a prescription with no target pharmacy', async () => {
    const { svc, prescriptionRepo } = service(null, { id: 'p-2', storeId: null });
    await expect(
      svc.verifyPrescription('p-2', {
        status: PrescriptionStatus.VERIFIED_APPROVED,
        adminId: 'admin-qa',
        scope: 'QA',
      }),
    ).rejects.toThrow('This prescription cannot be attributed to a market yet.');
    expect(prescriptionRepo.save).not.toHaveBeenCalled();
  });

  it('puts the market in the pending-verification query, not after it', async () => {
    const { svc, qb } = service();
    await svc.getPendingPrescriptions(1, 20, 'QA');
    expect(qb.predicates.some((p: string) => p.includes('store.regionCode'))).toBe(true);
    expect(qb.params.scope).toBe('QA');
    // `pharmacy_stores.id` is uuid and `prescriptions."storeId"` is varchar, so
    // the join must cast or Postgres refuses the comparison and the queue 500s.
    // Pinned here because only a live query finds it: a mocked repository does
    // not type-check its own SQL.
    expect(qb.predicates).toContain('store.id::text = presc.storeId');

    const global = service();
    await global.svc.getPendingPrescriptions(1, 20);
    expect(global.qb.predicates.some((p: string) => p.includes('store.regionCode'))).toBe(false);
  });
});
