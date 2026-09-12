import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';

/**
 * An order detail read is refused outside the caller's market.
 *
 * `getOrderByIdForRequester` bypasses its customer-ownership check for an
 * ADMIN / SUPER_ADMIN / STAFF role — that is the whole point of the bypass — so
 * for an administrator the market is the only thing left between them and
 * another market's customer order: name, address, items and what was paid.
 *
 * The gateway forwarded `scope` on `get_order_by_id` and this service dropped
 * it. The payload was dead only because `GET /admin/marketplace/orders/:id`
 * answered `{ id, status: 'PENDING' }` without asking anything (whole-branch
 * review, finding A-5). It asks now, so the row has to decide.
 */
function build(row: any) {
  const orderRepo = { findOne: vi.fn(async () => row) };
  const redis = {
    getJson: vi.fn(async () => null),
    setJson: vi.fn(async () => undefined),
  };
  const svc = Object.create(OrderService.prototype) as OrderService;
  Object.assign(svc, {
    orderRepo,
    redis,
    kafka: { publish: vi.fn(async () => undefined) },
    logger: { warn: vi.fn(), log: vi.fn(), error: vi.fn() },
  });
  return { svc, orderRepo };
}

const qaOrder = {
  orderNumber: 'KS-QA-1',
  customerId: 'cust-qa',
  regionCode: 'QA',
  status: 'DELIVERED',
  items: [],
  totalAmount: 100,
};
const inOrder = { ...qaOrder, orderNumber: 'KS-IN-1', customerId: 'cust-in', regionCode: 'IN' };

describe('get_order_by_id honours the market the gateway forwarded', () => {
  it('returns an order in the caller own market', async () => {
    const { svc } = build(qaOrder);
    await expect(
      svc.getOrderByIdForRequester('KS-QA-1', { userId: 'u-qa', role: 'admin' }, 'QA'),
    ).resolves.toMatchObject({ status: 'DELIVERED' });
  });

  it('refuses an order in another market, admin bypass or not', async () => {
    const { svc } = build(inOrder);
    await expect(
      svc.getOrderByIdForRequester('KS-IN-1', { userId: 'u-qa', role: 'admin' }, 'QA'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses an order with no market for a locked caller', async () => {
    const { svc } = build({ ...qaOrder, regionCode: null });
    await expect(
      svc.getOrderByIdForRequester('KS-QA-1', { userId: 'u-qa', role: 'admin' }, 'QA'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('is unchanged for a global admin and for an internal caller with no scope', async () => {
    const { svc } = build(inOrder);
    await expect(
      svc.getOrderByIdForRequester('KS-IN-1', { userId: 'u-g', role: 'super_admin' }),
    ).resolves.toMatchObject({ status: 'DELIVERED' });
    await expect(svc.getOrderByIdForRequester('KS-IN-1')).resolves.toBeDefined();
  });

  it('404s a missing order before it says anything about a market', async () => {
    const { svc } = build(null);
    await expect(
      svc.getOrderByIdForRequester('nope', { userId: 'u-qa', role: 'admin' }, 'QA'),
    ).rejects.toThrow(NotFoundException);
  });

  it('still blocks a customer reading somebody else order, in their own market', async () => {
    const { svc } = build(qaOrder);
    await expect(
      svc.getOrderByIdForRequester('KS-QA-1', { userId: 'someone-else', role: 'customer' }, 'QA'),
    ).rejects.toThrow(ForbiddenException);
  });
});
