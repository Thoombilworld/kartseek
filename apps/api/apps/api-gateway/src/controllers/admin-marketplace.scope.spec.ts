import { describe, it, expect, vi } from 'vitest';
import {
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AdminMarketplaceController } from './admin-marketplace.controller';
import { MARKETPLACE_PATTERNS } from '../contracts/marketplace.patterns';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build(sendImpl: (cmd: any, payload: any) => any) {
  const client = { send: vi.fn((cmd, payload) => of(sendImpl(cmd, payload))) };
  const noop = { send: vi.fn(() => of({})) };
  const wallet = { send: vi.fn(() => of({ balance: 10 })) };
  const loyalty = { send: vi.fn(() => of({ points: 10 })) };
  const ctrl = new AdminMarketplaceController(
    {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      // Returns a promise: the seller-decision path drops two cache keys with
      // `.catch()` on the result, which a bare `vi.fn()` would make a TypeError.
      del: vi.fn(async () => 1),
      delPattern: vi.fn(async () => undefined),
      getJson: vi.fn(async () => null),
      setJson: vi.fn(async () => undefined),
    } as any, // redis
    { publish: vi.fn(async () => undefined) } as any, // kafka
    client as any, // marketplace
    { update: vi.fn(async () => undefined), findOne: vi.fn(async () => null) } as any, // userRepo
    noop as any, // commission
    noop as any, // payout
    wallet as any, // wallet
    loyalty as any, // loyalty
    noop as any, // order
    noop as any, // refund
  );
  return { ctrl, client, wallet, loyalty };
}

