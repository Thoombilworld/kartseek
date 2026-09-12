import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MarketplaceFulfillmentService } from './fulfillment.service';

const admin = { ownerId: 'u-admin', role: 'ADMIN' };

/**
 * A fulfillment service with just enough doubles to reach the scope check.
 * `variantSellerId` resolves through the variant's own column, so one variant
 * row and one seller row is the whole fixture.
 */
function service(sellerRegion: string | null) {
  const variantRepo = {
    findOne: vi.fn(async () => ({
      id: 'v-1',
      productId: 'p-1',
      sellerId: 's-1',
      stockQuantity: 5,
    })),
    update: vi.fn(async () => ({ affected: 1 })),
    create: vi.fn((x: any) => x),
    save: vi.fn(async (x: any) => ({ ...x, id: 'v-new' })),
  };
  const productRepo = {
    findOne: vi.fn(async () => ({ id: 'p-1', seller_id: 's-1' })),
  };
  const sellerRepo = {
    findOne: vi.fn(async () => ({ id: 's-1', regionCode: sellerRegion })),
  };
  const returnRepo = {
    findOne: vi.fn(async () => ({
      id: 'r-1',
      sellerId: 's-1',
      regionCode: 'IN',
      status: 'RECEIVED',
    })),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const dataSource = {
    transaction: vi.fn(async () => ({ newQty: 0, sku: 'SKU', lowStockThreshold: 1 })),
  };
  const svc = Object.create(
    MarketplaceFulfillmentService.prototype,
  ) as MarketplaceFulfillmentService;
  Object.assign(svc, {
    variantRepo,
    productRepo,
    sellerRepo,
    returnRepo,
    kafka,
    dataSource,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, variantRepo, returnRepo, kafka };
}

describe('variant writes respect the owning seller market', () => {
  it('refuses stock, update, delete and create on an IN seller for a QA admin, and writes nothing', async () => {
    for (const call of [
      (s: any) => s.updateVariantStock('v-1', { quantity: 0, operation: 'SET' }, admin, 'QA'),
      (s: any) => s.updateVariant('v-1', { sellingPrice: 1 }, admin, 'QA'),
      (s: any) => s.deleteVariant('v-1', admin, 'QA'),
      (s: any) => s.createVariant('p-1', { sku: 'X' }, admin, 'QA'),
    ]) {
      const { svc, variantRepo, kafka } = service('IN');
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      await expect(call(svc)).rejects.toThrow('This variant belongs to IN, not to the QA market.');
      expect(variantRepo.update).not.toHaveBeenCalled();
      expect(variantRepo.save).not.toHaveBeenCalled();
      expect(kafka.publish).not.toHaveBeenCalled();
    }
  });

  it('allows the same writes on a QA seller — the control', async () => {
    const { svc, variantRepo } = service('QA');
    await expect(
      svc.updateVariant('v-1', { sellingPrice: 199 }, admin, 'QA'),
    ).resolves.toMatchObject({ success: true });
    expect(variantRepo.update).toHaveBeenCalled();
  });

  it('leaves a global admin (no scope) free in any market', async () => {
    const { svc, variantRepo } = service('IN');
    await expect(svc.deleteVariant('v-1', admin)).resolves.toMatchObject({ success: true });
    expect(variantRepo.update).toHaveBeenCalledWith('v-1', { isActive: false });
  });

  it('refuses a variant whose seller has no market at all', async () => {
    const { svc } = service(null);
    await expect(svc.deleteVariant('v-1', admin, 'QA')).rejects.toThrow(
      'This variant belongs to every market, not to the QA market.',
    );
  });
});

describe('return decisions respect the return market', () => {
  it('refuses REFUNDED on an IN return for a QA admin and writes nothing', async () => {
    const { svc, returnRepo, kafka } = service('IN');
    await expect(
      svc.updateReturnStatus('r-1', { status: 'REFUNDED' }, admin, 'QA'),
    ).rejects.toThrow(ForbiddenException);
    expect(returnRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});
