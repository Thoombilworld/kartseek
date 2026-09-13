import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PharmacyAdminService } from './admin.service';
import { PharmacyStoreStatus } from '../entities';

/**
 * Market scope on the pharmacy admin surface.
 *
 * Seventeen of the nineteen `admin.pharmacy.*` commands had no handler at all,
 * so none of this was enforced anywhere: there was nothing to enforce it in.
 * What these tests hold is the two halves of the rule that the new handlers are
 * built on.
 *
 * **The predicate.** Products, orders, prescriptions and settlements carry no
 * market of their own — only `store_id` — so each list joins the store and
 * filters on `store.regionCode`. It has to be a PREDICATE, inside the query:
 * filtering after `take(limit)` returns a short page that reads as "this market
 * has nothing", which is indistinguishable from a leak in the other direction.
 * And the lock has to beat the request: a locked caller who names another
 * market gets their own, never both and never neither.
 *
 * **The assertion.** Every decision re-reads the row's own market and refuses
 * on it, so an admin who reaches a handler by any path is still refused by the
 * record itself. A row that belongs to no market is refused too — it is
 * nobody's market's, and guessing is the leak.
 */

/** A query builder that records the predicates it was handed. */
function builder() {
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
  qb.leftJoin = (...args: unknown[]) => add(typeof args[2] === 'string' ? args[2] : undefined);
  qb.innerJoin = (...args: unknown[]) => add(typeof args[2] === 'string' ? args[2] : undefined);
  qb.leftJoinAndSelect = qb.leftJoin;
  qb.clone = () => qb;
  for (const passthrough of [
    'select',
    'addSelect',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'addGroupBy',
    'skip',
    'take',
    'offset',
    'limit',
  ]) {
    qb[passthrough] = () => qb;
  }
  qb.getManyAndCount = async () => [[], 0];
  qb.getMany = async () => [];
  qb.getRawMany = async () => [];
  qb.getRawOne = async () => ({});
  qb.getCount = async () => 0;
  return qb;
}

