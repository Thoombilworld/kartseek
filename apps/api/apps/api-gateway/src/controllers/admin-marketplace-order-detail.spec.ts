import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { AdminMarketplaceController } from './admin-marketplace.controller';

/**
 * `GET /admin/marketplace/orders/:orderNumber` reads the order, and says so or
 * 404s.
 *
 * What it used to do (whole-branch review, finding A-5): return
 * `{ data: { id, status: 'PENDING' } }` for **any** id — including one that
 * does not exist, and including one in another market — under a comment reading
 * "deliberately not 'improved': inventing a status for an order nobody read is
 * how this surface used to lie", and then inventing `PENDING`.
 *
 * It forwards to order-service with the caller's market, and
 * `OrderService.getOrderForAdmin` asserts `orders.region_code` against that
 * scope — so a locked admin reading another market's order gets 403 and a
 * missing number gets 404, instead of a plausible sentence about an order
 * nobody looked at.
 *
 * The command is `admin_get_order`, not the customer-facing `get_order_by_id`
 * this route first reached for: that one answers from the Redis projection when
 * it can, and an admin deciding on a cached status decides on the wrong one.
 */
const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({
  user,
  method: 'GET',
  originalUrl: '/admin/marketplace/orders/KS-1',
  headers: {},
});

function build(result: unknown = { id: 'KS-1', status: 'DELIVERED', regionCode: 'QA' }) {
  const order = vi.fn(() => Promise.resolve(result));
  const ctrl = Object.create(AdminMarketplaceController.prototype) as AdminMarketplaceController;
  Object.assign(ctrl, { logger: { error: vi.fn(), warn: vi.fn() }, orderClient: {} });
  (ctrl as any).sendTo = (_client: unknown, _service: string, cmd: string, payload: any) =>
    order({ cmd }, payload);
  (ctrl as any).actorId = () => 'admin-1';
  return { ctrl, order };
}

describe('the admin order detail reads the order', () => {
  it('asks order-service for the order rather than inventing one', async () => {
    const { ctrl, order } = build();
    const res = await (ctrl as any).getOrderById(req(globalAdmin), 'KS-1');
    expect(order.mock.calls).toHaveLength(1);
    expect(order.mock.calls[0][0]).toMatchObject({ cmd: 'admin_get_order' });
    expect(order.mock.calls[0][1]).toMatchObject({ orderNumber: 'KS-1' });
    expect(res).toMatchObject({ data: { id: 'KS-1', status: 'DELIVERED' } });
  });

  it('never answers with a fabricated PENDING status', async () => {
    const { ctrl } = build({ id: 'KS-9', status: 'CANCELLED' });
    const res = await (ctrl as any).getOrderById(req(globalAdmin), 'KS-9');
    expect((res as any).data.status).toBe('CANCELLED');
  });

  it('forwards the locked market as the scope, so the service can assert the row', async () => {
    const { ctrl, order } = build();
    await (ctrl as any).getOrderById(req(qaAdmin), 'KS-1');
    expect(order.mock.calls[0][1]).toMatchObject({ scope: 'QA' });
  });

  it('sends no scope for a global admin', async () => {
    const { ctrl, order } = build();
    await (ctrl as any).getOrderById(req(globalAdmin), 'KS-1');
    expect(order.mock.calls[0][1].scope).toBeUndefined();
  });

  it('refuses a locked admin who names another market, before any RPC', async () => {
    const { ctrl, order } = build();
    await expect(
      (ctrl as any).getOrderById({ ...req(qaAdmin), query: {} }, 'KS-1', { country: 'IN' }),
    ).rejects.toThrow(ForbiddenException);
    expect(order.mock.calls).toHaveLength(0);
  });

  it('lets the service failure through rather than reporting a status', async () => {
    const ctrl = Object.create(AdminMarketplaceController.prototype) as any;
    Object.assign(ctrl, { logger: { error: vi.fn(), warn: vi.fn() }, orderClient: {} });
    ctrl.sendTo = () => Promise.reject(new ForbiddenException('cross-market'));
    ctrl.actorId = () => 'admin-1';
    await expect(ctrl.getOrderById(req(qaAdmin), 'KS-1')).rejects.toThrow(ForbiddenException);
  });
});
