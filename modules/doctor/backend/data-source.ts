import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Doctor } from './src/entities/doctor.entity';
import { Appointment } from './src/entities/appointment.entity';
import { DoctorAvailability } from './src/entities/doctor-availability.entity';
import { Hospital } from './src/entities/hospital.entity';
import { Clinic } from './src/entities/clinic.entity';
import { Specialty } from './src/entities/specialty.entity';
import { Department } from './src/entities/department.entity';
import { Review } from './src/entities/review.entity';
import { Document } from './src/entities/document.entity';
import { Prescription } from './src/entities/prescription.entity';
import { PrescriptionItem } from './src/entities/prescription-item.entity';
import { FamilyMember } from './src/entities/family-member.entity';
import { IntakeForm } from './src/entities/intake-form.entity';

/**
 * The TypeORM CLI's DataSource for the **doctor module's own** database.
 * **Migrations only**; no application code imports this.
 *
 *     npm run migration:show      # what is pending here
 *     npm run migration:run       # apply it
 *     npm run migration:revert    # undo the last one
 *     npm run migration:generate -- migrations/AddSomething
 *
 * ── Why this file exists (IN3) ──────────────────────────────────────────────
 *
 * Until now this module had no migration runner at all. Its thirteen tables
 * came from `synchronize`, which was on for every non-production `NODE_ENV` —
 * a development convenience with a destructive edge, not a deployment path.
 * Narrowing a column in an entity made `synchronize` DROP and recreate it on
 * the next boot, emptying the rows that had a value (three times during the
 * regional plan). As of IN3 `synchronize` defaults to false in every
 * environment and this directory is the only thing that builds the schema.
 *
 * ── The two lists that must not drift ───────────────────────────────────────
 *
 *   • `entities` is written out explicitly and copied verbatim from `ENTITIES`
 *     in `src/doctor-service.module.ts`. It has to be populated, not `[]`:
 *     `migration:generate` diffs the entities against a database, so an empty
 *     list diffs nothing against everything and emits a DROP for every table.
 *     A *partial* list does the same for the tables it omits, which is why the
 *     generate procedure in `docs/guides/database-migrations.md` greps the
 *     emitted SQL for DROP before the file is kept. Never a `__dirname` glob:
 *     a bundled build makes one match nothing.
 *   • `migrations` names every file rather than globbing them, and
 *     `apps/api/test/module-data-sources.spec.ts` fails when a file in
 *     `migrations/` is missing from it or named twice.
 *
 * Credentials resolve `DOCTOR_DB_*` first and `DB_*` second, exactly as
 * `doctor-service.module.ts` does, so the runner and the service can never
 * reach different databases — in dev that difference is real: the module's own
 * `.env` points at `kartseek_doctor` on :5437 while `DB_*` is the shared
 * instance on :5432.
 *
 * `dotenv/config` reads `.env` from the process's working directory, so **run
 * these scripts from this directory**. Run them from the repository root and
 * `DOCTOR_DB_*` is unset, `DB_*` answers instead, and the migration lands in
 * the shared database's `doctor` schema.
 */
export const DoctorDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DOCTOR_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DOCTOR_DB_PORT || process.env.DB_PORT || 5437),
  username: process.env.DOCTOR_DB_USER || process.env.DB_USER || 'doctor_user',
  password:
    process.env.DOCTOR_DB_PASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
  database: process.env.DOCTOR_DB_NAME || process.env.DB_NAME || 'kartseek_doctor',
  schema: 'doctor',
  entities: [
    Doctor,
    Appointment,
    DoctorAvailability,
    Hospital,
    Clinic,
    Specialty,
    Department,
    Review,
    Document,
    Prescription,
    PrescriptionItem,
    FamilyMember,
    IntakeForm,
  ],
  migrations: ['migrations/1786498400000-InitialDoctorSchema.ts'],
  migrationsTableName: 'migrations',
  // One transaction per migration: a failure rolls that migration back and
  // leaves every earlier one applied.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
