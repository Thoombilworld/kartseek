import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminMarketplaceController } from './admin-marketplace.controller';
import { MARKETPLACE_PATTERNS } from '../contracts/marketplace.patterns';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build(sendImpl: (cmd: any, payload: any) => any) {
  const client = { send: vi.fn((cmd, payload) => of(sendImpl(cmd, payload))) };
  const noop = { send: vi.fn(() => of({})) };
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
    noop as any, // wallet
    noop as any, // loyalty
    noop as any, // order
    noop as any, // refund
  );
  return { ctrl, client };
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
