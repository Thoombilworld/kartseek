import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AdminDoctorController } from './admin-doctor.controller';

/**
 * The market boundary and the command contract, at the gateway.
 *
 * Three things are pinned here, and all three were broken before M6:
 *
 *  1. A region-locked administrator is confined to their own market, and the
 *     refusal happens BEFORE doctor-service is addressed — `client.send` not
 *     having been called is the assertion, because a denial that still made the
 *     RPC would be a denial the service had to be trusted to repeat.
 *  2. Every route sends a command doctor-service actually implements. Twelve of
 *     the fifteen reached no handler at all until M6; nothing was renamed, so a
 *     spelling that drifts here fails both this file and
 *     `test/gateway-service-contract.spec.ts`.
 *  3. Every list route answers with the rows one level down and no more — see
 *     the third describe.
 */

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = (send = vi.fn(() => of({ data: [], total: 0 }))) => {
  const client = { send };
  return { ctrl: new AdminDoctorController(client as any), client };
};

const ID = '11111111-1111-4111-8111-111111111111';

describe('AdminDoctorController market scope', () => {
  it("confines a locked admin's clinic list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getClinics(req(qaAdmin), { page: 1, limit: 20 });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.doctor.clinics' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  /**
   * The route M6 exists for.
   *
   * `GET /admin/doctor/doctors` answered 403 to every region-locked
   * administrator until `doctors.region_code` landed: the command reached
   * `refuseUnattributable` before it read a row. The gateway's half of the fix
   * is that it now forwards a market at all — the service filters on it.
   */
  it("sends a locked admin's market on the practitioner directory", async () => {
    const { ctrl, client } = build();
    await ctrl.getDoctors(req(qaAdmin), { page: 1, limit: 20 });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.doctor.doctors' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before doctor-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.getDoctors(req(qaAdmin), { page: 1, limit: 20, countryCode: 'IN' }),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getClinics(req(globalAdmin), { page: 1, limit: 20, countryCode: 'in' });
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('records the market and the acting admin on a clinic approval', async () => {
    const { ctrl, client } = build();
    await ctrl.approveClinic(req(qaAdmin), ID);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.doctor.approveClinic' },
      expect.objectContaining({ id: ID, scope: 'QA', actorId: 'u-qa' }),
    );
  });

  it('records the acting admin on a verification, with the decision and the note', async () => {
    const { ctrl, client } = build();
    await ctrl.verifyDoctor(req(qaAdmin), ID, { verified: true, notes: 'registration checked' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.doctor.verifyDoctor' },
      expect.objectContaining({
        id: ID,
        verified: true,
        notes: 'registration checked',
        scope: 'QA',
        actorId: 'u-qa',
      }),
    );
  });

  it('records the reason and the acting admin on a suspension', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendDoctor(req(qaAdmin), ID, { reason: 'registration lapsed' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.doctor.suspendDoctor' },
      expect.objectContaining({
        id: ID,
        reason: 'registration lapsed',
        scope: 'QA',
        actorId: 'u-qa',
      }),
    );
  });

  it('never lets a body id retarget a decision at another record', async () => {
    const { ctrl, client } = build();
    // The DTO refuses an undeclared `id` outright under `forbidNonWhitelisted`;
    // this is the second line — the path parameter is written AFTER the spread.
    await ctrl.suspendDoctor(req(qaAdmin), ID, {
      reason: 'registration lapsed',
      id: 'someone-else',
    } as never);
    expect(client.send.mock.calls[0][1].id).toBe(ID);
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

  it("never lets a body's countryCode reach a locked admin's settings write", async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.updateSettings(req(qaAdmin), { countryCode: 'IN', autoApproveClinics: true }),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it("stamps a locked admin's own market on a settings write", async () => {
    const { ctrl, client } = build();
    await ctrl.updateSettings(req(qaAdmin), { commissionPercent: 12.5 });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.doctor.updateSettings' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA', actorId: 'u-qa' }),
    );
  });

  it('sends the market on every list and read a market can narrow', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(qaAdmin), {});
    await ctrl.getClinics(req(qaAdmin), {});
    await ctrl.getDoctors(req(qaAdmin), {});
    await ctrl.getAppointments(req(qaAdmin), {});
    await ctrl.getPrescriptions(req(qaAdmin), {});
    await ctrl.getReports(req(qaAdmin), { period: '30d' });
    await ctrl.getSettings(req(qaAdmin), {});
    for (const call of client.send.mock.calls) {
      expect(call[1]).toMatchObject({ countryCode: 'QA', scope: 'QA' });
    }
  });
});

describe('AdminDoctorController command spellings', () => {
  /**
   * One name per command. Every entry below is a `@MessagePattern` in
   * `modules/doctor/backend/src/admin/admin.controller.ts` — twelve written by
   * M6 and three moved there from `doctor.controller.ts`. Nothing was renamed:
   * unlike hotel and restaurant, this module never adopted a second convention,
   * so the dotted names the gateway has always sent are the implemented ones.
   */
  it('sends the fifteen names doctor-service implements', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), {});
    await ctrl.getClinics(req(globalAdmin), {});
    await ctrl.getClinicById(req(globalAdmin), ID);
    await ctrl.approveClinic(req(globalAdmin), ID);
    await ctrl.getDoctors(req(globalAdmin), {});
    await ctrl.getDoctorById(req(globalAdmin), ID);
    await ctrl.verifyDoctor(req(globalAdmin), ID, { verified: true });
    await ctrl.suspendDoctor(req(globalAdmin), ID, { reason: 'probe' });
    await ctrl.getAppointments(req(globalAdmin), {});
    await ctrl.getPrescriptions(req(globalAdmin), {});
    await ctrl.getSpecialties(req(globalAdmin));
    await ctrl.createSpecialty(req(globalAdmin), { name: 'Hepatology' });
    await ctrl.getReports(req(globalAdmin), {});
    await ctrl.getSettings(req(globalAdmin), {});
    await ctrl.updateSettings(req(globalAdmin), { countryCode: 'QA', commissionPercent: 1 });

    expect(client.send.mock.calls.map((c) => c[0].cmd)).toEqual([
      'admin.doctor.dashboard',
      'admin.doctor.clinics',
      'admin.doctor.clinicDetail',
      'admin.doctor.approveClinic',
      'admin.doctor.doctors',
      'admin.doctor.doctorDetail',
      'admin.doctor.verifyDoctor',
      'admin.doctor.suspendDoctor',
      'admin.doctor.appointments',
      'admin.doctor.prescriptions',
      'admin.doctor.specialties',
      'admin.doctor.createSpecialty',
      'admin.doctor.reports',
      'admin.doctor.settings',
      'admin.doctor.updateSettings',
    ]);
  });
});

