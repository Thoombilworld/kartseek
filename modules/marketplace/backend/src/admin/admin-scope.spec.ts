import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MarketplaceService } from '../marketplace.service';
import { MarketplaceAdminService } from './admin.service';

describe('MarketplaceService seller decisions respect scope', () => {
  function service(sellerRegion: string) {
    const sellerRepo = {
      findOne: vi.fn(async () => ({
        id: 's-1',
        regionCode: sellerRegion,
        verificationStatus: 'PENDING',
      })),
      save: vi.fn(async (s: any) => s),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
    Object.assign(svc, { sellerRepo, kafka, logger: { log: vi.fn(), warn: vi.fn() } });
    return { svc, sellerRepo, kafka };
  }

  it("approves a seller in the admin's market", async () => {
    const { svc, sellerRepo } = service('QA');
    await expect(svc.approveSeller('s-1', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(sellerRepo.save).toHaveBeenCalled();
  });

  it('refuses a seller from another market and writes nothing', async () => {
    const { svc, sellerRepo, kafka } = service('IN');
    await expect(svc.approveSeller('s-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(sellerRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses suspend, reject and reactivate on a seller from another market', async () => {
    for (const call of [
      (s: MarketplaceService) => s.suspendSeller('s-1', 'admin-qa', 'QA'),
      (s: MarketplaceService) => s.rejectSeller('s-1', { adminId: 'admin-qa' }, 'QA'),
      (s: MarketplaceService) => s.reactivateSeller('s-1', 'admin-qa', 'QA'),
    ]) {
      const { svc, sellerRepo, kafka } = service('IN');
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      expect(sellerRepo.save).not.toHaveBeenCalled();
      expect(kafka.publish).not.toHaveBeenCalled();
    }
  });

  it('leaves a global admin (no scope) free to decide in any market', async () => {
    const { svc, sellerRepo } = service('IN');
    await expect(svc.approveSeller('s-1', 'admin-global')).resolves.toMatchObject({
      success: true,
      regionCode: 'IN',
    });
    expect(sellerRepo.save).toHaveBeenCalled();
  });
});

describe('product decisions resolve the market through the seller', () => {
  function service(sellerRegion: string | null) {
    const product = {
      id: 'p-1',
      seller_id: 'seller-1',
      approval_status: 'PENDING',
      is_active: false,
      status: 'DRAFT',
    };
    const productRepo = { findOne: vi.fn(async () => product), save: vi.fn(async (p: any) => p) };
    const sellerRepo = {
      findOne: vi.fn(async () =>
        sellerRegion ? { id: 'seller-1', regionCode: sellerRegion } : null,
      ),
    };
    const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
    Object.assign(svc, {
      productRepo,
      sellerRepo,
      kafka: { publish: vi.fn(async () => undefined) },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, productRepo, sellerRepo };
  }

  it('refuses a product whose seller is in another market, before any write', async () => {
    const { svc, productRepo } = service('IN');
    await expect(svc.approveProduct('p-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(productRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a product whose seller cannot be found at all', async () => {
    const { svc, productRepo } = service(null);
    await expect(svc.rejectProduct('p-1', 'admin-qa', 'counterfeit', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(productRepo.save).not.toHaveBeenCalled();
  });

  it('looks the owner up by the snake-case seller_id the entity actually carries', async () => {
    const { svc, sellerRepo } = service('IN');
    // The market matches, so the assertion passes and the method runs on into
    // listing activation, which this stub has no repository for — irrelevant
    // here: what is under test is how the owner was looked up.
    await svc.approveProduct('p-1', 'admin-in', 'IN').catch(() => undefined);
    expect(sellerRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'seller-1' },
      select: ['id', 'regionCode'],
    });
  });

  it('does not query the seller at all for a global admin', async () => {
    const { svc, sellerRepo } = service('IN');
    await svc.approveProduct('p-1', 'admin-global').catch(() => undefined);
    expect(sellerRepo.findOne).not.toHaveBeenCalled();
  });
});

describe('MarketplaceAdminService admin queues respect scope', () => {
  function admin() {
    const sellerRepo = {
      findAndCount: vi.fn(async () => [[], 0]),
      findOne: vi.fn(async () => ({ id: 's-1', regionCode: 'IN', verificationStatus: 'PENDING' })),
      save: vi.fn(async (s: any) => s),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, { sellerRepo, kafka, logger: { log: vi.fn(), warn: vi.fn() } });
    return { svc, sellerRepo, kafka };
  }

  it('filters the pending-seller queue by the scope it was given', async () => {
    const { svc, sellerRepo } = admin();
    await svc.getPendingSellers('qa');
    expect(sellerRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { verificationStatus: 'PENDING', regionCode: 'QA' } }),
    );
  });

  it('leaves the queue unfiltered for a global admin', async () => {
    const { svc, sellerRepo } = admin();
    await svc.getPendingSellers();
    expect(sellerRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { verificationStatus: 'PENDING' } }),
    );
  });

  it('refuses to block a seller from another market and writes nothing', async () => {
    const { svc, sellerRepo, kafka } = admin();
    await expect(svc.blockSeller('s-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(sellerRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});
