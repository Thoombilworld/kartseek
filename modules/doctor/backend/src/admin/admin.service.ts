import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  applyMarketFilter,
  assertInMarket,
  assertRecordMarket,
  marketPredicate,
  refuseUnattributable,
  requireMarket,
  requireUuid,
} from '@app/common';
import { KafkaProducerService } from '@app/kafka';

import { Doctor } from '../entities/doctor.entity';
import { Clinic } from '../entities/clinic.entity';
import { Appointment } from '../entities/appointment.entity';
import { Prescription } from '../entities/prescription.entity';
import { Specialty } from '../entities/specialty.entity';
import { DoctorMarketSettings } from '../entities/doctor-market-settings.entity';
import type {
  AdminAppointmentListMsg,
  AdminDoctorListMsg,
  AdminIdMsg,
  AdminListMsg,
  AdminReportMsg,
  AdminSettingsMsg,
  AdminSpecialtyMsg,
  AdminSuspendDoctorMsg,
  AdminVerifyDoctorMsg,
} from './dto/admin.dto';

/** The clinic states the console may filter on — the entity's own enum. */
const CLINIC_STATUSES = ['pending', 'active', 'suspended', 'blocked', 'rejected'] as const;

/** The practitioner states the console may filter on — the entity's own enum. */
const DOCTOR_STATUSES = ['pending', 'active', 'suspended', 'blocked'] as const;

/** The appointment states the console may filter on — the entity's own enum. */
const APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

/** The prescription states the console may filter on — the entity's own enum. */
const PRESCRIPTION_STATUSES = ['DRAFT', 'ISSUED', 'DISPENSED'] as const;

/** The appointment states in which money has actually been earned. */
const EARNED_APPOINTMENT_STATES = ['COMPLETED'];

/** The clinic states that put a clinic in the approvals queue. */
const AWAITING_DECISION = ['pending'];

/** The periods the reports screen offers, in days. */
const PERIOD_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

/** An ISO date, exactly — the appointments queue's `?date=` filter. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const numeric = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v: unknown): number => +numeric(v).toFixed(2);

/** The catalogue's identity for a specialty name — see `Specialty.slug`. */
const specialtySlug = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The doctor admin console's backend.
 *
 * ── The gap this closes ─────────────────────────────────────────────────────
 *
 * `admin-doctor.controller.ts` sends fifteen distinct commands. Three reached a
 * handler; the other twelve had no `@MessagePattern` anywhere in this module, so
 * every doctor console screen but Clinics, Doctors and Specialties answered 503
 * — and, before M2 removed the gateway's fallbacks, a fabricated empty success
 * that was indistinguishable from "this market has no appointments".
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * `clinics.region_code` was this module's only market column, and `doctors` had
 * none at all: a practitioner carries a nullable `clinicId` and a nullable
 * `hospitalId`, `hospitals` has no market column of any kind, and the directory
 * therefore failed CLOSED for every regional administrator — correct, and
 * unusable.
 *
 * M6 adds `doctors.region_code`, denormalised from the clinic and backfilled
 * once (`migrations/1786502800000-DoctorAdminSurfaces.ts`). It is the SECOND
 * market column this module owns, and it is what makes the other two tables
 * attributable: `appointments` and `doctor_prescriptions` carry `doctorId` and
 * nothing else, so both lists here `innerJoin` the practitioner and filter on
 * the PRACTITIONER's market — the documented join
 * `appointment → doctor → region_code`.
 *
 * Why denormalised rather than joined at read time: a doctor may have NEITHER
 * parent, so the alternative is a three-way LEFT JOIN that can produce NULL, and
 * a predicate that can produce NULL is not one a reviewer can check. The cost is
 * the usual one — a copy that can go stale — and it is paid for by
 * `stampDoctorMarket` below, which re-reads the clinic on every decision this
 * service takes about a practitioner.
 *
 * A NULL `region_code` means UNATTRIBUTED, never "every market": such a
 * practitioner is absent from a scoped list and refused on detail
 * (`refuseUnattributable`), and visible to a global administrator. Widening is
 * the direction that leaks.
 *
 * `specialties` is the one deliberate exception: the taxonomy is GLOBAL —
 * "Hepatology" is the same specialty in Doha and in Delhi — so the read carries
 * no predicate at all and only the WRITE is withheld from a locked
 * administrator, on both sides of the wire.
 *
 * ── Why the predicate, never a post-filter ──────────────────────────────────
 *
 * Filtering after `take(limit)` returns a short page that reads as "this market
 * has nothing", which is indistinguishable from a leak in the other direction.
 * Every market clause here is written by `applyMarketFilter` (`@app/common`),
 * the single implementation of that clause on the platform.
 */
