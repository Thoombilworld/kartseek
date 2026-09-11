import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { DoctorService } from '../doctor.service';
import { DoctorController } from '../doctor.controller';

/**
 * A region-locked administrator carries their market as `scope` on every admin
 * message. Clinics carry a `regionCode`, so the clinic list narrows to it.
 * Doctors carry no market column at all — a doctor row cannot be attributed to
 * a market yet — so that list refuses a scoped caller rather than answering
 * with every market's practitioners.
 */

function service() {
  const where: string[] = [];
  const qb: any = {
    leftJoinAndSelect: () => qb,
    where: (w: string) => (where.push(w), qb),
    andWhere: (w: string) => (where.push(w), qb),
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [[], 0],
  };
  const clinicRepo = { createQueryBuilder: () => qb };
  const svc = Object.create(DoctorService.prototype) as DoctorService;
  Object.assign(svc, {
    clinicRepo,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, where };
}

describe('DoctorService.getClinics narrows to the caller market', () => {
  it('adds the region predicate when a market is given', async () => {
    const { svc, where } = service();
    await svc.getClinics(undefined, undefined, 1, 20, 'QA');
    expect(where).toContain('c.regionCode = :rc');
  });

  it('leaves the list unfiltered for a global admin', async () => {
    const { svc, where } = service();
    await svc.getClinics(undefined, undefined, 1, 20);
    expect(where).not.toContain('c.regionCode = :rc');
  });
});

describe('DoctorController.tcpAdminGetDoctors fails closed — doctors have no market', () => {
  function controller() {
    const svc = { getDoctors: vi.fn(async () => ({ data: [], total: 0 })) };
    const ctrl = Object.create(DoctorController.prototype) as DoctorController;
    Object.assign(ctrl, { svc });
    return { ctrl, svc };
  }

  // The handler is synchronous and throws directly rather than returning a
  // rejected promise, so the call must be wrapped for `.toThrow` to catch it.
  it('refuses a scoped request without ever reading the doctor table', () => {
    const { ctrl, svc } = controller();
    expect(() => ctrl.tcpAdminGetDoctors({ scope: 'QA' } as any)).toThrow(ForbiddenException);
    expect(svc.getDoctors).not.toHaveBeenCalled();
  });

  it('lets a global admin (no scope) list every doctor', async () => {
    const { ctrl, svc } = controller();
    await expect(ctrl.tcpAdminGetDoctors({} as any)).resolves.toMatchObject({ total: 0 });
    expect(svc.getDoctors).toHaveBeenCalled();
  });
});