function service(store: { id: string; regionCode: string | null } | null = null) {
  const qb = builder();
  const row = store
    ? { ...store, status: PharmacyStoreStatus.PENDING_KYC, kycDocuments: [] }
    : null;
  const storeRepo = {
    findOne: vi.fn(async () => row),
    update: vi.fn(async () => ({ affected: 1 })),
    createQueryBuilder: vi.fn(() => qb),
  };
  const itemRepo = {
    findOne: vi.fn(async () => null),
    update: vi.fn(async () => ({ affected: 1 })),
    createQueryBuilder: vi.fn(() => qb),
    count: vi.fn(async () => 0),
  };
  const orderRepo = { createQueryBuilder: vi.fn(() => qb), count: vi.fn(async () => 0) };
  const prescriptionRepo = { createQueryBuilder: vi.fn(() => qb), count: vi.fn(async () => 0) };
  const categoryRepo = {
    findOne: vi.fn(async () => null),
    create: vi.fn((e: any) => e),
    save: vi.fn(async (e: any) => ({ id: 'cat-1', ...e })),
    find: vi.fn(async () => []),
  };
  const settingRepo = {
    find: vi.fn(async () => []),
    create: vi.fn((e: any) => e),
    save: vi.fn(async (e: any) => e),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(PharmacyAdminService.prototype) as PharmacyAdminService;
  Object.assign(svc, {
    storeRepo,
    itemRepo,
    orderRepo,
    prescriptionRepo,
    categoryRepo,
    settingRepo,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, qb, storeRepo, itemRepo, categoryRepo, settingRepo, kafka };
}

const marketOf = (qb: Record<string, any>) => qb.params.__market;
const joinedOnStoreMarket = (qb: Record<string, any>) =>
  qb.predicates.some((p: string) => p.includes('store.regionCode'));

describe('pharmacy admin lists filter on the store market', () => {
  it('joins products to their store and filters on the store market', async () => {
    const { svc, qb } = service();
    await svc.listProducts({ page: 1, limit: 20, scope: 'QA' });
    expect(joinedOnStoreMarket(qb)).toBe(true);
    expect(marketOf(qb)).toBe('QA');
  });

  it.each([
    ['orders', (svc: PharmacyAdminService) => svc.listOrders({ scope: 'QA' })],
    ['prescriptions', (svc: PharmacyAdminService) => svc.listPrescriptions({ scope: 'QA' })],
    ['verifications', (svc: PharmacyAdminService) => svc.listVerifications({ scope: 'QA' })],
    ['settlements', (svc: PharmacyAdminService) => svc.getSettlements({ scope: 'QA' })],
    ['commissions', (svc: PharmacyAdminService) => svc.getCommissions({ scope: 'QA' })],
  ])('narrows the %s list to the caller market', async (_name, call) => {
    const { svc, qb } = service();
    await call(svc);
    expect(joinedOnStoreMarket(qb)).toBe(true);
    expect(marketOf(qb)).toBe('QA');
  });

  it('casts the prescription join, because storeId is varchar against a uuid key', async () => {
    const { svc, qb } = service();
    await svc.listPrescriptions({ scope: 'QA' });
    // Without the cast Postgres answers `operator does not exist: uuid =
    // character varying` and the queue 500s. Only a live query finds this — a
    // mocked repository does not type-check its own SQL — so it is pinned here.
    expect(qb.predicates).toContain('store.id::text = presc.storeId');
  });

  it('ignores a market named in the request when the caller is locked', async () => {
    const { svc, qb } = service();
    await svc.listOrders({ countryCode: 'IN', scope: 'QA' } as never);
    expect(marketOf(qb)).toBe('QA');
  });

  it('leaves a global admin every market, with no predicate at all', async () => {
    const { svc, qb } = service();
    await svc.listProducts({ page: 1, limit: 20 });
    expect(joinedOnStoreMarket(qb)).toBe(false);
    expect(marketOf(qb)).toBeUndefined();
  });

  it('refuses a requested market it cannot read rather than listing every market', async () => {
    // An absent predicate means EVERY market, so an unreadable `?countryCode=`
    // must not simply drop out of the query (R2-1).
    for (const bad of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
      const { svc } = service();
      await expect(svc.listOrders({ region: bad })).rejects.toThrow(ForbiddenException);
    }
  });

  it('clamps the page size instead of letting one request read the table', async () => {
    const { svc, qb } = service();
    const take = vi.spyOn(qb, 'take');
    await svc.listProducts({ limit: 5000 });
    expect(take).toHaveBeenCalledWith(100);
  });
});

describe('pharmacy admin decisions assert the loaded row', () => {
  it("refuses a licence decision on another market's pharmacy, writing nothing", async () => {
    const { svc, storeRepo, kafka } = service({ id: 's-in', regionCode: 'IN' });
    await expect(svc.verifyLicence('s-in', { verified: true }, 'admin-qa', 'QA')).rejects.toThrow(
      'This pharmacy licence belongs to IN, not to the QA market.',
    );
    expect(storeRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses a licence decision on a pharmacy with no market at all', async () => {
    const { svc, storeRepo } = service({ id: 's-none', regionCode: null });
    await expect(svc.verifyLicence('s-none', { verified: true }, 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(storeRepo.update).not.toHaveBeenCalled();
  });

  it('lets the decision through inside the caller market, and records the actor', async () => {
    const { svc, storeRepo, kafka } = service({ id: 's-qa', regionCode: 'QA' });
    await expect(
      svc.verifyLicence('s-qa', { verified: true }, 'admin-qa', 'QA'),
    ).resolves.toMatchObject({
      success: true,
      id: 's-qa',
      verified: true,
      status: PharmacyStoreStatus.PENDING_APPROVAL,
    });
    expect(storeRepo.update).toHaveBeenCalled();
    expect(kafka.publish).toHaveBeenCalledWith(
      'pharmacy.store.licence.verified',
      expect.objectContaining({ market: 'QA', actorId: 'admin-qa', verified: true }),
    );
  });

  it('does not put a pharmacy live — a licence pass is not a trading decision', async () => {
    const { svc, storeRepo } = service({ id: 's-qa', regionCode: 'QA' });
    await svc.verifyLicence('s-qa', { verified: true }, 'admin-qa', 'QA');
    expect(storeRepo.update.mock.calls[0][1].status).not.toBe(PharmacyStoreStatus.APPROVED);
  });

  it("refuses a product approval through the product's own store, writing nothing", async () => {
    const { svc, itemRepo, kafka } = service();
    itemRepo.findOne.mockResolvedValueOnce({
      id: 'p-1',
      storeId: 's-in',
      store: { id: 's-in', regionCode: 'IN' },
    } as never);
    await expect(svc.approveProduct('p-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(itemRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses a locked admin a product whose store is gone', async () => {
    const { svc, itemRepo } = service();
    itemRepo.findOne.mockResolvedValueOnce({ id: 'p-2', storeId: null, store: null } as never);
    await expect(svc.approveProduct('p-2', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(itemRepo.update).not.toHaveBeenCalled();
  });

  it('404s an unknown store rather than reporting success', async () => {
    const { svc } = service(null);
    await expect(svc.getStoreDetail('nope', 'QA')).rejects.toThrow(NotFoundException);
  });

  it('404s an unknown product rather than reporting success', async () => {
    const { svc } = service();
    await expect(svc.approveProduct('nope', 'admin', undefined)).rejects.toThrow(NotFoundException);
  });
});

describe('pharmacy admin surfaces that are global, and say so', () => {
  it('refuses a locked admin the globally managed category taxonomy', async () => {
    const { svc, categoryRepo } = service();
    await expect(svc.createCategory({ name: 'Analgesics' }, 'admin-qa', 'QA')).rejects.toThrow(
      'Pharmacy taxonomy is managed globally.',
    );
    expect(categoryRepo.save).not.toHaveBeenCalled();
  });

  it('lets a global admin add to it', async () => {
    const { svc, categoryRepo } = service();
    await expect(svc.createCategory({ name: 'Analgesics' }, 'admin')).resolves.toMatchObject({
      slug: 'analgesics',
    });
    expect(categoryRepo.save).toHaveBeenCalled();
  });

  it('refuses a locked admin the settings write, and writes nothing', async () => {
    const { svc, settingRepo } = service();
    await expect(svc.updateSettings({ minOrderAmount: 10 }, 'admin-qa', 'QA')).rejects.toThrow(
      'Pharmacy settings are managed globally.',
    );
    expect(settingRepo.save).not.toHaveBeenCalled();
  });

  it('still lets a locked admin READ their own market settings', async () => {
    const { svc } = service();
    await expect(svc.getSettings({ scope: 'QA' })).resolves.toMatchObject({
      market: 'QA',
      source: 'platform',
    });
  });

  it('refuses an unknown settings key rather than storing it', async () => {
    const { svc, settingRepo } = service();
    await expect(svc.updateSettings({ nonesuch: 1 }, 'admin')).rejects.toThrow(BadRequestException);
    expect(settingRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a known key with the wrong type rather than storing it', async () => {
    const { svc, settingRepo } = service();
    await expect(svc.updateSettings({ minOrderAmount: 'ten' }, 'admin')).rejects.toThrow(
      BadRequestException,
    );
    expect(settingRepo.save).not.toHaveBeenCalled();
  });

  it("writes a global admin's market override against that market's own row", async () => {
    const { svc, settingRepo } = service();
    await svc.updateSettings({ minOrderAmount: 25 }, 'admin', undefined, 'QA');
    expect(settingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'minOrderAmount', regionCode: 'QA', value: 25 }),
    );
  });

  it('writes the platform row when no market is named', async () => {
    const { svc, settingRepo } = service();
    await svc.updateSettings({ minOrderAmount: 25 }, 'admin');
    expect(settingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'minOrderAmount', regionCode: '*' }),
    );
  });
});
