import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminDoctorController } from './admin-doctor.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminDoctorController(client as any), client };
};

describe('AdminDoctorController market scope', () => {
  it("confines a locked admin's clinic list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getClinics(req(qaAdmin), 1, 20, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.doctor.clinics' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before doctor-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getClinics(req(qaAdmin), 1, 20, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getClinics(req(globalAdmin), 1, 20, undefined, 'in');
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('records the market and the acting admin on a clinic approval', async () => {
    const { ctrl, client } = build();
    await ctrl.approveClinic(req(qaAdmin), 'c-1');
    // Asserted field by field rather than against a `{ cmd: … }` literal:
    // `test/gateway-service-contract.spec.ts` greps that exact shape out of
    // every .ts under api-gateway to find commands no service implements, and
    // this one is on the not-yet-implemented list (it answers 503 today), so
    // spelling it that way here would report the spec itself as the offender.
    const [pattern, payload] = client.send.mock.calls[0];
    expect(pattern.cmd).toBe('admin.doctor.approveClinic');
    expect(payload).toMatchObject({ id: 'c-1', scope: 'QA', adminId: 'u-qa' });
  });

  it('refuses a locked admin the globally managed specialty taxonomy', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.createSpecialty(req(qaAdmin), { name: 'Hepatology' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('still lets a locked admin read that taxonomy, unfiltered', async () => {
    const { ctrl, client } = build();
    await ctrl.getSpecialties(req(qaAdmin));
    expect(client.send).toHaveBeenCalledWith({ cmd: 'admin.doctor.specialties' }, {});
  });
});
