import { describe, it, expect, vi } from 'vitest';
import { PharmacyService } from '../pharmacy.service';

/**
 * A region-locked administrator carries their market as `scope` on every admin
 * message. pharmacy-service's admin surface is a read — the store list — so
 * what has to hold here is that the predicate reaches the query: without it the
 * Qatar admin's Stores screen listed every market's pharmacies.
 */

function service() {
  const storeRepo = { findAndCount: vi.fn(async () => [[], 0]) };
  const svc = Object.create(PharmacyService.prototype) as PharmacyService;
  Object.assign(svc, {
    storeRepo,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, storeRepo };
}

describe('PharmacyService.getAdminStoreList narrows to the caller market', () => {
  it('adds the country predicate when a market is given', async () => {
    const { svc, storeRepo } = service();
    await svc.getAdminStoreList({ countryCode: 'QA' });
    expect(storeRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ countryCode: 'QA' }) }),
    );
  });

  it('keeps a status filter alongside the market', async () => {
    const { svc, storeRepo } = service();
    await svc.getAdminStoreList({ status: 'ACTIVE', countryCode: 'QA' });
    expect(storeRepo.findAndCount.mock.calls[0][0].where).toMatchObject({
      status: 'ACTIVE',
      countryCode: 'QA',
    });
  });

  it('leaves the list unfiltered for a global admin', async () => {
    const { svc, storeRepo } = service();
    await svc.getAdminStoreList({});
    expect(storeRepo.findAndCount.mock.calls[0][0].where.countryCode).toBeUndefined();
  });
});
