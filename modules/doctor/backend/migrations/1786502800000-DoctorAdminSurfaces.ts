import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — the market a practitioner never had, and storage for the doctor
 * admin console's twelve new commands (M6).
 *
 * ── A practitioner had no market ────────────────────────────────────────────
 *
 * `doctor.doctors` carried a nullable `clinicId` and a nullable `hospitalId` and
 * nothing else that places a person anywhere, so the admin directory failed
 * CLOSED for every regional administrator (`refuseUnattributable` in
 * `doctor.controller.ts`): correct, and unusable — a QA-locked administrator
 * could not see a single QA practitioner. AUD2-119's ruling for this module is
 * to denormalise the market onto the row rather than join it at read time,
 * because a doctor may have NEITHER parent and a three-way LEFT JOIN that can
 * produce NULL is not a predicate a reviewer can check. With the column here,
 * `appointments` and `doctor_prescriptions` — which carry `doctorId` and nothing
 * else — become attributable through the one documented join
 * `appointment → doctor → region_code`.
 *
 * ── Only ONE side of the backfill exists ────────────────────────────────────
 *
 * The brief sketches two `UPDATE`s, one from `clinics` and one from `hospitals`.
 * **`doctor.hospitals` has no market column of any kind** — no `region_code`, no
 * `country_code`, nothing (checked against `hospital.entity.ts`, which is why
 * `DoctorService.updateHospitalStatus` refuses a locked caller outright). The
 * second `UPDATE` is therefore dropped rather than invented: there is no value
 * to copy, and writing one would be fabricating an attribution.
 *
 * **Which side wins:** the clinic, because it is the only side that can answer.
 * A practitioner attached to both a clinic and a hospital takes the CLINIC's
 * market; a practitioner attached only to a hospital, or to neither, keeps
 * `region_code IS NULL` and stays invisible to a regional administrator — by
 * design, and reported as a count rather than quietly widened. When `hospitals`
 * gains a market column, the second `UPDATE` belongs in a migration of its own,
 * and this docstring is the record of why it is not here.
 *
 * Every `UPDATE` is guarded `WHERE region_code IS NULL`, so re-running this
 * migration on a database where a value has since been written by hand or by
 * the service never overwrites it.
 *
 * ── The other half: the console's decisions had nowhere to be recorded ──────
 *
 *   • `doctors` — `verifyDoctor` and `suspendDoctor` are decisions about a
 *     person's licence and livelihood, and the table had no verification state
 *     at all and no record of WHO changed a status or why. A practitioner went
 *     offline with the same trace a cron job would leave.
 *   • `clinics` — `approveClinic` moved `status` and recorded nothing else.
 *   • `specialties` — `createSpecialty` writes to the global taxonomy; who added
 *     an entry is worth keeping.
 *   • `doctor.doctor_market_settings` — `settings`/`updateSettings` configure a
 *     MARKET, and this module had no market-level row of any kind. Answering
 *     them from a constant would have been exactly the placeholder API the
 *     MODULES plan exists to remove. `region_code` is NOT NULL and UNIQUE: a
 *     settings row belongs to one market and to no clinic, and a NULL would be a
 *     row every scoped administrator can see and none can edit.
 *
 * ── Idempotent throughout ───────────────────────────────────────────────────
 *
 * `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE/INDEX IF NOT EXISTS`, because
 * these tables may already have been extended by `synchronize` on a developer
 * machine before the runner existed — the starting-state problem
 * `DropDeadMarketColumns` documents in the sibling modules.
 *
 * ── `down()` ────────────────────────────────────────────────────────────────
 *
 * Drops what `up()` creates, in the reverse order. Reverting this removes every
 * market's doctor configuration and every practitioner's attribution: a doctor
 * whose clinic has since changed market cannot be recovered from the join. It is
 * a schema rollback, not a data one, and it says so here rather than in a report.
 */
export class DoctorAdminSurfaces1786502800000 implements MigrationInterface {
  name = 'DoctorAdminSurfaces1786502800000';

  /** Whether a table this migration means to extend is in this database at all. */
  private async hasTable(q: QueryRunner, table: string): Promise<boolean> {
    const [{ exists }] = await q.query(`SELECT to_regclass('${table}') IS NOT NULL AS exists`);
    if (!exists) console.warn(`[DoctorAdminSurfaces] ${table} is not in this database; skipping.`);
    return Boolean(exists);
  }

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "doctor"`);

    // ── The market column, and the one backfill that has a source ────────────
    if (await this.hasTable(q, 'doctor.doctors')) {
      await q.query(`
        ALTER TABLE "doctor"."doctors"
          ADD COLUMN IF NOT EXISTS "region_code" character varying,
          ADD COLUMN IF NOT EXISTS "isVerified" boolean NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS "verifiedBy" character varying,
          ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "verificationNotes" text,
          ADD COLUMN IF NOT EXISTS "suspendedBy" character varying,
          ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "suspensionReason" text
      `);

      // The clinic is the only parent that carries a market. `WHERE region_code
      // IS NULL` so a value already written is never overwritten.
      if (await this.hasTable(q, 'doctor.clinics')) {
        await q.query(`
          UPDATE "doctor"."doctors" d
             SET "region_code" = c."region_code"
            FROM "doctor"."clinics" c
           WHERE d."clinicId" = c."id"
             AND c."region_code" IS NOT NULL
             AND d."region_code" IS NULL
        `);
      }