@Injectable()
export class DoctorAdminService {
  private readonly logger = new Logger(DoctorAdminService.name);

  constructor(
    @InjectRepository(Doctor) private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Clinic) private readonly clinicRepo: Repository<Clinic>,
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Specialty) private readonly specialtyRepo: Repository<Specialty>,
    @InjectRepository(DoctorMarketSettings)
    private readonly settingsRepo: Repository<DoctorMarketSettings>,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ── Shared scope plumbing ──────────────────────────────────────────────────

  /**
   * The market this request may read, resolved once.
   *
   * The LOCK (`scope`, written only by the gateway, only from the token) wins
   * over whatever the request asked for. `requireMarket` wraps the requested
   * slot so an unreadable `?countryCode=` is a refusal rather than an absent
   * predicate — absent means every market, which is the direction that leaks.
   */
  private market(scope?: string, requested?: string, what = 'market'): string | undefined {
    return marketPredicate(scope, requireMarket(requested, what, this.logger), this.logger);
  }

  /**
   * The market a WRITE addresses — a lock, or a global caller's explicit choice.
   *
   * `marketPredicate` lets the LOCK win over whatever was requested, which is
   * exactly right for a list (it NARROWS) and exactly wrong here: a QA-locked
   * caller naming `IN` would have their request silently applied to QA's own
   * configuration row. The gateway refuses that mismatch before the RPC; this is
   * the second line, for a caller that reached this service over TCP by another
   * path.
   */
  private writeMarket(scope: string | undefined, requested: string | undefined, what: string) {
    const asked = requireMarket(requested, what, this.logger);
    if (asked) assertInMarket(asked, scope, what, this.logger);
    const market = marketPredicate(scope, asked, this.logger);
    if (!market) {
      throw new BadRequestException(`countryCode is required: ${what} belongs to one market`);
    }
    return market;
  }

  /** Page controls, clamped: a page is a page and a limit is at most 100 rows. */
  private page(q: { page?: number; limit?: number }, fallbackLimit = 20) {
    const limit = Math.min(Math.max(Number(q.limit) || fallbackLimit, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    return { page, limit, skip: (page - 1) * limit };
  }

  /** A status filter the column actually holds, or a 400 naming the set. */
  private status(value: string | undefined, allowed: readonly string[], what: string) {
    if (value === undefined || value === null || value === '') return undefined;
    if (allowed.includes(value)) return value;
    throw new BadRequestException(
      `"${value}" is not a ${what} status. One of: ${allowed.join(', ')}`,
    );
  }

  /** A date `days` ago, for the report windows the console asks for. */
  private since(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * The practitioner a decision addresses — and the refusal when they are not
   * the caller's.
   *
   * `assertRecordMarket` keeps "no such id" (404) and "not your market" (403)
   * apart: a handler that asserts on a row it did not check for existence
   * reports a typo as a permission problem and sends an operator hunting for the
   * wrong thing.
   *
   * The row is re-stamped from its clinic FIRST (`stampDoctorMarket`), so a
   * practitioner who was attached to a clinic after the backfill ran, or whose
   * clinic has since moved market, is judged on the market they are in today
   * rather than on a stale copy. That is the maintenance cost of denormalising,
   * paid at the only place it matters — the moment somebody acts on the row.
   */
  private async doctorInMarket(id: string, scope?: string, what = 'doctor'): Promise<Doctor> {
    const row = await this.doctorRepo.findOne({ where: { id: requireUuid(id, what) } });
    if (!row) throw new NotFoundException(`No ${what} with that id`);
    await this.stampDoctorMarket(row);
    if (!row.regionCode) refuseUnattributable(scope, what, this.logger);
    else assertInMarket(row.regionCode, scope, what, this.logger);
    return row;
  }

  /**
   * Refresh the denormalised market from the clinic, in memory.
   *
   * The caller persists it with the rest of its write, so a read-only path
   * cannot turn into a write. A practitioner with no clinic keeps whatever they
   * had — usually NULL — because `hospitals` carries no market to fall back to
   * and inventing one is exactly what the migration refuses to do.
   */
  private async stampDoctorMarket(doctor: Doctor): Promise<void> {
    if (!doctor.clinicId) return;
    const clinic = await this.clinicRepo.findOne({
      where: { id: doctor.clinicId },
      select: { id: true, regionCode: true },
    });
    if (clinic?.regionCode) doctor.regionCode = clinic.regionCode;
  }

  /** The clinic a decision addresses, and the refusal when it is not the caller's. */
  private async clinicInMarket(id: string, scope?: string, what = 'clinic'): Promise<Clinic> {
    const row = await this.clinicRepo.findOne({ where: { id: requireUuid(id, what) } });
    assertRecordMarket(row, 'regionCode', scope, what, this.logger);
    return row;
  }

  /** The practitioner columns a console row needs, without dragging the whole record. */
  private readonly DOCTOR_COLUMNS = [
    'doctor.id',
    'doctor.name',
    'doctor.slug',
    'doctor.specialty',
    'doctor.city',
    'doctor.status',
    'doctor.isVerified',
    'doctor.regionCode',
  ];

  // ── Dashboard ──────────────────────────────────────────────────────────────

  /**
   * The market's own figures, and nothing else's.
   *
   * Every leg carries the predicate: clinics on their own `region_code`,
   * practitioners on theirs, appointments and prescriptions through the
   * practitioner join. A half-scoped dashboard is worse than none — it looks
   * like the market's own figures while one total is every market's.
   */
  async getDashboard(q: AdminReportMsg) {
    const market = this.market(q.scope, q.countryCode, 'that dashboard');

    const clinicsQb = this.clinicRepo.createQueryBuilder('c');
    applyMarketFilter(clinicsQb, 'c.regionCode', market);

    const pendingClinicsQb = this.clinicRepo
      .createQueryBuilder('c')
      .where('c.status IN (:...awaiting)', { awaiting: AWAITING_DECISION });
    applyMarketFilter(pendingClinicsQb, 'c.regionCode', market);

    const doctorsQb = this.doctorRepo.createQueryBuilder('doctor');
    applyMarketFilter(doctorsQb, 'doctor.regionCode', market);

    const unverifiedQb = this.doctorRepo
      .createQueryBuilder('doctor')
      .where('doctor.isVerified = :verified', { verified: false });
    applyMarketFilter(unverifiedQb, 'doctor.regionCode', market);

    const appointmentsQb = this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin('a.doctor', 'doctor');
    applyMarketFilter(appointmentsQb, 'doctor.regionCode', market);

    const revenueQb = this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin('a.doctor', 'doctor')
      .select('COALESCE(SUM(a.fee), 0)', 'fee')
      .addSelect('COALESCE(SUM(a."platformFee"), 0)', 'platformFee')
      .where('a.status IN (:...earned)', { earned: EARNED_APPOINTMENT_STATES });
    applyMarketFilter(revenueQb, 'doctor.regionCode', market);

    const prescriptionsQb = this.prescriptionRepo
      .createQueryBuilder('p')
      .innerJoin('p.doctor', 'doctor');
    applyMarketFilter(prescriptionsQb, 'doctor.regionCode', market);

    const [clinics, pendingClinics, doctors, unverifiedDoctors, appointments, prescriptions] =
      await Promise.all([
        clinicsQb.getCount(),
        pendingClinicsQb.getCount(),
        doctorsQb.getCount(),
        unverifiedQb.getCount(),
        appointmentsQb.getCount(),
        prescriptionsQb.getCount(),
      ]);
    const revenue = await revenueQb.getRawOne<{ fee: string; platformFee: string }>();

    // Unattributed practitioners are counted ONLY for a global caller: the
    // number is meaningless under a market heading (they are in no market), and
    // showing it to a scoped admin would say "there are 4 more you cannot see",
    // which is a different leak with a smaller payload.
    const unattributedDoctors = market
      ? null
      : await this.doctorRepo
          .createQueryBuilder('doctor')
          .where('doctor.regionCode IS NULL')
          .getCount();

    return {
      market: market ?? null,
      clinics,
      pendingClinics,
      doctors,
      unverifiedDoctors,
      unattributedDoctors,
      appointments,
      prescriptions,
      consultationRevenue: money(revenue?.fee),
      platformRevenue: money(revenue?.platformFee),
    };
  }

  // ── Clinics ────────────────────────────────────────────────────────────────

  /**
   * Every clinic in the caller's market, whatever its state.
   *
   * The read this replaces (`DoctorService.getClinics`) hard-codes
   * `status = 'active'` — right for the storefront, useless for an admin console
   * whose whole job includes the PENDING queue: `approveClinic` could not be
   * reached from the list that was supposed to feed it.
   */
  async listClinics(q: AdminListMsg & { city?: string; specialty?: string }) {
    const market = this.market(q.scope, q.countryCode, 'those clinics');
    const { page, limit, skip } = this.page(q);
    const status = this.status(q.status, CLINIC_STATUSES, 'clinic');

    const qb = this.clinicRepo.createQueryBuilder('c');
    applyMarketFilter(qb, 'c.regionCode', market);
    if (status) qb.andWhere('c.status = :status', { status });
    if (q.city) qb.andWhere('c.city ILIKE :city', { city: `%${q.city}%` });
    if (q.specialty) qb.andWhere('c.specialties LIKE :spec', { spec: `%${q.specialty}%` });

    const [data, total] = await qb
      .orderBy('c.createdAt', 'DESC')
      // Ties broken on the primary key so page 2 cannot repeat a row from page 1.
      .addOrderBy('c.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  /** One clinic, with the practitioners attached to it. */
  async getClinicDetail(id: string, scope?: string) {
    const clinic = await this.clinicInMarket(id, scope, 'clinic');
    const doctors = await this.doctorRepo
      .createQueryBuilder('doctor')
      .select(this.DOCTOR_COLUMNS)
      .where('doctor.clinicId = :clinicId', { clinicId: clinic.id })
      .orderBy('doctor.name', 'ASC')
      .take(100)
      .getMany();

    return { ...clinic, doctors, doctorCount: doctors.length };
  }

  /**
   * Approve one clinic, and record who did it — and re-attribute its
   * practitioners whether or not there was anything left to approve.
   *
   * Approving a clinic re-stamps its practitioners: until the clinic is live its
   * doctors may never have been attributed at all, and the market they belong to
   * is the clinic's. The count is returned so the console can say what the
   * decision actually changed.
   *
   * ── Why an already-active clinic is a 200 and not a 400 (M6 review, I-1) ───
   *
   * This opened with `if (clinic.status === 'active') throw new
   * BadRequestException(…)`, which is the obvious guard and was the wrong one:
   * it closed the module's ONLY bulk re-stamp against exactly the clinics that
   * need it. Every clinic on the live databases is already `active` while its
   * `region_code` is still NULL, so the sequence M11 has to perform — seed
   * `clinics.region_code`, then attribute the practitioners hanging off them —
   * had no route through this handler at all.
   *
   * So an already-approved clinic is no longer an error: the approval is a
   * no-op and the RE-ATTRIBUTION still runs. `alreadyApproved: true` says which
   * happened, so a console can word its confirmation honestly rather than
   * claiming a decision was taken.
   *
   * **`approvedBy`/`approvedAt` are left alone in that case.** They are the only
   * record of who first let this clinic trade and there is no history table; a
   * re-attribution is not a second approval and must not overwrite the first
   * one's author.
   *
   * ── Why this rather than a new `admin.doctor.reattributeClinic` command ────
   *
   * The smaller change by a wide margin, and the better-shaped one. A new
   * command needs a backend `@MessagePattern`, a gateway route, a DTO, a
   * permission key, a row in the contract spec's command census and an entry in
   * both orphan baselines — six surfaces, in two workspaces, two of which are
   * shared census files this round treats as foreign. Against that it would buy
   * a second name for something an administrator would reach for under the name
   * "approve this clinic" anyway: the fix here is to stop refusing work the
   * handler already does correctly, not to build a second door to it.
   *
   * The bulk path is still not the whole answer, and is not meant to be — it
   * reaches one clinic at a time. `npm run backfill:markets`
   * (`src/admin/market-backfill.ts`) is the re-runnable task that sweeps every
   * clinic on a database at once.
   */
  async approveClinic(d: AdminIdMsg) {
    const clinic = await this.clinicInMarket(d.id ?? '', d.scope, 'clinic');
    const alreadyApproved = clinic.status === 'active';

    if (!alreadyApproved) {
      clinic.status = 'active';
      clinic.approvedBy = d.actorId ?? null;
      clinic.approvedAt = new Date();
    }
    const saved = alreadyApproved ? clinic : await this.clinicRepo.save(clinic);

    // `IS DISTINCT FROM` rather than `IS NULL`: this is the clinic's OWN
    // practitioners and the clinic's market is the answer for all of them, so a
    // row carrying a stale market from a previous clinic is corrected here too.
    // The whole-database sweep (`backfill-markets.ts`) is deliberately narrower
    // — NULL only — because it has no such statement to make about a row it did
    // not load through a specific clinic.
    const stamped = clinic.regionCode
      ? await this.doctorRepo
          .createQueryBuilder()
          .update(Doctor)
          .set({ regionCode: clinic.regionCode })
          .where('"clinicId" = :clinicId', { clinicId: clinic.id })
          .andWhere('region_code IS DISTINCT FROM :market', { market: clinic.regionCode })
          .execute()
      : { affected: 0 };

    await this.kafka.publish('doctor.clinic.approved', {
      id: saved.id,
      name: saved.name,
      market: saved.regionCode ?? null,
      alreadyApproved,
      practitionersAttributed: stamped.affected ?? 0,
      actorId: d.actorId ?? null,
    });

    return {
      success: true,
      id: saved.id,
      status: saved.status,
      market: saved.regionCode ?? null,
      alreadyApproved,
      practitionersAttributed: stamped.affected ?? 0,
    };
  }

  // ── Doctors ────────────────────────────────────────────────────────────────

  /**
   * The practitioner directory, narrowed to the caller's market.
   *
   * This is the read that used to REFUSE every scoped caller. It filters now,
   * because `doctors.region_code` exists; a practitioner with no market is
   * absent from a scoped list and present in a global one, which is what an
   * unattributed row means everywhere else on this platform.
   */
  async listDoctors(q: AdminDoctorListMsg) {
    const market = this.market(q.scope, q.countryCode, 'those doctors');
    const { page, limit, skip } = this.page(q);
    const status = this.status(q.status, DOCTOR_STATUSES, 'doctor');

    const qb = this.doctorRepo
      .createQueryBuilder('doctor')
      .leftJoin('doctor.clinic', 'clinic')
      .addSelect(['clinic.id', 'clinic.name', 'clinic.regionCode'])
      .leftJoin('doctor.hospital', 'hospital')
      .addSelect(['hospital.id', 'hospital.name']);
    applyMarketFilter(qb, 'doctor.regionCode', market);
    if (status) qb.andWhere('doctor.status = :status', { status });
    if (q.specialty) qb.andWhere('doctor.specialty ILIKE :spec', { spec: `%${q.specialty}%` });

    const [data, total] = await qb
      .orderBy('doctor.name', 'ASC')
      .addOrderBy('doctor.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  /** One practitioner, with their clinic, hospital and recent activity counts. */
  async getDoctorDetail(id: string, scope?: string) {
    const doctor = await this.doctorInMarket(id, scope, 'doctor');
    const full = await this.doctorRepo.findOne({
      where: { id: doctor.id },
      relations: { clinic: true, hospital: true },
    });
    if (!full) throw new NotFoundException('No doctor with that id');

    const [appointments, prescriptions] = await Promise.all([
      this.appointmentRepo.count({ where: { doctorId: doctor.id } }),
      this.prescriptionRepo.count({ where: { doctorId: doctor.id } }),
    ]);

    // `doctorInMarket` refreshed the copy in memory; `full` was loaded again for
    // its relations, so carry the refreshed value across rather than showing the
    // stored one the caller was NOT judged against.
    return {
      ...full,
      regionCode: doctor.regionCode,
      appointmentCount: appointments,
      prescriptionCount: prescriptions,
    };
  }

  /**
   * Verify — or refuse to verify — one practitioner's credentials.
   *
   * Before M6 this was a `status` move and nothing else, which is the same
   * column a suspension moves: the two decisions overwrote one another and
   * neither left a trace of who took it. `isVerified`, `verifiedBy`, `verifiedAt`
   * and `verificationNotes` are the record; `status` moves to `active` only on a
   * positive decision, and a refusal leaves the practitioner where they were
   * rather than suspending them by implication.
   */
  async verifyDoctor(d: AdminVerifyDoctorMsg) {
    if (typeof d.verified !== 'boolean') {
      throw new BadRequestException('verified must be true or false.');
    }
    const doctor = await this.doctorInMarket(d.id ?? '', d.scope, 'doctor');

    doctor.isVerified = d.verified;
    doctor.verifiedBy = d.actorId ?? null;
    doctor.verifiedAt = new Date();
    doctor.verificationNotes = d.notes ?? null;
    if (d.verified && doctor.status === 'pending') doctor.status = 'active';
    const saved = await this.doctorRepo.save(doctor);

    await this.kafka.publish('doctor.verified', {
      id: saved.id,
      verified: saved.isVerified,
      market: saved.regionCode ?? null,
      actorId: d.actorId ?? null,
    });

    return {
      success: true,
      id: saved.id,
      isVerified: saved.isVerified,
      status: saved.status,
      market: saved.regionCode ?? null,
    };
  }

  /**
   * Suspend one practitioner, with the reason on the row.
   *
   * The reason is REQUIRED. The gateway used to take `{ reason: string }` on an
   * inline type and this module had nowhere to put it, so a practitioner went
   * offline with no record of why — the same gap `suspendHotel` had before M5.
   *
   * The event is the module's existing `doctor.status_changed`, not a new
   * `doctor.suspended`: a suspension IS a status change, and a second spelling
   * of one event is how two consumers come to disagree about whether a
   * practitioner is live.
   */
  async suspendDoctor(d: AdminSuspendDoctorMsg) {
    const reason = String(d.reason ?? '').trim();
    if (reason.length < 3) {
      throw new BadRequestException('A suspension reason is required.');
    }
    const doctor = await this.doctorInMarket(d.id ?? '', d.scope, 'doctor');

    doctor.status = 'suspended';
    doctor.suspendedBy = d.actorId ?? null;
    doctor.suspendedAt = new Date();
    doctor.suspensionReason = reason;
    const saved = await this.doctorRepo.save(doctor);

    await this.kafka.publish('doctor.status_changed', {
      doctorId: saved.id,
      status: saved.status,
      reason,
      market: saved.regionCode ?? null,
      actorId: d.actorId ?? null,
    });

    return {
      success: true,
      id: saved.id,
      status: saved.status,
      market: saved.regionCode ?? null,
    };
  }

  // ── Appointments ───────────────────────────────────────────────────────────

  /**
   * Every appointment in the caller's market, reached through the practitioner.
   *
   * `appointments` carries `doctorId` and nothing else, so this is the documented
   * join `appointment → doctor → region_code`. An appointment whose practitioner
   * has no market is absent from a scoped list for the same reason the
   * practitioner is.
   */
  async listAppointments(q: AdminAppointmentListMsg) {
    const market = this.market(q.scope, q.countryCode, 'those appointments');
    const { page, limit, skip } = this.page(q);
    const status = this.status(q.status, APPOINTMENT_STATUSES, 'appointment');
    if (q.date && !ISO_DATE.test(q.date)) {
      throw new BadRequestException('date must be an ISO date, YYYY-MM-DD.');
    }

    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin('a.doctor', 'doctor')
      .addSelect(this.DOCTOR_COLUMNS);
    applyMarketFilter(qb, 'doctor.regionCode', market);
    if (status) qb.andWhere('a.status = :status', { status });
    if (q.date) qb.andWhere('a.date = :date', { date: q.date });

    const [data, total] = await qb
      .orderBy('a.date', 'DESC')
      .addOrderBy('a.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  /** The prescription audit trail, through the same practitioner join. */
  async listPrescriptions(q: AdminListMsg) {
    const market = this.market(q.scope, q.countryCode, 'those prescriptions');
    const { page, limit, skip } = this.page(q);
    const status = this.status(q.status, PRESCRIPTION_STATUSES, 'prescription');

    const qb = this.prescriptionRepo
      .createQueryBuilder('p')
      .innerJoin('p.doctor', 'doctor')
      .addSelect(this.DOCTOR_COLUMNS);
    applyMarketFilter(qb, 'doctor.regionCode', market);
    if (status) qb.andWhere('p.status = :status', { status });

    const [data, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  // ── Specialties — one catalogue, every market ──────────────────────────────

  /**
   * The taxonomy, with the number of practitioners in it per specialty.
   *
   * Deliberately GLOBAL and unfiltered: "Hepatology" is the same specialty in
   * Doha and in Delhi, and the gateway marks this read `@GlobalEntity`. A scoped
   * caller reads it; only the write is withheld.
   *
   * `doctorCount` on the row is a stored counter nothing maintains, so it is
   * recomputed here rather than reported: a catalogue screen showing a count
   * that has been zero since the table was created is worse than one with no
   * count at all.
   */
  async listSpecialties() {
    const catalogue = await this.specialtyRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    const counts = await this.doctorRepo
      .createQueryBuilder('doctor')
      .select('LOWER(doctor.specialty)', 'specialty')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('LOWER(doctor.specialty)')
      .getRawMany<{ specialty: string; count: number }>();
    const usage = new Map(counts.map((r) => [r.specialty, numeric(r.count)]));

    const data = catalogue.map((s) => ({
      ...s,
      doctorCount: usage.get(s.name.trim().toLowerCase()) ?? 0,
    }));
    return {
      data,
      total: data.length,
      // `doctorCount` is EVERY market's, because the catalogue is global and
      // this read is not scoped. Saying so in the PAYLOAD rather than only in
      // this method's docstring: a QA administrator reading "Cardiology: 14" on
      // a screen that is otherwise their own market's reads a platform number as
      // theirs. Same marker, same reasoning and same spelling as hotel's global
      // amenity catalogue (M5 review Minor 4, applied here as M6 review M-2).
      countScope: 'platform',
    };
  }

  /**
   * Add one entry to the global catalogue.
   *
   * `refuseUnattributable` is the SECOND line: the gateway already refuses a
   * region-locked administrator with `refuseLockedAdmin`, and this refuses one
   * again for a caller that reached this service over TCP by any other path.
   * Editing a global taxonomy changes every other market's directory along with
   * the caller's own, which is not a regional administrator's decision to take.
   */
  async createSpecialty(d: AdminSpecialtyMsg) {
    refuseUnattributable(
      d.scope,
      'doctor specialty',
      this.logger,
      'Doctor taxonomy is managed globally.',
    );

    const name = String(d.name ?? '').trim();
    if (!name) throw new BadRequestException('A specialty name is required.');
    const slug = specialtySlug(name);
    if (!slug)
      throw new BadRequestException('A specialty name needs at least one letter or digit.');

    const existing = await this.specialtyRepo.findOne({ where: { slug } });
    if (existing) throw new BadRequestException(`Specialty "${existing.name}" already exists`);

    const saved = await this.specialtyRepo.save(
      this.specialtyRepo.create({
        name,
        slug,
        icon: d.icon ?? null,
        description: d.description ?? null,
        createdBy: d.actorId ?? null,
      }),
    );

    await this.kafka.publish('doctor.specialty.created', {
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
      actorId: d.actorId ?? null,
    });
    return saved;
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  /**
   * The market's own figures for a window, and nothing else's.
   *
   * Every leg carries the predicate through the practitioner join. The period is
   * whitelisted rather than parsed: an unrecognised window used to silently
   * become "all time" in reads of this shape elsewhere on the platform, which is
   * a report that says one thing and shows another.
   */
  async getReports(q: AdminReportMsg) {
    const market = this.market(q.scope, q.countryCode, 'those reports');
    const period = q.period ?? '30d';
    const days = PERIOD_DAYS[period];
    if (!days) {
      throw new BadRequestException(
        `"${period}" is not a report period. One of: ${Object.keys(PERIOD_DAYS).join(', ')}`,
      );
    }
    const since = this.since(days);

    const appointmentsQb = this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin('a.doctor', 'doctor')
      .select('a.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(a.fee), 0)', 'fee')
      .addSelect('COALESCE(SUM(a."platformFee"), 0)', 'platformFee')
      .where('a.createdAt >= :since', { since })
      .groupBy('a.status');
    applyMarketFilter(appointmentsQb, 'doctor.regionCode', market);
    const byStatus = await appointmentsQb.getRawMany<{
      status: string;
      count: number;
      fee: string;
      platformFee: string;
    }>();

    // Walked from the APPOINTMENT side so the join is the module's own relation
    // (`a.doctor`) rather than a table name typed by hand — a raw table name
    // here would miss the `doctor` schema every entity declares.
    //
    // `doctor.regionCode`, the PROPERTY path, not the `doctor.region_code`
    // column spelling this originally carried. TypeORM rewrites a property path
    // it recognises and leaves an unrecognised `alias.x` untouched, so the column
    // spelling worked only by coincidence — and renaming the column on the
    // entity would have broken this one query silently while every other clause
    // in this file, all of which use the property path, kept working
    // (M6 review M-3; the inverse of `project_typeorm_orderby_property_names`).
    const topQb = this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin('a.doctor', 'doctor')
      .select('doctor.id', 'id')
      .addSelect('doctor.name', 'name')
      .addSelect('doctor.regionCode', 'market')
      .addSelect('COUNT(a.id)::int', 'appointments')
      .where('a.createdAt >= :since', { since })
      .groupBy('doctor.id')
      .addGroupBy('doctor.name')
      .addGroupBy('doctor.regionCode')
      .orderBy('COUNT(a.id)', 'DESC')
      .addOrderBy('doctor.id', 'ASC')
      .limit(10);
    applyMarketFilter(topQb, 'doctor.regionCode', market);
    const topDoctors = await topQb.getRawMany<{
      id: string;
      name: string;
      market: string | null;
      appointments: number;
    }>();

    const newClinicsQb = this.clinicRepo
      .createQueryBuilder('c')
      .where('c.createdAt >= :since', { since });
    applyMarketFilter(newClinicsQb, 'c.regionCode', market);

    const newDoctorsQb = this.doctorRepo
      .createQueryBuilder('doctor')
      .where('doctor.createdAt >= :since', { since });
    applyMarketFilter(newDoctorsQb, 'doctor.regionCode', market);

    const [newClinics, newDoctors] = await Promise.all([
      newClinicsQb.getCount(),
      newDoctorsQb.getCount(),
    ]);

    const appointments = byStatus.reduce((n, r) => n + numeric(r.count), 0);
    const earned = byStatus.filter((r) => EARNED_APPOINTMENT_STATES.includes(r.status));

    return {
      market: market ?? null,
      period,
      since: since.toISOString(),
      appointments,
      appointmentsByStatus: byStatus.map((r) => ({
        status: r.status,
        count: numeric(r.count),
        fee: money(r.fee),
        platformFee: money(r.platformFee),
      })),
      consultationRevenue: money(earned.reduce((n, r) => n + numeric(r.fee), 0)),
      platformRevenue: money(earned.reduce((n, r) => n + numeric(r.platformFee), 0)),
      newClinics,
      newDoctors,
      topDoctors: topDoctors.map((r) => ({ ...r, appointments: numeric(r.appointments) })),
    };
  }

  // ── Market settings ────────────────────────────────────────────────────────

  /** The configuration row for one market, or null when nothing has been set. */
  private async settingsRow(market: string): Promise<DoctorMarketSettings | null> {
    const qb = this.settingsRepo.createQueryBuilder('s');
    applyMarketFilter(qb, 's.regionCode', market);
    return qb.getOne();
  }

  /**
   * What a market's configuration IS, whether or not a row has been written.
   *
   * The values below are the column defaults — the figures actually in force for
   * a market nobody has configured — and `configured: false` says so, so the
   * console can show the effective numbers without presenting them as decisions
   * somebody took.
   */
  private settingsView(market: string, row: DoctorMarketSettings | null) {
    return {
      regionCode: market,
      configured: row !== null,
      platformFeePercent: row ? money(row.platformFeePercent) : 0,
      commissionPercent: row ? money(row.commissionPercent) : 0,
      autoApproveClinics: row ? row.autoApproveClinics : false,
      maxAppointmentsPerDoctorPerDay: row ? numeric(row.maxAppointmentsPerDoctorPerDay) : 50,
      cancellationWindowHours: row ? numeric(row.cancellationWindowHours) : 4,
      prescriptionValidityDays: row ? numeric(row.prescriptionValidityDays) : 30,
      updatedBy: row?.updatedBy ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  /** Every configuration row the caller may see, for the "all markets" view. */
  private async settingsForScope(market: string | undefined) {
    const qb = this.settingsRepo.createQueryBuilder('s');
    applyMarketFilter(qb, 's.regionCode', market);
    const rows = await qb.orderBy('s.regionCode', 'ASC').getMany();
    return rows.map((r) => this.settingsView(r.regionCode, r));
  }

  async getSettings(q: AdminReportMsg) {
    const market = this.market(q.scope, q.countryCode, 'those settings');
    return {
      market: market ?? null,
      settings: market ? this.settingsView(market, await this.settingsRow(market)) : null,
      markets: await this.settingsForScope(market),
    };
  }

  /** Load-or-create the row, asserting the caller may write to that market. */
  private async settingsToWrite(market: string, scope: string | undefined, what: string) {
    const existing = await this.settingsRow(market);
    if (existing) {
      assertInMarket(existing.regionCode, scope, what, this.logger);
      return existing;
    }
    assertInMarket(market, scope, what, this.logger);
    return this.settingsRepo.create({ regionCode: market });
  }

  async updateSettings(d: AdminSettingsMsg) {
    const what = 'those settings';
    const market = this.writeMarket(d.scope, d.countryCode, what);
    const row = await this.settingsToWrite(market, d.scope, what);

    const changed: string[] = [];
    if (d.platformFeePercent !== undefined) {
      row.platformFeePercent = numeric(d.platformFeePercent);
      changed.push('platformFeePercent');
    }
    if (d.commissionPercent !== undefined) {
      row.commissionPercent = numeric(d.commissionPercent);
      changed.push('commissionPercent');
    }
    if (d.autoApproveClinics !== undefined) {
      row.autoApproveClinics = Boolean(d.autoApproveClinics);
      changed.push('autoApproveClinics');
    }
    if (d.maxAppointmentsPerDoctorPerDay !== undefined) {
      row.maxAppointmentsPerDoctorPerDay = numeric(d.maxAppointmentsPerDoctorPerDay);
      changed.push('maxAppointmentsPerDoctorPerDay');
    }
    if (d.cancellationWindowHours !== undefined) {
      row.cancellationWindowHours = numeric(d.cancellationWindowHours);
      changed.push('cancellationWindowHours');
    }
    if (d.prescriptionValidityDays !== undefined) {
      row.prescriptionValidityDays = numeric(d.prescriptionValidityDays);
      changed.push('prescriptionValidityDays');
    }
    if (!changed.length) {
      throw new BadRequestException('Nothing to update: name at least one setting.');
    }

    row.updatedBy = d.actorId ?? null;
    const saved = await this.settingsRepo.save(row);

    await this.kafka.publish('doctor.settings.updated', {
      id: saved.id,
      market: saved.regionCode,
      changed,
      actorId: d.actorId ?? null,
    });
    return this.settingsView(saved.regionCode, saved);
  }
}
