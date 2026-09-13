import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminPharmacyController } from './admin-pharmacy.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminPharmacyController(client as any), client };
};
const payloadOf = (client: { send: ReturnType<typeof vi.fn> }) => client.send.mock.calls[0][1];

describe('AdminPharmacyController market scope', () => {
  it("confines a locked admin's store list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getStores(req(qaAdmin), {});
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.pharmacy.stores' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before pharmacy-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getStores(req(qaAdmin), { countryCode: 'IN' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getStores(req(globalAdmin), { countryCode: 'in' });
    expect(payloadOf(client)).toMatchObject({ countryCode: 'IN' });
    expect(payloadOf(client).scope).toBeUndefined();
  });

  /**
   * Every one of the nineteen routes has to resolve a market and forward the
   * lock. Enumerated rather than sampled: seventeen of these commands had no
   * handler at all until M3, so none of them had ever been exercised, and a
   * route that forgets `scope` is a route that shows a locked admin every
   * market's rows.
   */
  it.each([
    ['dashboard', (c: AdminPharmacyController, r: any) => c.getDashboard(r, {})],
    ['stores', (c: AdminPharmacyController, r: any) => c.getStores(r, {})],
    ['products', (c: AdminPharmacyController, r: any) => c.getProducts(r, {})],
    ['orders', (c: AdminPharmacyController, r: any) => c.getOrders(r, {})],
    ['prescriptions', (c: AdminPharmacyController, r: any) => c.getPrescriptions(r, {})],
    ['verifications', (c: AdminPharmacyController, r: any) => c.getVerifications(r, {})],
    ['commissions', (c: AdminPharmacyController, r: any) => c.getCommissions(r, {})],
    ['settlements', (c: AdminPharmacyController, r: any) => c.getSettlements(r, {})],
    ['reports', (c: AdminPharmacyController, r: any) => c.getReports(r, {})],
    ['settings', (c: AdminPharmacyController, r: any) => c.getSettings(r, {})],
  ])('forwards the caller lock on the %s read', async (_name, call) => {
    const { ctrl, client } = build();
    await call(ctrl, req(qaAdmin));
    expect(payloadOf(client)).toMatchObject({ scope: 'QA', countryCode: 'QA' });
  });

  it.each([
    [
      'approve',
      'admin.pharmacy.approve',
      (c: AdminPharmacyController, r: any) => c.approveStore(r, 's-1'),
    ],
    [
      'approveProduct',
      'admin.pharmacy.approveProduct',
      (c: AdminPharmacyController, r: any) => c.approveProduct(r, 'p-1'),
    ],
    [
      'approvePrescription',
      'admin.pharmacy.approvePrescription',
      (c: AdminPharmacyController, r: any) => c.approvePrescription(r, 'rx-1'),
    ],
    [
      'storeDetail',
      'admin.pharmacy.storeDetail',
      (c: AdminPharmacyController, r: any) => c.getStoreById(r, 's-1'),
    ],
  ])('sends the lock with the %s decision', async (_name, cmd, call) => {
    const { ctrl, client } = build();
    await call(ctrl, req(qaAdmin));
    expect(client.send.mock.calls[0][0]).toEqual({ cmd });
    expect(payloadOf(client)).toMatchObject({ scope: 'QA' });
  });

  it('records the market and the acting admin on a suspension', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendStore(req(qaAdmin), 's-1', { reason: 'licence expired' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.pharmacy.suspend' },
      expect.objectContaining({
        id: 's-1',
        reason: 'licence expired',
        scope: 'QA',
        actorId: 'u-qa',
      }),
    );
  });

  /**
   * The explicit keys come AFTER the spread for a reason: a body carrying
   * `{"id": "<a store in another market>"}` used to retarget the decision.
   * `forbidNonWhitelisted` now refuses such a body outright, and this is the
   * second line of the same defence — so it is asserted rather than assumed.
   */
  it('cannot be retargeted by an id smuggled into the body', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendStore(req(qaAdmin), 's-1', {
      reason: 'licence expired',
      id: 's-in-another-market',
    } as never);
    expect(payloadOf(client)).toMatchObject({ id: 's-1' });
  });

  it('records the actor and the decision on a licence verification', async () => {
    const { ctrl, client } = build();
    await ctrl.verifyLicense(req(qaAdmin), 's-1', { verified: false, notes: 'illegible scan' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.pharmacy.verifyLicense' },
      expect.objectContaining({
        id: 's-1',
        verified: false,
        notes: 'illegible scan',
        scope: 'QA',
        actorId: 'u-qa',
      }),
    );
  });

  it('refuses a locked admin the globally managed category taxonomy', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.createCategory(req(qaAdmin), { name: 'Analgesics' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('still lets a locked admin read that taxonomy, unfiltered', async () => {
    const { ctrl, client } = build();
    await ctrl.getCategories(req(qaAdmin));
    expect(client.send).toHaveBeenCalledWith({ cmd: 'admin.pharmacy.categories' }, {});
  });

  it('forces a settings write into the caller market rather than the body one', async () => {
    const { ctrl, client } = build();
    await ctrl.updateSettings(req(globalAdmin), { countryCode: 'qa', minOrderAmount: 25 });
    expect(payloadOf(client)).toMatchObject({ countryCode: 'QA', minOrderAmount: 25 });
  });

  it('refuses a locked admin a settings write aimed at another market', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.updateSettings(req(qaAdmin), { countryCode: 'IN', minOrderAmount: 25 }),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });
});

describe('AdminPharmacyController surfaces a pharmacy-service outage', () => {
  it('does not answer a list with an empty page when the service is unreachable', async () => {
    const client = {
      send: vi.fn(() => {
        throw new Error('ECONNREFUSED');
      }),
    };
    const ctrl = new AdminPharmacyController(client as any);
    // The distinction the removed `fallback` argument destroyed: an outage has
    // to read differently from "this market has no pharmacies".
    await expect(ctrl.getStores(req(globalAdmin), {})).rejects.toThrow(
      'Pharmacy service unavailable',
    );
  });
});