      // NOT the second UPDATE from the brief: `doctor.hospitals` has no market
      // column to copy from. See this class's docstring.

      await q.query(
        `CREATE INDEX IF NOT EXISTS "IDX_doctors_region_code" ON "doctor"."doctors" ("region_code")`,
      );
      for (const [column, comment] of [
        [
          'region_code',
          'The market this practitioner works in, denormalised from their clinic. NULL means unattributed: refused for a region-locked admin, never widened',
        ],
        ['isVerified', "Whether an administrator has verified this practitioner's credentials"],
        ['verifiedBy', 'The administrator who last took the verification decision'],
        ['verificationNotes', 'What the administrator recorded with that decision'],
        ['suspendedBy', 'The administrator who suspended this practitioner'],
        ['suspensionReason', 'Why this practitioner was suspended'],
      ] as const) {
        await q.query(
          `COMMENT ON COLUMN "doctor"."doctors"."${column}" IS '${comment.replace(/'/g, "''")}'`,
        );
      }
    }

    // ── Who approved a clinic, and when ──────────────────────────────────────
    if (await this.hasTable(q, 'doctor.clinics')) {
      await q.query(`
        ALTER TABLE "doctor"."clinics"
          ADD COLUMN IF NOT EXISTS "approvedBy" character varying,
          ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP WITH TIME ZONE
      `);
      await q.query(
        `COMMENT ON COLUMN "doctor"."clinics"."approvedBy" IS 'The administrator who approved this clinic'`,
      );
    }

    // ── Who added an entry to the global taxonomy ────────────────────────────
    if (await this.hasTable(q, 'doctor.specialties')) {
      await q.query(`
        ALTER TABLE "doctor"."specialties"
          ADD COLUMN IF NOT EXISTS "createdBy" character varying
      `);
      await q.query(
        `COMMENT ON COLUMN "doctor"."specialties"."createdBy" IS 'The administrator who added this specialty, from the verified token'`,
      );
    }

    // ── One configuration row per market ─────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS "doctor"."doctor_market_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "region_code" character varying NOT NULL,
        "platformFeePercent" numeric(5,2) NOT NULL DEFAULT '0',
        "commissionPercent" numeric(5,2) NOT NULL DEFAULT '0',
        "autoApproveClinics" boolean NOT NULL DEFAULT false,
        "maxAppointmentsPerDoctorPerDay" integer NOT NULL DEFAULT 50,
        "cancellationWindowHours" integer NOT NULL DEFAULT 4,
        "prescriptionValidityDays" integer NOT NULL DEFAULT 30,
        "updatedBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_market_settings_id" PRIMARY KEY ("id")
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_doctor_market_settings_region" ON "doctor"."doctor_market_settings" ("region_code")`,
    );
    for (const [column, comment] of [
      ['region_code', 'The market this configuration applies to'],
      ['platformFeePercent', 'Platform fee percentage added to a consultation'],
      ['commissionPercent', "The platform's cut of a practitioner's consultation fee"],
      [
        'autoApproveClinics',
        'Whether a new clinic in this market goes live without a human decision',
      ],
      ['maxAppointmentsPerDoctorPerDay', 'Upper bound on appointments one practitioner may take'],
      ['cancellationWindowHours', 'Hours before an appointment during which cancellation is free'],
      ['prescriptionValidityDays', 'How long a prescription issued in this market stays valid'],
      ['updatedBy', 'The administrator who last wrote this row, from the verified token'],
    ] as const) {
      await q.query(
        `COMMENT ON COLUMN "doctor"."doctor_market_settings"."${column}" IS '${comment.replace(/'/g, "''")}'`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "doctor"."IDX_doctor_market_settings_region"`);
    await q.query(`DROP TABLE IF EXISTS "doctor"."doctor_market_settings"`);

    if (await this.hasTable(q, 'doctor.specialties')) {
      await q.query(`ALTER TABLE "doctor"."specialties" DROP COLUMN IF EXISTS "createdBy"`);
    }
    if (await this.hasTable(q, 'doctor.clinics')) {
      await q.query(`
        ALTER TABLE "doctor"."clinics"
          DROP COLUMN IF EXISTS "approvedAt",
          DROP COLUMN IF EXISTS "approvedBy"
      `);
    }
    if (await this.hasTable(q, 'doctor.doctors')) {
      await q.query(`DROP INDEX IF EXISTS "doctor"."IDX_doctors_region_code"`);
      await q.query(`
        ALTER TABLE "doctor"."doctors"
          DROP COLUMN IF EXISTS "suspensionReason",
          DROP COLUMN IF EXISTS "suspendedAt",
          DROP COLUMN IF EXISTS "suspendedBy",
          DROP COLUMN IF EXISTS "verificationNotes",
          DROP COLUMN IF EXISTS "verifiedAt",
          DROP COLUMN IF EXISTS "verifiedBy",
          DROP COLUMN IF EXISTS "isVerified",
          DROP COLUMN IF EXISTS "region_code"
      `);
    }
  }
}