describe('AdminMarketplaceController — sellers and products', () => {
  it('sends the seller list filters as an object with the resolved market', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getSellers(req(globalAdmin), 2, 25, 'acme', 'PENDING', 'in');
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS },
      { page: 2, limit: 25, search: 'acme', status: 'PENDING', region: 'IN', scope: undefined },
    );
  });

  it("confines a locked admin's seller list and refuses another market", async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getSellers(req(qaAdmin), 1, 20, undefined, undefined, undefined);
    expect(client.send.mock.calls[0][1]).toMatchObject({ region: 'QA', scope: 'QA' });
    await expect(ctrl.getSellers(req(qaAdmin), 1, 20, undefined, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('asks for PENDING sellers on the pending route', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getPendingSellers(req(globalAdmin), undefined);
    expect(client.send.mock.calls[0][1]).toMatchObject({ status: 'PENDING' });
  });

  it('sends the product list as an object, not an array', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getProducts(req(globalAdmin), 3, 10, 'APPROVED', undefined);
    const payload = client.send.mock.calls[0][1];
    expect(Array.isArray(payload)).toBe(false);
    expect(payload).toMatchObject({ page: 3, limit: 10, status: 'APPROVED' });
  });

  it('propagates an outage instead of inventing a seller', async () => {
    const { ctrl } = build(() => {
      throw new HttpException('Marketplace service unavailable', 503);
    });
    await expect(
      ctrl.getSellerById(req(globalAdmin), '11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(HttpException);
  });

  it('refuses a locked admin a seller from another market after loading it', async () => {
    const { ctrl } = build((cmd) =>
      cmd.cmd === MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_BY_ID
        ? { id: 's-in', regionCode: 'IN' }
        : {},
    );
    await expect(
      ctrl.getSellerById(req(qaAdmin), '11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('carries scope and the real actor on seller decisions', async () => {
    const { ctrl, client } = build(() => ({ success: true, sellerId: 's-1' }));
    await ctrl.approveSeller(req(qaAdmin), '11111111-1111-4111-8111-111111111111', {});
    const [cmd, payload] = client.send.mock.calls.find(
      ([c]) => c.cmd === MARKETPLACE_PATTERNS.ADMIN_APPROVE_SELLER,
    )!;
    expect(cmd).toBeTruthy();
    expect(payload).toMatchObject({ scope: 'QA', adminId: 'u-qa' });
  });

  it('refuses a locked admin a product whose seller is in another market', async () => {
    const { ctrl } = build((cmd) =>
      cmd.cmd === MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCT_BY_ID
        ? { id: 'p-in', sellerRegionCode: 'IN' }
        : {},
    );
    await expect(
      ctrl.getProductById(req(qaAdmin), '22222222-2222-4222-8222-222222222222'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('carries scope and the real actor on product decisions', async () => {
    const { ctrl, client } = build(() => ({ success: true }));
    await ctrl.approveProduct(req(qaAdmin), '22222222-2222-4222-8222-222222222222');
    await ctrl.rejectProduct(req(qaAdmin), '22222222-2222-4222-8222-222222222222', {
      reason: 'counterfeit',
    });
    for (const call of client.send.mock.calls) {
      expect(call[1]).toMatchObject({ scope: 'QA', adminId: 'u-qa' });
    }
  });

  it('refuses a locked admin a wallet adjustment before the money moves', async () => {
    const { ctrl, wallet } = build(() => ({}));
    await expect(
      ctrl.adjustWalletBalance(req(qaAdmin), {
        userId: 'u-1',
        amount: 500,
        reason: 'goodwill',
        type: 'CREDIT',
      }),
    ).rejects.toThrow(ForbiddenException);
    // Neither wallet-service nor loyalty-service reads `scope`, so forwarding it
    // would have been enforcement in name only: the refusal has to happen here,
    // and nothing may be sent.
    expect(wallet.send).not.toHaveBeenCalled();
  });

  it('lets a global admin adjust a wallet', async () => {
    const { ctrl, wallet } = build(() => ({}));
    await ctrl.adjustWalletBalance(req(globalAdmin), {
      userId: 'u-1',
      amount: 500,
      reason: 'goodwill',
      type: 'CREDIT',
    });
    expect(wallet.send).toHaveBeenCalled();
  });

  it('refuses a locked admin the other three balance routes too', async () => {
    const { ctrl, wallet, loyalty } = build(() => ({}));
    await expect(
      ctrl.freezeWallet(req(qaAdmin), { userId: 'u-1', reason: 'fraud' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      ctrl.unfreezeWallet(req(qaAdmin), { userId: 'u-1', reason: 'cleared' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      ctrl.adjustLoyaltyPoints(req(qaAdmin), { userId: 'u-1', points: 100, reason: 'goodwill' }),
    ).rejects.toThrow(ForbiddenException);
    expect(wallet.send).not.toHaveBeenCalled();
    expect(loyalty.send).not.toHaveBeenCalled();
  });

  it('reads a loyalty balance from the service rather than inventing one', async () => {
    const { ctrl, loyalty } = build(() => ({}));
    await expect(ctrl.getUserLoyalty(req(globalAdmin), 'u-1')).resolves.toMatchObject({
      points: 10,
    });
    expect(loyalty.send).toHaveBeenCalledWith({ cmd: 'get_loyalty_points' }, { userId: 'u-1' });
  });

  it('says finance is unavailable rather than reporting an empty queue', async () => {
    // `sendToPayout` / `sendToCommission` swallow the RPC failure and answer
    // null. Every caller used to turn that null into `{ data: [], total: 0 }`,
    // so an outage was indistinguishable from "nothing to approve today".
    const down = { send: vi.fn(() => throwError(() => new Error('ECONNREFUSED'))) };
    const ctrl = new AdminMarketplaceController(
      { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) } as any,
      { publish: vi.fn(async () => undefined) } as any,
      { send: vi.fn(() => of({})) } as any,
      {} as any,
      down as any, // commission
      down as any, // payout
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(ctrl.getPayouts(req(globalAdmin))).rejects.toThrow(ServiceUnavailableException);
    await expect(ctrl.getPayoutStats(req(globalAdmin))).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(ctrl.getCommissions(req(globalAdmin))).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(ctrl.getCommissionRateCard(req(globalAdmin))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('refuses a locked admin any write to the shared catalogue taxonomy', async () => {
    const { ctrl, client } = build(() => ({ success: true }));
    await expect(ctrl.createCategory(req(qaAdmin), { name: 'Spices' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
    // The read is deliberately global: taxonomy is shared by every market.
    await ctrl.getCategories();
    expect(client.send).toHaveBeenCalledTimes(1);
  });
});

/**
 * Notifications are addressed to a user, so the request has to carry one — and
 * that user is the whole scope.
 *
 * `marketplace_notifications.userId` is NOT NULL, and the service used to ask
 * for rows with no user at all — a query that could never match, which is why it
 * fell through to four invented rows on every call. The actor comes from the
 * verified token here, never from the caller.
 */
describe('AdminMarketplaceController — notifications', () => {
  it('sends the acting administrator as the owner of the list, and nothing else', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0, unreadCount: 0 }));
    await ctrl.getNotifications(req(globalAdmin));
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.ADMIN_GET_NOTIFICATIONS },
      // No `scope` and no `region`: filtering a personal inbox by market could
      // only ever hide rows addressed to the reader.
      { userId: 'u-g' },
    );
  });

  /**
   * The route used to `refuseLockedAdmin(req, 'platform notifications')`, which
   * was right while the list was the platform's. Once it became each
   * administrator's own inbox, that refusal denied a regional admin their own
   * messages — and the console told them the rows "belong to every market",
   * which by then was false.
   */
  it('answers a market-locked administrator with their own inbox', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0, unreadCount: 0 }));
    await expect(ctrl.getNotifications(req(qaAdmin))).resolves.toMatchObject({
      data: [],
      total: 0,
      unreadCount: 0,
    });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.ADMIN_GET_NOTIFICATIONS },
      { userId: 'u-qa' },
    );
  });

  it('still refuses a locked admin who names another market', async () => {
    // `scopeOf` is still called — it is how a locked caller asking for someone
    // else's market is refused, and the market-scope regression scan requires
    // every /admin handler to resolve one.
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await expect(ctrl.getNotifications(req(qaAdmin), 'IN')).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  /**
   * `actorId()` falls back to the string `'unknown'`, so forwarding it would
   * fetch the (empty) inbox of a user by that name — "nothing to report" where
   * the truth is "we do not know who you are". The service's own
   * `BadRequestException` is unreachable from here, so the refusal is the
   * gateway's.
   */
  it.each([
    ['no user at all', undefined],
    ['a user with no id', { role: 'ADMIN' }],
  ])('refuses a token that does not identify anyone (%s)', async (_label, user) => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await expect(
      ctrl.getNotifications({ user, method: 'GET', originalUrl: '/x', headers: {} }),
    ).rejects.toThrow(UnauthorizedException);
    expect(client.send).not.toHaveBeenCalled();
  });
});

/**
 * The admin coupon writes.
 *
 * These three routes are new: the console read coupons through this controller
 * and wrote them through the seller route on `MarketplaceGatewayController`.
 * Two things have to travel with each write, and the first was easy to miss —
 * marketplace-service checks *ownership* (`assertOwns`, which fails closed on a
 * missing actor) before it checks the *market*, so a payload carrying only
 * `scope` is refused for every admin, global ones included.
 */
describe('AdminMarketplaceController — coupon writes', () => {
  const body = {
    code: 'QASUMMER25',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    validFrom: '2026-09-01T00:00:00.000Z',
    validUntil: '2026-12-01T00:00:00.000Z',
  } as any;

  it('forces a locked admin’s coupon into their own market and identifies them', async () => {
    const { ctrl, client } = build(() => ({ id: 'c-1' }));
    await ctrl.createCoupon(req(qaAdmin), { ...body });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.CREATE_COUPON },
      expect.objectContaining({
        code: 'QASUMMER25',
        regionCode: 'QA',
        scope: 'QA',
        _actor: { ownerId: 'u-qa', role: 'ADMIN', regionCode: 'QA' },
      }),
    );
  });

  it('leaves a global admin unscoped, and market-agnostic when they name no market', async () => {
    const { ctrl, client } = build(() => ({ id: 'c-1' }));
    await ctrl.createCoupon(req(globalAdmin), { ...body });
    expect(client.send.mock.calls[0][1]).toMatchObject({ regionCode: null, scope: undefined });
    expect(client.send.mock.calls[0][1]._actor).toMatchObject({ ownerId: 'u-g' });
  });

  it('refuses a locked admin who issues a coupon for another market', async () => {
    const { ctrl, client } = build(() => ({ id: 'c-1' }));
    await expect(ctrl.createCoupon(req(qaAdmin), { ...body, regionCode: 'IN' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('sends the actor and the scope on an edit — the console sends only isActive', async () => {
    const { ctrl, client } = build(() => ({ success: true }));
    await ctrl.updateCoupon(req(qaAdmin), 'c-1', { isActive: false } as any);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.UPDATE_COUPON },
      expect.objectContaining({
        id: 'c-1',
        dto: { isActive: false, regionCode: 'QA' },
        scope: 'QA',
        _actor: expect.objectContaining({ ownerId: 'u-qa' }),
      }),
    );
  });

  it('sends the actor and the scope on a delete', async () => {
    const { ctrl, client } = build(() => ({ success: true }));
    await ctrl.deleteCoupon(req(qaAdmin), 'c-1');
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.DELETE_COUPON },
      expect.objectContaining({
        id: 'c-1',
        scope: 'QA',
        _actor: expect.objectContaining({ ownerId: 'u-qa' }),
      }),
    );
  });
});
