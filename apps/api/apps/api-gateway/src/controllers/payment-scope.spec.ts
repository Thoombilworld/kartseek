import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { PaymentGatewayController } from './payment.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build() {
  const client = { send: vi.fn(() => of({ data: [] })) };
  const ctrl = Object.create(PaymentGatewayController.prototype) as PaymentGatewayController;
  Object.assign(ctrl, { paymentClient: client, logger: { error: vi.fn() } });
  (ctrl as any).send = (cmd: string, payload: any) => {
    client.send({ cmd }, payload);
    return Promise.resolve({ data: [] });
  };
  return { ctrl, client };
}

describe('/payments/admin/* carries the caller market', () => {
  it('forwards the locked market on all six reads', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(qaAdmin), {});
    await ctrl.getSettlementDashboard(req(qaAdmin), {});
    await ctrl.getSellerBalance(req(qaAdmin), 'seller-1');
    await ctrl.getFranchiseEarnings(req(qaAdmin), 'fr-1');
    await ctrl.getModuleRevenue(req(qaAdmin), 'marketplace', '2026-09-01', '2026-09-30');
    await ctrl.getReconciliation(req(qaAdmin), '2026-09-01');
    expect(client.send.mock.calls).toHaveLength(6);
    for (const call of client.send.mock.calls) {
      expect(call[1]).toMatchObject({ countryCode: 'QA', scope: 'QA' });
    }
  });

  it('refuses a locked admin who filters for another market', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getDashboard(req(qaAdmin), { countryCode: 'IN' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('leaves a global admin unscoped, and passes their own filter through', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), { countryCode: 'in' });
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('drops a client-supplied `scope` — only the gateway writes that key', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), { scope: 'IN', countryCode: 'QA' } as any);
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });
});
