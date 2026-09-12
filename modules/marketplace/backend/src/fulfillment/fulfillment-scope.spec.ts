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
  const couponRepo = {
    findOne: vi.fn(async () => ({
      id: 'c-1',
      code: 'SAVE500IN',
      sellerId: null,
      regionCode: 'IN',
      discountType: 'PERCENTAGE',
    })),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const couponUsageRepo = {
    find: vi.fn(async () => [{ id: 'u-1', customerId: 'cust-1', discountApplied: '25.00' }]),
  };
  const questionRepo = {
    findOne: vi.fn(async () => ({ id: 'q-1', productId: 'p-1' })),
  };
  const answerRepo = {
    findOne: vi.fn(async () => ({ id: 'a-1', questionId: 'q-1', isAccepted: false })),
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
    couponRepo,
    couponUsageRepo,
    questionRepo,
    answerRepo,
    kafka,
    dataSource,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, variantRepo, returnRepo, couponRepo, couponUsageRepo, answerRepo, kafka };
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

/**
 * R12 leftover (c): `acceptAnswer` forwarded only `answerId`, unscoped —
 * REACHABLE by a region-locked ADMIN (`@Roles(SELLER, ADMIN, SUPER_ADMIN)` at
 * the gateway), left by both R2 and R6. The attribution join is the same one
 * `reportMarket` already uses: answer → question → product → seller.
 */
describe('accepting an answer respects the owning seller market', () => {
  it("refuses an IN product's answer for a QA admin, and writes nothing", async () => {
    const { svc, answerRepo } = service('IN');
    await expect(svc.acceptAnswer('a-1', 'QA')).rejects.toThrow(ForbiddenException);
    await expect(svc.acceptAnswer('a-1', 'QA')).rejects.toThrow(
      'This answer belongs to IN, not to the QA market.',
    );
    expect(answerRepo.update).not.toHaveBeenCalled();
  });

  it('allows the same write on a QA seller — the control', async () => {
    const { svc, answerRepo } = service('QA');
    await expect(svc.acceptAnswer('a-1', 'QA')).resolves.toMatchObject({ success: true });
    expect(answerRepo.update).toHaveBeenCalledWith('a-1', { isAccepted: true });
  });

  it('leaves a global admin (no scope) free in any market', async () => {
    const { svc, answerRepo } = service('IN');
    await expect(svc.acceptAnswer('a-1')).resolves.toMatchObject({ success: true });
    expect(answerRepo.update).toHaveBeenCalledWith('a-1', { isAccepted: true });
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

/**
 * Coupon redemption history is a read of who bought what with whose discount —
 * `customerId` and `discountApplied` per row. `assertOwns` short-circuits for
 * every ADMIN role, so it answers "may this caller act on this seller's rows?"
 * and never "is this coupon in this caller's market?" (review I-4).
 */
describe('coupon redemption reads respect the coupon market', () => {
  it('refuses an IN coupon’s usage to a QA admin, and reads no redemption row', async () => {
    const { svc, couponUsageRepo } = service('IN');
    await expect(svc.getCouponUsageStats('c-1', admin, 'QA')).rejects.toThrow(ForbiddenException);
    await expect(svc.getCouponUsageStats('c-1', admin, 'QA')).rejects.toThrow(
      'This coupon belongs to IN, not to the QA market.',
    );
    expect(couponUsageRepo.find).not.toHaveBeenCalled();
  });

  it('allows a global admin and an in-market admin — the controls', async () => {
    const { svc: global } = service('IN');
    await expect(global.getCouponUsageStats('c-1', admin)).resolves.toMatchObject({
      couponId: 'c-1',
      totalRedemptions: 1,
    });
    const { svc: inScope, couponRepo } = service('IN');
    couponRepo.findOne.mockResolvedValue({
      id: 'c-2',
      code: 'SAVE50QA',
      sellerId: null,
      regionCode: 'QA',
      discountType: 'PERCENTAGE',
    } as any);
    await expect(inScope.getCouponUsageStats('c-2', admin, 'QA')).resolves.toMatchObject({
      couponId: 'c-2',
    });
  });
});

/**
 * `COUPON_WRITABLE` is the whitelist `updateCoupon` picks the patch from, and
 * three of its entries were not properties of `Coupon` at all — `name`,
 * `isAutoApply`, `isFirstOrderOnly` against the entity's `title`, `autoApply`,
 * `firstOrderOnly`. `pick` kept the allowed key and dropped the real one, so an
 * edit to any of the three answered `{ success: true }` and changed nothing
 * (review I-1). The admin edit DTO now validates all three, which is what
 * turned a silent drop into an advertised one.
 */
describe('a coupon edit persists every field the admin DTO accepts', () => {
  it('patches title, autoApply and firstOrderOnly under their real property names', async () => {
    const { svc, couponRepo } = service('IN');
    await expect(
      svc.updateCoupon(
        'c-1',
        { title: 'Diwali sale', autoApply: true, firstOrderOnly: true },
        admin,
      ),
    ).resolves.toMatchObject({ success: true });
    expect(couponRepo.update).toHaveBeenCalledWith('c-1', {
      title: 'Diwali sale',
      autoApply: true,
      firstOrderOnly: true,
    });
  });

  it('still refuses to rewrite the code, the owner or the redemption count', async () => {
    const { svc, couponRepo } = service('IN');
    await svc.updateCoupon(
      'c-1',
      { title: 'Kept', code: 'HIJACK', sellerId: 's-9', usedCount: 0, id: 'c-other' },
      admin,
    );
    expect(couponRepo.update).toHaveBeenCalledWith('c-1', { title: 'Kept' });
  });
});
