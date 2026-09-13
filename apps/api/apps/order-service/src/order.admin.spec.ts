import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';

/**
 * The two admin reads behind `GET /admin/marketplace/orders`.
 *
 * The gateway answered both inline — an empty page for the list, and for the
 * detail a row it made up — so "this market has no orders" and "no admin list
 * was ever built" were the same screen, for as long as the route existed.
 *
 * `order.orders` carries `region_code`, written at placement, so the market is
 * a column predicate on the list and a row assertion on the detail. Both are
 * asserted here against the repository the service is handed, because the only
 * thing that makes a scope real is the query it produces.
 */
function makeService(rows: any[]) {
  const captured: any = {};
  const orderRepo: any = {
    findAndCount: vi.fn(async (opts: any) => {
      captured.where = opts.where;
      captured.take = opts.take;
      captured.skip = opts.skip;
      return [rows, rows.length];
    }),
    findOne: vi.fn(
      async (opts: any) => rows.find((r) => r.orderNumber === opts.where.orderNumber) ?? null,
    ),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const redis: any = { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) };
  const kafka: any = { publish: vi.fn(async () => undefined) };
  return { svc: new OrderService(orderRepo, redis, kafka), captured, orderRepo, redis };
}

const row = (orderNumber: string, regionCode: string | null) => ({
  id: `id-${orderNumber}`,
  orderNumber,
  customerId: 'c1',
  sellerId: 's1',
  items: [],
  subtotal: 10,
  deliveryFee: 0,
  discount: 0,
  walletDeduction: 0,
  totalAmount: 10,
  deliveryAddress: 'x',
  serviceType: 'marketplace',
  paymentMethod: 'COD',
  status: 'PENDING',
  escrowStatus: 'PENDING',
  couponCode: null,
  couponId: null,
  regionCode,
  currency: 'QAR',
  notes: null,
  estimatedDeliveryAt: null,
  placedAt: new Date(),
  updatedAt: new Date(),
});

describe('OrderService admin reads', () => {
  it('narrows the admin list to the scoped market and ignores a conflicting request', async () => {
    const { svc, captured } = makeService([row('ORD-1', 'QA')]);
    await svc.listOrdersForAdmin({ page: 1, limit: 20, region: 'IN', scope: 'QA' });
    expect(captured.where).toMatchObject({ regionCode: 'QA' });
  });

  it("applies a global admin's requested market, and none when they ask for none", async () => {
    const a = makeService([row('ORD-1', 'IN')]);
    await a.svc.listOrdersForAdmin({ page: 1, limit: 20, region: 'in' });
    expect(a.captured.where).toMatchObject({ regionCode: 'IN' });
    const b = makeService([row('ORD-1', 'IN')]);
    await b.svc.listOrdersForAdmin({ page: 1, limit: 20 });
    expect(b.captured.where.regionCode).toBeUndefined();
  });

  it('refuses an order from another market on the detail read', async () => {
    const { svc } = makeService([row('ORD-9', 'IN')]);
    await expect(svc.getOrderForAdmin('ORD-9', 'QA')).rejects.toThrow(ForbiddenException);
  });

  it('refuses an order with no market to a scoped admin, and 404s an unknown id', async () => {
    const { svc } = makeService([row('ORD-7', null)]);
    await expect(svc.getOrderForAdmin('ORD-7', 'QA')).rejects.toThrow(ForbiddenException);
    await expect(svc.getOrderForAdmin('ORD-nope', undefined)).rejects.toThrow(NotFoundException);
  });

  it('keeps the market predicate on every leg of a search, not just the first', async () => {
    // `search` turns the `where` into an array of alternatives, and an
    // alternative that forgets the market is a leak in the shape of a filter:
    // typing a customer id would return that customer's orders in every market.
    const { svc, captured } = makeService([row('ORD-1', 'QA')]);
    await svc.listOrdersForAdmin({ page: 1, limit: 20, search: 'ORD', scope: 'QA' });
    expect(Array.isArray(captured.where)).toBe(true);
    for (const leg of captured.where) expect(leg).toHaveProperty('regionCode', 'QA');
  });

  it('clamps the page size rather than letting a caller ask for the whole table', async () => {
    const { svc, captured } = makeService([]);
    await svc.listOrdersForAdmin({ page: 3, limit: 5000 });
    expect(captured.take).toBe(100);
    expect(captured.skip).toBe(200);
  });

  it('reads the detail from the table, never the cache', async () => {
    // `getOrderById` answers from Redis when it can; an admin taking a decision
    // on a cached status takes it on the wrong one. The cache is not consulted.
    const { svc, redis, orderRepo } = makeService([row('ORD-5', 'QA')]);
    const order = await svc.getOrderForAdmin('ORD-5', 'QA');
    expect(redis.getJson).not.toHaveBeenCalled();
    expect(orderRepo.findOne).toHaveBeenCalled();
    expect(order).toMatchObject({ orderNumber: 'ORD-5', regionCode: 'QA' });
  });

  it("refuses a global admin's unreadable ?country= rather than widening the list", async () => {
    // `marketPredicate` ignores an unreadable REQUESTED value, which on an
    // admin filter means no predicate at all — every market's orders under the
    // heading of the one that was typed. `requireMarket` refuses it instead.
    const { svc, orderRepo } = makeService([row('ORD-1', 'QA')]);
    await expect(svc.listOrdersForAdmin({ page: 1, limit: 20, region: 'QQ' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(orderRepo.findAndCount).not.toHaveBeenCalled();
  });

  it('refuses a scope that is not a market this platform knows', async () => {
    // A lock nobody can read must not widen to every market: `marketPredicate`
    // refuses it rather than dropping the predicate.
    const { svc } = makeService([row('ORD-1', 'QA')]);
    await expect(
      svc.listOrdersForAdmin({ page: 1, limit: 20, scope: 'NOT-A-COUNTRY' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
