import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { AdminMarketplaceController } from './admin-marketplace.controller';

/**
 * The money routes that flipped from refusing a locked admin to filtering.
 *
 * Six payout routes called `refuseLockedAdmin` before any RPC, because
 * `payout.payouts` carried no market and forwarding `scope` to a service that
 * ignored it would have been enforcement in name only (2026-09-12 audit §3(b) /
 * AUD2-089). The column exists now and payout-service predicates on it, so the
 * refusal is gone — and this spec is what proves the routes actually forward
 * the lock rather than simply having lost their guard.
 *
 * Modelled on `payment-scope.spec.ts`: the same shape of harness, the same
 * three questions (locked forwards, locked naming another market is refused,
 * global is unscoped).
 */
const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build(payoutResult: unknown = { data: [] }) {
  const payout = vi.fn(() => Promise.resolve(payoutResult));
  const marketplace = vi.fn(() => Promise.resolve({ data: [] }));
  const ctrl = Object.create(AdminMarketplaceController.prototype) as AdminMarketplaceController;
  Object.assign(ctrl, { logger: { error: vi.fn(), warn: vi.fn() } });
  (ctrl as any).sendToPayout = (cmd: string, payload: any) => payout({ cmd }, payload);
  (ctrl as any).sendToMarketplace = (cmd: string, payload: any) => marketplace({ cmd }, payload);
  (ctrl as any).actorId = () => 'admin-1';
  return { ctrl, payout, marketplace };
}

describe('the payout routes forward the caller market instead of refusing', () => {
  it('forwards the locked market on all six flipped routes', async () => {
    const { ctrl, payout } = build();
    const c = ctrl as any;
    await c.getPayouts(req(qaAdmin));
    await c.getPayoutStats(req(qaAdmin));
    await c.approvePayout(req(qaAdmin), 'PAYOUT-1');
    await c.processPayout(req(qaAdmin), 'PAYOUT-1');
    await c.retryPayout(req(qaAdmin), 'PAYOUT-1');
    await c.postProcessPayout(req(qaAdmin), 'PAYOUT-1');
    // Six handlers, six sends: the POST alias delegates to the PATCH handler
    // rather than sending on its own, which is the point of the alias — one
    // behaviour and one place to change it.
    expect(payout.mock.calls).toHaveLength(6);
    for (const call of payout.mock.calls) {
      expect(call[1]).toMatchObject({ scope: 'QA' });
    }
  });

  it('sends no scope for a global admin, and passes their own filter through', async () => {
    const { ctrl, payout } = build();
    const c = ctrl as any;
    await c.getPayouts(req(globalAdmin), undefined, 1, 20, 'in');
    expect(payout.mock.calls[0][1]).toMatchObject({ region: 'IN' });
    expect(payout.mock.calls[0][1].scope).toBeUndefined();

    payout.mockClear();
    await c.getPayouts(req(globalAdmin));
    expect(payout.mock.calls[0][1].scope).toBeUndefined();
    expect(payout.mock.calls[0][1].region).toBeUndefined();
  });

  it('refuses a locked admin who filters for another market, before any RPC', async () => {
    const { ctrl, payout } = build();
    await expect((ctrl as any).getPayouts(req(qaAdmin), undefined, 1, 20, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(payout).not.toHaveBeenCalled();
  });

  it('reports an unreachable payout-service as unavailable, never as an empty queue', async () => {
    // `null` is how `sendToPayout` says "could not ask". An empty payout queue
    // is a decision an admin acts on — "nothing to approve today" — and an
    // outage must not be able to say that.
    const { ctrl } = build(null);
    await expect((ctrl as any).getPayouts(req(qaAdmin))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('lets an authorisation decision from the service through as itself', async () => {
    // payout-service answers 403 for a cross-market payout. `sendToPayout` used
    // to swallow every failure into `null`, which the route then reported as
    // `503 Payouts are temporarily unavailable` — an authorisation denial
    // reported as an outage, sending an operator to check a healthy service.
    const { ctrl } = build();
    (ctrl as any).sendToPayout = () =>
      Promise.reject(new ForbiddenException('This payout belongs to IN, not to the QA market.'));
    await expect((ctrl as any).approvePayout(req(qaAdmin), 'PAYOUT-1')).rejects.toThrow(
      'This payout belongs to IN, not to the QA market.',
    );
  });
});

/**
 * AUD2-086: one answer about a seller's spendable money.
 *
 * `seller-wallets` answered from marketplace-service, which has no wallet table
 * and recomputed a balance from delivered orders at a hardcoded 10% commission,
 * a 15% "pending settlement" and a 70/30 withdrawn/available split. The payout
 * queue beside it read `payout.seller_wallets`. Two surfaces, two answers, same
 * seller's money.
 */
describe('seller wallets read the table the money lives in', () => {
  it('takes the balances from payout-service and only the names from the catalogue', async () => {
    const { ctrl, payout, marketplace } = build({
      data: [{ sellerId: 'S1', regionCode: 'QA', availableBalance: 250, escrowBalance: 10 }],
      total: 1,
      summary: { totalAvailable: 250, totalEscrow: 10 },
    });
    marketplace.mockResolvedValue({ data: [{ sellerId: 'S1', sellerName: 'Doha Electronics' }] });

    const out: any = await (ctrl as any).getSellerWallets(req(qaAdmin));
    expect(payout.mock.calls[0][1]).toMatchObject({ scope: 'QA' });
    expect(out.data[0]).toMatchObject({
      sellerId: 'S1',
      availableBalance: 250,
      sellerName: 'Doha Electronics',
    });
    // Nothing recomputed, so none of the invented fields can come back.
    for (const invented of ['commission', 'pendingSettlement', 'totalWithdrawn', 'lastPayoutAt']) {
      expect(out.data[0][invented]).toBeUndefined();
    }
  });

  it('still lists the balances when the catalogue is unreachable, without names', async () => {
    const { ctrl, marketplace } = build({
      data: [{ sellerId: 'S1', availableBalance: 250 }],
      total: 1,
    });
    marketplace.mockRejectedValue(new Error('marketplace-service unavailable'));
    const out: any = await (ctrl as any).getSellerWallets(req(qaAdmin));
    expect(out.data[0]).toMatchObject({ availableBalance: 250, sellerName: null });
  });

  it('says unavailable rather than reporting every seller as holding nothing', async () => {
    const { ctrl } = build(null);
    await expect((ctrl as any).getSellerWallets(req(globalAdmin))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
