import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { DoctorService } from '../doctor.service';
import { DoctorController } from '../doctor.controller';

// `:__market` is the one parameter name `applyMarketFilter` binds, platform-wide
// (`libs/common/src/market/market-scope.ts`). It is deliberately not `:country`,
// `:cc` or `:rc`: a predicate that reuses a name the caller also binds is a
// predicate a later clause can silently overwrite with a different value.

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
    expect(where).toContain('c.regionCode = :__market');
  });

  it('leaves the list unfiltered for a global admin', async () => {
    const { svc, where } = service();
    await svc.getClinics(undefined, undefined, 1, 20);
    expect(where).not.toContain('c.regionCode = :__market');
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

/**
 * R12 leftover (a): the three SUPER_ADMIN-only status writes on the public
 * `DoctorController` (`PUT /doctor/hospitals/:hospitalId/status`,
 * `.../clinics/:clinicId/status`, `.../doctors/:doctorId/status`) used to
 * carry no scope call at all. `hospitals` has no market column, so a scoped
 * caller is refused outright; `clinics.regionCode` exists, so a clinic status
 * write asserts it; a doctor has no market of its own and is resolved through
 * the clinic it is attached to.
 */
function svcFor(overrides: Record<string, unknown>) {
  const svc = Object.create(DoctorService.prototype) as DoctorService;
  Object.assign(svc, { logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() }, ...overrides });
  return svc;
}

describe('DoctorService status writes resolve the caller market', () => {
  describe('updateHospitalStatus — hospitals carry no market column', () => {
    it('refuses a scoped caller outright', async () => {
      const hospitalRepo = {
        findOne: vi.fn(async () => ({ id: 'h-1', status: 'active' })),
        save: vi.fn(async (h: any) => h),
      };
      const svc = svcFor({ hospitalRepo });
      await expect(svc.updateHospitalStatus('h-1', 'inactive', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
      expect(hospitalRepo.save).not.toHaveBeenCalled();
    });

    it('allows a global caller', async () => {
      const hospitalRepo = {
        findOne: vi.fn(async () => ({ id: 'h-1', status: 'active' })),
        save: vi.fn(async (h: any) => h),
      };
      const svc = svcFor({ hospitalRepo });
      await expect(svc.updateHospitalStatus('h-1', 'inactive')).resolves.toMatchObject({
        success: true,
      });
      expect(hospitalRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateClinicStatus — clinics.regionCode is the boundary', () => {
    it("allows a caller locked to the clinic's own market", async () => {
      const clinicRepo = {
        findOne: vi.fn(async () => ({ id: 'c-1', status: 'active', regionCode: 'QA' })),
        save: vi.fn(async (c: any) => c),
      };
      const svc = svcFor({ clinicRepo });
      await expect(svc.updateClinicStatus('c-1', 'inactive', 'QA')).resolves.toMatchObject({
        success: true,
      });
      expect(clinicRepo.save).toHaveBeenCalled();
    });

    it('refuses a caller locked to a different market', async () => {
      const clinicRepo = {
        findOne: vi.fn(async () => ({ id: 'c-1', status: 'active', regionCode: 'IN' })),
        save: vi.fn(async (c: any) => c),
      };
      const svc = svcFor({ clinicRepo });
      await expect(svc.updateClinicStatus('c-1', 'inactive', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
      expect(clinicRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateDoctorStatus — resolved through the attached clinic', () => {
    it("allows a caller locked to the market of the doctor's own clinic", async () => {
      const doctorRepo = {
        findOne: vi.fn(async () => ({ id: 'd-1', status: 'active', clinicId: 'c-1' })),
        save: vi.fn(async (d: any) => d),
      };
      const clinicRepo = { findOne: vi.fn(async () => ({ id: 'c-1', regionCode: 'QA' })) };
      const kafka = { publish: vi.fn(async () => undefined) };
      const svc = svcFor({ doctorRepo, clinicRepo, kafka });
      await expect(svc.updateDoctorStatus('d-1', 'suspended', 'QA')).resolves.toMatchObject({
        success: true,
      });
      expect(doctorRepo.save).toHaveBeenCalled();
    });

    it("refuses a caller locked to another market than the clinic's", async () => {
      const doctorRepo = {
        findOne: vi.fn(async () => ({ id: 'd-1', status: 'active', clinicId: 'c-1' })),
        save: vi.fn(async (d: any) => d),
      };
      const clinicRepo = { findOne: vi.fn(async () => ({ id: 'c-1', regionCode: 'IN' })) };
      const kafka = { publish: vi.fn(async () => undefined) };
      const svc = svcFor({ doctorRepo, clinicRepo, kafka });
      await expect(svc.updateDoctorStatus('d-1', 'suspended', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
      expect(doctorRepo.save).not.toHaveBeenCalled();
    });

    it('refuses a scoped caller for a doctor with no clinic to resolve', async () => {
      const doctorRepo = {
        findOne: vi.fn(async () => ({ id: 'd-2', status: 'active', clinicId: null })),
        save: vi.fn(async (d: any) => d),
      };
      const clinicRepo = { findOne: vi.fn(async () => null) };
      const kafka = { publish: vi.fn(async () => undefined) };
      const svc = svcFor({ doctorRepo, clinicRepo, kafka });
      await expect(svc.updateDoctorStatus('d-2', 'suspended', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
      expect(doctorRepo.save).not.toHaveBeenCalled();
    });

    it('allows a global caller regardless of clinic attribution', async () => {
      const doctorRepo = {
        findOne: vi.fn(async () => ({ id: 'd-3', status: 'active', clinicId: null })),
        save: vi.fn(async (d: any) => d),
      };
      const kafka = { publish: vi.fn(async () => undefined) };
      const svc = svcFor({ doctorRepo, kafka });
      await expect(svc.updateDoctorStatus('d-3', 'suspended')).resolves.toMatchObject({
        success: true,
      });
      expect(doctorRepo.save).toHaveBeenCalled();
    });
  });
});
