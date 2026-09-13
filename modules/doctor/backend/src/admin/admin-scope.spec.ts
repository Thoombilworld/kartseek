import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DoctorAdminService } from './admin.service';

/**
 * M6's boundary, measured.
 *
 * `:__market` is the one parameter name `applyMarketFilter` binds, platform-wide
 * (`libs/common/src/market/market-scope.ts`). It is deliberately not `:country`,
 * `:cc` or `:rc`: a predicate that reuses a name the caller also binds is a
 * predicate a later clause can silently overwrite with a different value. Every
 * assertion below that looks for a market clause looks for THAT name, so a
 * hand-written predicate cannot pass these tests.
 *
 * What changed in M6, and what these tests pin:
 *
 *   * `doctors` gained `region_code`, so the directory FILTERS where it used to
 *     refuse every scoped caller outright.
 *   * `appointments` and `doctor_prescriptions` carry `doctorId` and nothing
 *     else, so both lists join the practitioner and filter on the
 *     PRACTITIONER's market — the documented join.
 *   * a practitioner with no market is unattributed, not global: absent from a
 *     scoped list, refused on detail, and readable by a global administrator.
 *   * the specialty catalogue is global, so the READ carries no predicate and
 *     the WRITE refuses a locked administrator.
 */

/** A query-builder double that records the clauses and joins it was given. */
function builder() {
  const clauses: string[] = [];
  const joins: string[] = [];
  const params: Record<string, unknown> = {};
  const qb: any = {
    select: () => qb,
    addSelect: () => qb,
    innerJoin: (target: unknown, alias: string) => (joins.push(`${String(target)}→${alias}`), qb),
    leftJoin: (target: unknown, alias: string) => (joins.push(`${String(target)}→${alias}`), qb),
    innerJoinAndSelect: () => qb,
    leftJoinAndSelect: () => qb,
    where: (w: string, p?: object) => (clauses.push(w), Object.assign(params, p), qb),
    andWhere: (w: string, p?: object) => (clauses.push(w), Object.assign(params, p), qb),
    groupBy: () => qb,
    addGroupBy: () => qb,
    orderBy: () => qb,
    addOrderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    limit: () => qb,
    getManyAndCount: async () => [[], 0],
    getMany: async () => [],
    getOne: async () => null,
    getCount: async () => 0,
    getRawMany: async () => [],
    getRawOne: async () => ({ fee: '0', platformFee: '0' }),
  };
  return { qb, clauses, joins, params };
}

/** A repository double whose `createQueryBuilder` always returns the same recorder. */
function repo(overrides: Record<string, unknown> = {}) {
  const rec = builder();
  return {
    rec,
    repo: {
      createQueryBuilder: () => rec.qb,
      findOne: vi.fn(async () => null),
      find: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      save: vi.fn(async (row: any) => row),
      create: vi.fn((row: any) => row),
      ...overrides,
    } as any,
  };
}