describe('every list route answers with data + total', () => {
  /**
   * ONE list shape for all five, and the rows one level down — no more.
   *
   * doctor-service answers a list with `{ data, total, page, limit }`, and the
   * global `TransformInterceptor` puts whatever the handler returns under
   * `data`. So a handler that returns the service result unwrapped puts the rows
   * at `json.data.data`, which is where M1's marketplace lists, M3's pharmacy
   * lists, M4's restaurant lists and M5's hotel lists put theirs; a handler that
   * adds its own `{ data: … }` puts them at `json.data.data.data`. FOUR of these
   * five routes did exactly that before M6, so a console reading one depth
   * everywhere else would have found nothing on every doctor screen.
   *
   * The assertion walks the routes rather than naming the ones that were wrong,
   * so a list route added later cannot regress it.
   */
  const listRoutes: Array<[string, (c: AdminDoctorController, r: any) => Promise<any>]> = [
    ['GET /clinics', (c, r) => c.getClinics(r, {})],
    ['GET /doctors', (c, r) => c.getDoctors(r, {})],
    ['GET /appointments', (c, r) => c.getAppointments(r, {})],
    ['GET /prescriptions', (c, r) => c.getPrescriptions(r, {})],
    ['GET /specialties', (c, r) => c.getSpecialties(r)],
  ];

  /** What doctor-service really answers a list with. */
  const paged = { data: [{ id: 'row-1' }], total: 1, page: 1, limit: 20, market: 'QA' };

  for (const [label, call] of listRoutes) {
    it(`${label} returns the paged payload unwrapped`, async () => {
      const client = { send: vi.fn(() => of(paged)) };
      const ctrl = new AdminDoctorController(client as any);
      const body = await call(ctrl, req(qaAdmin));

      expect(Array.isArray(body.data), `${label} buries its rows`).toBe(true);
      expect(body.total).toBe(1);
      // The rows are the service's own, not a re-wrapped copy of the envelope.
      expect(body.data[0]).toEqual({ id: 'row-1' });
    });
  }

  it('leaves single-object reads and decisions wrapped', async () => {
    // These carry no `total`, nothing pages them, and a bare entity would give
    // the console nowhere to hang anything the route later adds beside it.
    const one = { id: 'd-1', name: 'Dr Aisha Rahman' };
    const client = { send: vi.fn(() => of(one)) };
    const ctrl = new AdminDoctorController(client as any);

    expect(await ctrl.getDashboard(req(qaAdmin), {})).toEqual({ data: one });
    expect(await ctrl.getClinicById(req(qaAdmin), ID)).toEqual({ data: one });
    expect(await ctrl.getDoctorById(req(qaAdmin), ID)).toEqual({ data: one });
    expect(await ctrl.getReports(req(qaAdmin), {})).toEqual({ data: one });
    expect(await ctrl.getSettings(req(qaAdmin), {})).toEqual({ data: one });
    expect(await ctrl.approveClinic(req(qaAdmin), ID)).toEqual({ data: one });
    expect(await ctrl.verifyDoctor(req(qaAdmin), ID, { verified: true })).toEqual({ data: one });
  });
});

describe('AdminDoctorController failure handling', () => {
  it('reports an unreachable service as 503, never as an empty page', async () => {
    const { ctrl } = build(vi.fn(() => throwError(() => new Error('connect ECONNREFUSED'))));
    await expect(ctrl.getAppointments(req(globalAdmin), {})).rejects.toMatchObject({ status: 503 });
  });
});
