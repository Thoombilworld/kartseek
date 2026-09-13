import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AdminMarketplaceController } from './admin-marketplace.controller';
import { MARKETPLACE_PATTERNS } from '../contracts/marketplace.patterns';

/**
 * The five admin money reads: orders, one order, returns, refunds, payments.
 *
 * All five answered inline. `orders` and `returns` were `{ data: [], total: 0 }`,
 * `payments` was that plus the caption "Payment gateway config", and `refunds`
 * called refund-service but refused every region-locked administrator first,
 * because a refund carried no market to narrow the queue by. Nine console pages
 * read the first of those, so "this market has no orders" and "nobody built
 * this" were the same screen for as long as the route existed.
 *
 * What is asserted here is the boundary, not the query: that the caller's
 * market leaves this controller on every one of the five commands, that a
 * locked admin naming another market is refused BEFORE any RPC, and that a
 * service outage arrives as a 503 rather than as an empty page — an empty page
 * is indistinguishable from an answer, which is the whole failure.
 */
const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build() {
  const page = { data: [], total: 0, page: 1, limit: 20 };
  const marketplaceClient = { send: vi.fn(() => of(page)) };
  const orderClient = { send: vi.fn(() => of(page)) };
  const refundClient = { send: vi.fn(() => of(page)) };
  const paymentClient = { send: vi.fn(() => of(page)) };
  const noop = { send: vi.fn(() => of({})) };
  const redis = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => 1),
    delPattern: vi.fn(async () => undefined),
    getJson: vi.fn(async () => null),
    setJson: vi.fn(async () => undefined),
  };
  const ctrl = new AdminMarketplaceController(
    redis as any,
    { publish: vi.fn(async () => undefined) } as any,
    marketplaceClient as any,
    { update: vi.fn(async () => undefined), findOne: vi.fn(async () => null) } as any,
    noop as any, // commission
    noop as any, // payout
    noop as any, // wallet
    noop as any, // loyalty
    orderClient as any,
    refundClient as any,
    paymentClient as any,
  );
  return { ctrl, marketplaceClient, orderClient, refundClient, paymentClient };
}

describe('the admin order list is a real read', () => {
  it('forwards the order list to order-service with the locked market', async () => {
    const { ctrl, orderClient } = build();
    await ctrl.getOrders(req(qaAdmin), 1, 20, undefined, undefined, undefined);
    expect(orderClient.send).toHaveBeenCalledWith(
      { cmd: 'admin_list_orders' },
      expect.objectContaining({ region: 'QA', scope: 'QA', page: 1, limit: 20 }),
    );
  });

  it('sends no scope for a global admin and passes their chosen market through', async () => {
    const { ctrl, orderClient } = build();
    await ctrl.getOrders(req(globalAdmin), 2, 50, 'DELIVERED', 'ORD', 'in');
    expect(orderClient.send.mock.calls[0][1]).toMatchObject({
      page: 2,
      limit: 50,
      status: 'DELIVERED',
      search: 'ORD',
      region: 'IN',
      scope: undefined,
    });
  });

  it('refuses a locked admin who names another market, before any RPC', async () => {
    const { ctrl, orderClient } = build();
    await expect(ctrl.getOrders(req(qaAdmin), 1, 20, undefined, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('propagates an order-service outage as 503 rather than an empty page', async () => {
    const { ctrl, orderClient } = build();
    orderClient.send.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));
    await expect(ctrl.getOrders(req(globalAdmin), 1, 20)).rejects.toMatchObject({ status: 503 });
  });

  it('returns the rows the service gave it, unwrapped and uninvented', async () => {
    const { ctrl, orderClient } = build();
    orderClient.send.mockReturnValueOnce(
      of({ data: [{ orderNumber: 'ORD-1', regionCode: 'QA' }], total: 1, page: 1, limit: 20 }),
    );
    const res: any = await ctrl.getOrders(req(qaAdmin), 1, 20);
    expect(res.data).toHaveLength(1);
    expect(res.total).toBe(1);
  });
});

describe('the admin order detail asks order-service', () => {
  it('no longer fabricates an order on the detail route', async () => {
    const { ctrl, orderClient } = build();
    await ctrl.getOrderById(req(globalAdmin), 'ORD-1');
    expect(orderClient.send).toHaveBeenCalledWith(
      { cmd: 'admin_get_order' },
      { orderNumber: 'ORD-1', scope: undefined },
    );
  });

  it('carries the locked market so the row itself can refuse', async () => {
    const { ctrl, orderClient } = build();
    await ctrl.getOrderById(req(qaAdmin), 'ORD-1');
    expect(orderClient.send.mock.calls[0][1]).toMatchObject({ scope: 'QA' });
  });
});

describe('the admin returns queue is scoped at the gateway too', () => {
  it('forwards page, status and the resolved market to marketplace-service', async () => {
    const { ctrl, marketplaceClient } = build();
    await ctrl.getReturns(req(qaAdmin), 1, 20, 'REQUESTED');
    expect(marketplaceClient.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.GET_RETURNS },
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: 'REQUESTED',
        region: 'QA',
        scope: 'QA',
      }),
    );
  });

  it('refuses a locked admin who names another market, before any RPC', async () => {
    const { ctrl, marketplaceClient } = build();
    await expect(ctrl.getReturns(req(qaAdmin), 1, 20, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(marketplaceClient.send).not.toHaveBeenCalled();
  });
});

describe('the refunds queue is open to a regional admin now that refunds carry a market', () => {
  it('lets a locked admin read the refunds queue and sends their market with it', async () => {
    const { ctrl, refundClient } = build();
    await ctrl.getRefunds(req(qaAdmin), 1, 20, undefined);
    expect(refundClient.send.mock.calls[0][0]).toMatchObject({ cmd: 'get_pending_refunds' });
    expect(refundClient.send.mock.calls[0][1]).toMatchObject({ scope: 'QA', region: 'QA' });
  });

  it('still refuses a locked admin who names another market', async () => {
    const { ctrl, refundClient } = build();
    await expect(ctrl.getRefunds(req(qaAdmin), 1, 20, 'IN')).rejects.toThrow(ForbiddenException);
    expect(refundClient.send).not.toHaveBeenCalled();
  });
});

describe('the admin payments list is a real read', () => {
  it('forwards to payment-service with the resolved market', async () => {
    const { ctrl, paymentClient } = build();
    await ctrl.getPayments(req(qaAdmin), 1, 20, 'SUCCESS');
    expect(paymentClient.send).toHaveBeenCalledWith(
      { cmd: 'admin_list_payments' },
      expect.objectContaining({ page: 1, limit: 20, status: 'SUCCESS', region: 'QA', scope: 'QA' }),
    );
  });

  it('propagates a payment-service outage as 503 rather than an empty page', async () => {
    const { ctrl, paymentClient } = build();
    paymentClient.send.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));
    await expect(ctrl.getPayments(req(globalAdmin), 1, 20)).rejects.toMatchObject({ status: 503 });
  });

  it('refuses a locked admin who names another market, before any RPC', async () => {
    const { ctrl, paymentClient } = build();
    await expect(ctrl.getPayments(req(qaAdmin), 1, 20, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(paymentClient.send).not.toHaveBeenCalled();
  });
});