/** The service with every repository stubbed, and the recorders to inspect. */
function service(
  overrides: {
    doctor?: Record<string, unknown>;
    clinic?: Record<string, unknown>;
    appointment?: Record<string, unknown>;
    prescription?: Record<string, unknown>;
    specialty?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  } = {},
) {
  const doctor = repo(overrides.doctor);
  const clinic = repo(overrides.clinic);
  const appointment = repo(overrides.appointment);
  const prescription = repo(overrides.prescription);
  const specialty = repo(overrides.specialty);
  const settings = repo(overrides.settings);
  const kafka = { publish: vi.fn(async () => undefined) };

  const svc = Object.create(DoctorAdminService.prototype) as DoctorAdminService;
  Object.assign(svc, {
    doctorRepo: doctor.repo,
    clinicRepo: clinic.repo,
    appointmentRepo: appointment.repo,
    prescriptionRepo: prescription.repo,
    specialtyRepo: specialty.repo,
    settingsRepo: settings.repo,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, doctor, clinic, appointment, prescription, specialty, settings, kafka };
}

const UUID = '11111111-1111-4111-8111-111111111111';

describe('the practitioner directory filters instead of refusing', () => {
  it('narrows to the caller market on the doctor row itself', async () => {
    const { svc, doctor } = service();
    await svc.listDoctors({ scope: 'QA' });
    expect(doctor.rec.clauses).toContain('doctor.regionCode = :__market');
    expect(doctor.rec.params.__market).toBe('QA');
  });

  it('leaves the list unfiltered for a global admin', async () => {
    const { svc, doctor } = service();
    await svc.listDoctors({});
    expect(doctor.rec.clauses).not.toContain('doctor.regionCode = :__market');
  });

  it('lets the lock win over a requested market rather than widening', async () => {
    const { svc, doctor } = service();
    await svc.listDoctors({ scope: 'QA', countryCode: 'IN' });
    expect(doctor.rec.params.__market).toBe('QA');
  });

  it('refuses an unreadable requested market rather than dropping the predicate', async () => {
    const { svc } = service();
    await expect(svc.listDoctors({ countryCode: 'not-a-market' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('clamps the page size so an export cannot ask for every row', async () => {
    const { svc } = service();
    const page = await svc.listDoctors({ page: 0, limit: 5000 });
    expect(page).toMatchObject({ page: 1, limit: 100 });
  });

  it('refuses a status the column does not hold, naming the set', async () => {
    const { svc } = service();
    await expect(svc.listDoctors({ status: 'retired' })).rejects.toThrow(BadRequestException);
  });
});

describe('a practitioner with no market is unattributed, never global', () => {
  const unattributed = { id: UUID, name: 'A', status: 'active', clinicId: null, regionCode: null };

  it('refuses a scoped caller on detail', async () => {
    const { svc } = service({ doctor: { findOne: vi.fn(async () => ({ ...unattributed })) } });
    await expect(svc.getDoctorDetail(UUID, 'QA')).rejects.toThrow(ForbiddenException);
  });

  it('lets a global caller read them', async () => {
    const { svc } = service({
      doctor: { findOne: vi.fn(async () => ({ ...unattributed })), count: vi.fn(async () => 0) },
    });
    await expect(svc.getDoctorDetail(UUID, undefined)).resolves.toMatchObject({ id: UUID });
  });
});

describe('the two practitioner decisions', () => {
  const foreign = { id: UUID, name: 'A', status: 'active', clinicId: null, regionCode: 'IN' };

  it('verifyDoctor refuses a foreign practitioner and writes nothing', async () => {
    const save = vi.fn(async (d: any) => d);
    const { svc, kafka } = service({
      doctor: { findOne: vi.fn(async () => ({ ...foreign })), save },
    });
    await expect(svc.verifyDoctor({ id: UUID, verified: true, scope: 'QA' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('suspendDoctor refuses a foreign practitioner and writes nothing', async () => {
    const save = vi.fn(async (d: any) => d);
    const { svc, kafka } = service({
      doctor: { findOne: vi.fn(async () => ({ ...foreign })), save },
    });
    await expect(
      svc.suspendDoctor({ id: UUID, reason: 'Licence expired', scope: 'QA' }),
    ).rejects.toThrow(ForbiddenException);
    expect(save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('verifyDoctor records the decision and the administrator who took it', async () => {
    const save = vi.fn(async (d: any) => d);
    const { svc, kafka } = service({
      doctor: {
        findOne: vi.fn(async () => ({ ...foreign, regionCode: 'QA', status: 'pending' })),
        save,
      },
    });
    const out = await svc.verifyDoctor({
      id: UUID,
      verified: true,
      notes: 'Registration checked',
      scope: 'QA',
      actorId: 'admin-1',
    });
    expect(out).toMatchObject({ success: true, isVerified: true, status: 'active' });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerified: true,
        verifiedBy: 'admin-1',
        verificationNotes: 'Registration checked',
      }),
    );
    expect(kafka.publish).toHaveBeenCalledWith('doctor.verified', expect.anything());
  });

  it('suspendDoctor refuses an empty reason before it loads anything', async () => {
    const findOne = vi.fn(async () => ({ ...foreign }));
    const { svc } = service({ doctor: { findOne } });
    await expect(svc.suspendDoctor({ id: UUID, scope: 'QA' })).rejects.toThrow(BadRequestException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('suspendDoctor stores the reason and reuses doctor.status_changed', async () => {
    const save = vi.fn(async (d: any) => d);
    const { svc, kafka } = service({
      doctor: { findOne: vi.fn(async () => ({ ...foreign, regionCode: 'QA' })), save },
    });
    await svc.suspendDoctor({
      id: UUID,
      reason: 'Licence expired',
      scope: 'QA',
      actorId: 'admin-1',
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'suspended',
        suspendedBy: 'admin-1',
        suspensionReason: 'Licence expired',
      }),
    );
    expect(kafka.publish).toHaveBeenCalledWith('doctor.status_changed', expect.anything());
  });

  it('refreshes the denormalised market from the clinic before it judges', async () => {
    // The copy on the row says IN; the clinic — the source of truth the column
    // is denormalised FROM — says QA. A QA-locked administrator must be allowed.
    const save = vi.fn(async (d: any) => d);
    const { svc } = service({
      doctor: {
        findOne: vi.fn(async () => ({ ...foreign, clinicId: 'c-1', regionCode: 'IN' })),
        save,
      },
      clinic: { findOne: vi.fn(async () => ({ id: 'c-1', regionCode: 'QA' })) },
    });
    await svc.suspendDoctor({ id: UUID, reason: 'Licence expired', scope: 'QA' });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'QA' }));
  });

  it('reports an unknown id as 404, not as a market denial', async () => {
    const { svc } = service({ doctor: { findOne: vi.fn(async () => null) } });
    await expect(svc.verifyDoctor({ id: UUID, verified: true, scope: 'QA' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refuses a malformed id before it reaches the database', async () => {
    const findOne = vi.fn(async () => null);
    const { svc } = service({ doctor: { findOne } });
    await expect(svc.verifyDoctor({ id: 'not-a-uuid', verified: true })).rejects.toThrow(
      BadRequestException,
    );
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe('clinics', () => {
  it('narrows the list to the caller market', async () => {
    const { svc, clinic } = service();
    await svc.listClinics({ scope: 'IN' });
    expect(clinic.rec.clauses).toContain('c.regionCode = :__market');
  });

  it('approveClinic asserts the clinic own market and refuses a foreign one', async () => {
    const save = vi.fn(async (c: any) => c);
    const { svc } = service({
      clinic: {
        findOne: vi.fn(async () => ({ id: UUID, status: 'pending', regionCode: 'IN' })),
        save,
      },
    });
    await expect(svc.approveClinic({ id: UUID, scope: 'QA' })).rejects.toThrow(ForbiddenException);
    expect(save).not.toHaveBeenCalled();
  });

  it('approveClinic records who approved it and re-attributes its practitioners', async () => {
    const save = vi.fn(async (c: any) => c);
    const execute = vi.fn(async () => ({ affected: 3 }));
    const update: any = {
      update: () => update,
      set: () => update,
      where: () => update,
      andWhere: () => update,
      execute,
    };
    const { svc, kafka } = service({
      clinic: {
        findOne: vi.fn(async () => ({ id: UUID, name: 'C', status: 'pending', regionCode: 'QA' })),
        save,
      },
      doctor: { createQueryBuilder: () => update },
    });
    const out = await svc.approveClinic({ id: UUID, scope: 'QA', actorId: 'admin-1' });
    expect(out).toMatchObject({
      success: true,
      status: 'active',
      alreadyApproved: false,
      practitionersAttributed: 3,
    });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ approvedBy: 'admin-1' }));
    expect(kafka.publish).toHaveBeenCalledWith('doctor.clinic.approved', expect.anything());
  });

  /**
   * The re-stamp path, and why it may not refuse (M6 review, Important 1).
   *
   * This used to throw `BadRequestException` on an already-active clinic, which
   * closed the module's only bulk re-attribution against exactly the clinics
   * that need it: every clinic on the live databases is `active` while its
   * `region_code` is still NULL, so the sequence M11 performs — seed
   * `clinics.region_code`, then attribute the practitioners hanging off them —
   * had no route through this handler at all.
   */
  it('re-attributes an ALREADY-ACTIVE clinic instead of refusing it', async () => {
    const save = vi.fn(async (c: any) => c);
    const execute = vi.fn(async () => ({ affected: 4 }));
    const update: any = {
      update: () => update,
      set: () => update,
      where: () => update,
      andWhere: () => update,
      execute,
    };
    const { svc, kafka } = service({
      clinic: {
        findOne: vi.fn(async () => ({
          id: UUID,
          name: 'C',
          status: 'active',
          regionCode: 'QA',
          approvedBy: 'the-original-approver',
          approvedAt: new Date('2026-01-01'),
        })),
        save,
      },
      doctor: { createQueryBuilder: () => update },
    });

    const out = await svc.approveClinic({ id: UUID, scope: 'QA', actorId: 'admin-2' });

    expect(out).toMatchObject({
      success: true,
      status: 'active',
      alreadyApproved: true,
      practitionersAttributed: 4,
    });
    expect(execute).toHaveBeenCalled();
    expect(kafka.publish).toHaveBeenCalledWith(
      'doctor.clinic.approved',
      expect.objectContaining({ alreadyApproved: true, practitionersAttributed: 4 }),
    );
  });

  it('does not overwrite who first approved the clinic when it re-attributes', async () => {
    // `approvedBy`/`approvedAt` are the only record of who let this clinic
    // trade, and there is no history table. A re-attribution is not a second
    // approval.
    const save = vi.fn(async (c: any) => c);
    const update: any = {
      update: () => update,
      set: () => update,
      where: () => update,
      andWhere: () => update,
      execute: vi.fn(async () => ({ affected: 0 })),
    };
    const row = {
      id: UUID,
      name: 'C',
      status: 'active',
      regionCode: 'QA',
      approvedBy: 'the-original-approver',
      approvedAt: new Date('2026-01-01'),
    };
    const { svc } = service({
      clinic: { findOne: vi.fn(async () => row), save },
      doctor: { createQueryBuilder: () => update },
    });

    await svc.approveClinic({ id: UUID, scope: 'QA', actorId: 'admin-2' });

    expect(save).not.toHaveBeenCalled();
    expect(row.approvedBy).toBe('the-original-approver');
  });

  it('still refuses an already-active clinic in another market', async () => {
    // Idempotence is not a relaxation of the boundary: the market check runs
    // first, and a QA administrator may not re-attribute an IN clinic.
    const update: any = {
      update: () => update,
      set: () => update,
      where: () => update,
      andWhere: () => update,
      execute: vi.fn(async () => ({ affected: 0 })),
    };
    const { svc } = service({
      clinic: {
        findOne: vi.fn(async () => ({ id: UUID, name: 'C', status: 'active', regionCode: 'IN' })),
      },
      doctor: { createQueryBuilder: () => update },
    });

    await expect(svc.approveClinic({ id: UUID, scope: 'QA' })).rejects.toThrow(ForbiddenException);
    expect(update.execute).not.toHaveBeenCalled();
  });

  it('attributes nobody when the clinic itself has no market', async () => {
    const update: any = {
      update: () => update,
      set: () => update,
      where: () => update,
      andWhere: () => update,
      execute: vi.fn(async () => ({ affected: 9 })),
    };
    const { svc } = service({
      clinic: {
        findOne: vi.fn(async () => ({ id: UUID, name: 'C', status: 'active', regionCode: null })),
        save: vi.fn(async (c: any) => c),
      },
      doctor: { createQueryBuilder: () => update },
    });

    const out = await svc.approveClinic({ id: UUID });

    expect(out).toMatchObject({ practitionersAttributed: 0, market: null });
    expect(update.execute).not.toHaveBeenCalled();
  });

  it('reports an unknown clinic as 404', async () => {
    const { svc } = service({ clinic: { findOne: vi.fn(async () => null) } });
    await expect(svc.getClinicDetail(UUID, 'QA')).rejects.toThrow(NotFoundException);
  });
});

describe('appointments and prescriptions reach their market through the practitioner', () => {
  it('the appointments list joins the doctor and filters on the doctor market', async () => {
    const { svc, appointment } = service();
    await svc.listAppointments({ scope: 'QA' });
    expect(appointment.rec.joins).toContain('a.doctor→doctor');
    expect(appointment.rec.clauses).toContain('doctor.regionCode = :__market');
  });

  it('the prescriptions list does the same', async () => {
    const { svc, prescription } = service();
    await svc.listPrescriptions({ scope: 'QA' });
    expect(prescription.rec.joins).toContain('p.doctor→doctor');
    expect(prescription.rec.clauses).toContain('doctor.regionCode = :__market');
  });

  it('refuses a date that is not an ISO date', async () => {
    const { svc } = service();
    await expect(svc.listAppointments({ date: '13-09-2026' })).rejects.toThrow(BadRequestException);
  });
});

describe('the specialty catalogue is global', () => {
  it('the read carries no market predicate', async () => {
    const { svc, specialty, doctor } = service({ specialty: { find: vi.fn(async () => []) } });
    await svc.listSpecialties();
    expect(specialty.rec.clauses).toEqual([]);
    expect(doctor.rec.clauses).toEqual([]);
  });

  it('the write refuses a region-locked administrator', async () => {
    const save = vi.fn(async (s: any) => s);
    const { svc } = service({ specialty: { save } });
    await expect(svc.createSpecialty({ name: 'Hepatology', scope: 'QA' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('a global administrator may add one, and is recorded on it', async () => {
    const save = vi.fn(async (s: any) => s);
    const { svc, kafka } = service({
      specialty: { findOne: vi.fn(async () => null), save, create: (s: any) => s },
    });
    await svc.createSpecialty({ name: 'Hepatology', actorId: 'admin-1' });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'hepatology', createdBy: 'admin-1' }),
    );
    expect(kafka.publish).toHaveBeenCalledWith('doctor.specialty.created', expect.anything());
  });
});

describe('market settings', () => {
  it('the read narrows to the caller market', async () => {
    const { svc, settings } = service();
    await svc.getSettings({ scope: 'QA' });
    expect(settings.rec.clauses).toContain('s.regionCode = :__market');
  });

  it('refuses a locked caller writing another market configuration', async () => {
    const { svc, settings } = service();
    await expect(
      svc.updateSettings({ scope: 'QA', countryCode: 'IN', commissionPercent: 10 }),
    ).rejects.toThrow(ForbiddenException);
    expect(settings.repo.save).not.toHaveBeenCalled();
  });

  it('refuses a global caller who names no market rather than writing a NULL row', async () => {
    const { svc, settings } = service();
    await expect(svc.updateSettings({ commissionPercent: 10 })).rejects.toThrow(
      BadRequestException,
    );
    expect(settings.repo.save).not.toHaveBeenCalled();
  });

  it('refuses a write that names no setting at all', async () => {
    const { svc } = service();
    await expect(svc.updateSettings({ scope: 'QA' })).rejects.toThrow(BadRequestException);
  });

  it('creates the row for a market that has none, and records the administrator', async () => {
    const save = vi.fn(async (s: any) => ({ ...s, id: UUID, updatedAt: new Date() }));
    const { svc, kafka } = service({ settings: { save, create: (s: any) => ({ ...s }) } });
    const out = await svc.updateSettings({
      scope: 'QA',
      commissionPercent: 12.5,
      actorId: 'admin-1',
    });
    expect(out).toMatchObject({ regionCode: 'QA', configured: true, commissionPercent: 12.5 });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'QA', updatedBy: 'admin-1' }),
    );
    expect(kafka.publish).toHaveBeenCalledWith('doctor.settings.updated', expect.anything());
  });
});

describe('the dashboard and the reports carry the predicate on every leg', () => {
  it('the dashboard filters clinics, doctors, appointments and prescriptions alike', async () => {
    const { svc, clinic, doctor, appointment, prescription } = service();
    const out = await svc.getDashboard({ scope: 'QA' });
    expect(clinic.rec.clauses).toContain('c.regionCode = :__market');
    expect(doctor.rec.clauses).toContain('doctor.regionCode = :__market');
    expect(appointment.rec.clauses).toContain('doctor.regionCode = :__market');
    expect(prescription.rec.clauses).toContain('doctor.regionCode = :__market');
    // Meaningless under a market heading, so it is a global-admin figure only.
    expect(out.unattributedDoctors).toBeNull();
  });

  it('refuses a report period the module does not compute', async () => {
    const { svc } = service();
    await expect(svc.getReports({ period: 'all-time' })).rejects.toThrow(BadRequestException);
  });

  it('filters every leg of the report', async () => {
    const { svc, appointment, clinic, doctor } = service();
    await svc.getReports({ scope: 'IN', period: '7d' });
    expect(appointment.rec.clauses).toContain('doctor.regionCode = :__market');
    expect(clinic.rec.clauses).toContain('c.regionCode = :__market');
    expect(doctor.rec.clauses).toContain('doctor.regionCode = :__market');
  });
});
