import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { MarketplaceGatewayController } from './marketplace.controller';
import { MARKETPLACE_PATTERNS } from '../contracts/marketplace.patterns';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const seller = { id: 'u-s', role: 'SELLER' };
const req = (user: object) => ({ user, method: 'PUT', originalUrl: '/x', headers: {} });

function build() {
  const client = { send: vi.fn(() => of({ success: true })) };
  const noop = { send: vi.fn(() => of({})) } as any;
  const ctrl = Object.create(
    MarketplaceGatewayController.prototype,
  ) as MarketplaceGatewayController;
  Object.assign(ctrl, { marketplaceClient: client, orderClient: noop, orders: noop });
  // `sendToMarketplace` is the one seam these routes share.
  (ctrl as any).sendToMarketplace = (cmd: string, payload: any) => {
    client.send({ cmd }, payload);
    return Promise.resolve({ success: true });
  };
  return { ctrl, client };
}

describe('MarketplaceGatewayController forwards scope on the admin-reachable writes', () => {
  it('sends the caller market as scope on a return decision', async () => {
    const { ctrl, client } = build();
    await ctrl.updateReturnStatus(req(qaAdmin), 'r-1', { status: 'REFUNDED' } as any);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS },
      expect.objectContaining({ id: 'r-1', status: 'REFUNDED', scope: 'QA' }),
    );
  });

  it('sends scope on every variant write', async () => {
    const { ctrl, client } = build();
    await ctrl.createVariant(req(qaAdmin), 'p-1', { sku: 'A' } as any);
    await ctrl.updateVariant(req(qaAdmin), 'v-1', { sellingPrice: 1 } as any);
    await ctrl.deleteVariant(req(qaAdmin), 'v-1');
    await ctrl.updateVariantStock(req(qaAdmin), 'v-1', { quantity: 0, operation: 'SET' } as any);
    expect(client.send.mock.calls).toHaveLength(4);
    for (const call of client.send.mock.calls) expect(call[1]).toMatchObject({ scope: 'QA' });
  });

  it('sends no scope for a global admin or a seller — the backend must not narrow them', async () => {
    for (const user of [globalAdmin, seller]) {
      const { ctrl, client } = build();
      await ctrl.deleteVariant(req(user), 'v-1');
      expect((client.send.mock.calls[0] as any)[1].scope).toBeUndefined();
    }
  });

  it('refuses a locked admin who names another market on a coupon', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.createCoupon(req(qaAdmin), { code: 'X', regionCode: 'IN' } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });
});

/**
 * The coupon reads and the two coupon writes the first round left unpinned.
 *
 * `GET coupons/:id/usage` is a read, so it fell outside the brief's four ids —
 * but it returns `customerId` and `discountApplied` per redemption, and
 * `assertOwns` admits every admin role, so it was the last coupon route on this
 * controller that crossed markets freely (review I-4).
 */
describe('MarketplaceGatewayController forwards scope on the coupon reads and edits', () => {
  it('sends the caller market as scope on a redemption-history read', async () => {
    const { ctrl, client } = build();
    await ctrl.getCouponUsage(req(qaAdmin), 'c-1');
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.GET_COUPON_USAGE },
      expect.objectContaining({ id: 'c-1', scope: 'QA' }),
    );
  });

  it('sends no scope on that read for a global admin or a seller', async () => {
    for (const user of [globalAdmin, seller]) {
      const { ctrl, client } = build();
      await ctrl.getCouponUsage(req(user), 'c-1');
      expect((client.send.mock.calls[0] as any)[1].scope).toBeUndefined();
    }
  });

  it('sends scope on the coupon edit and the coupon delete', async () => {
    const { ctrl, client } = build();
    await ctrl.updateCoupon(req(qaAdmin), 'c-1', { discountValue: 5 } as any);
    await ctrl.deleteCoupon(req(qaAdmin), 'c-1');
    expect(client.send.mock.calls).toHaveLength(2);
    for (const call of client.send.mock.calls) expect(call[1]).toMatchObject({ scope: 'QA' });
  });

  it('refuses a locked admin who renames a coupon into another market on an edit', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.updateCoupon(req(qaAdmin), 'c-1', { regionCode: 'IN' } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });
});
