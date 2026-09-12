import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The doctor module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the doctor database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/doctor-service.module.ts`), and this is the schema.
 *
 * ── Why every statement in up() is guarded ──────────────────────────────────
 *
 * The dev and staging databases already hold these tables — `synchronize` built
 * them, with no ledger row to say so. This migration has to be recordable
 * against those without dropping a single row, so `up()` is idempotent:
 * `CREATE TABLE` / `CREATE INDEX` carry `IF NOT EXISTS`, and the two statements
 * Postgres has no `IF NOT EXISTS` for — `CREATE TYPE` and
 * `ALTER TABLE … ADD CONSTRAINT` — run inside a DO block that swallows
 * `duplicate_object` and nothing else. An existing table is skipped whole,
 * its COMMENTs included, so a column that has drifted since cannot fail the
 * run. On an empty database every guard is a no-op and this builds the schema.
 *
 * ── down() ─────────────────────────────────────────────────────────────────
 *
 * The generated reverse: it DROPs every table up() creates. That is the honest
 * inverse of an initial schema, and it is what `npm run migration:revert` will
 * do to the module's whole database. Read the ledger before running it.
 */
export class InitialDoctorSchema1786498400000 implements MigrationInterface {
  name = 'InitialDoctorSchema1786498400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."hospitals_status_enum" AS ENUM('pending', 'active', 'suspended', 'blocked', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."hospitals_hospitaltype_enum" AS ENUM('multi-speciality', 'super-speciality', 'general', 'eye', 'dental', 'maternity', 'children', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."hospitals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "slug" character varying(200) NOT NULL, "specialties" text, "location" character varying(500) NOT NULL, "address" character varying(500), "city" character varying(100), "latitude" numeric(10,7), "longitude" numeric(10,7), "rating" numeric(3,2) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "isOpen" boolean NOT NULL DEFAULT true, "openHours" character varying(100), "about" text, "facilities" text, "images" text, "coverImage" character varying(500), "doctorCount" integer NOT NULL DEFAULT '0', "status" "doctor"."hospitals_status_enum" NOT NULL DEFAULT 'pending', "ownerId" character varying, "phone" character varying(20), "email" character varying(200), "website" character varying(200), "registrationNo" character varying(100), "hospitalType" "doctor"."hospitals_hospitaltype_enum" NOT NULL DEFAULT 'general', "bedCount" integer, "hasEmergency" boolean NOT NULL DEFAULT false, "hasAmbulance" boolean NOT NULL DEFAULT false, "hasPharmacy" boolean NOT NULL DEFAULT false, "hasLab" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_009c5a5f2b10253584417d685d9" UNIQUE ("slug"), CONSTRAINT "PK_02738c80d71453bc3e369a01766" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_009c5a5f2b10253584417d685d" ON "doctor"."hospitals" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c8721acd8ecadbc8792dc574e1" ON "doctor"."hospitals" ("city") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_279fb5c6a1bb0859ce7922c60e" ON "doctor"."hospitals" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."clinics_status_enum" AS ENUM('pending', 'active', 'suspended', 'blocked', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."clinics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "slug" character varying(200) NOT NULL, "specialties" text, "location" character varying(500) NOT NULL, "address" character varying(500), "city" character varying(100), "latitude" numeric(10,7), "longitude" numeric(10,7), "rating" numeric(3,2) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "doctorCount" integer NOT NULL DEFAULT '0', "todaySlots" integer NOT NULL DEFAULT '0', "about" text, "services" text, "workingHours" text, "coverImage" character varying(500), "images" text, "status" "doctor"."clinics_status_enum" NOT NULL DEFAULT 'pending', "ownerId" character varying, "phone" character varying(20), "email" character varying(200), "registrationNo" character varying(100), "franchise_id" character varying, "region_code" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1c4933755297e407da44d46031c" UNIQUE ("slug"), CONSTRAINT "PK_5513b659e4d12b01a8ab3956abc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1c4933755297e407da44d46031" ON "doctor"."clinics" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a2d0518524fc6a19d8e328f683" ON "doctor"."clinics" ("city") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a3a497d43b80e5f34675aacef7" ON "doctor"."clinics" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."doctors_consultmode_enum" AS ENUM('in-person', 'video', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."doctors_status_enum" AS ENUM('active', 'suspended', 'blocked', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."doctors_providertype_enum" AS ENUM('hospital', 'clinic', 'independent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."doctors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "slug" character varying(200) NOT NULL, "specialty" character varying(100) NOT NULL, "specialties" text, "qualifications" text, "experience" integer NOT NULL DEFAULT '0', "about" text, "languages" text, "profileImage" character varying(500), "fee" numeric(10,2) NOT NULL DEFAULT '0', "videoFee" numeric(10,2) NOT NULL DEFAULT '0', "rating" numeric(3,2) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "isAvailable" boolean NOT NULL DEFAULT true, "consultMode" "doctor"."doctors_consultmode_enum" NOT NULL DEFAULT 'both', "registrationNo" character varying(100), "status" "doctor"."doctors_status_enum" NOT NULL DEFAULT 'pending', "hospitalId" uuid, "clinicId" uuid, "hospitalName" character varying(200), "hospitalAddress" character varying(500), "city" character varying(100), "providerType" "doctor"."doctors_providertype_enum" NOT NULL DEFAULT 'independent', "complaints" integer NOT NULL DEFAULT '0', "phone" character varying(20), "email" character varying(200), "gender" character varying(200), "userId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_33c4883c04607c530c0c1858d93" UNIQUE ("slug"), CONSTRAINT "PK_8207e7889b50ee3695c2b8154ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_33c4883c04607c530c0c1858d9" ON "doctor"."doctors" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_738d9334429a42933b01e969a9" ON "doctor"."doctors" ("specialty") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bb6b34d0edf46148f12dcd0868" ON "doctor"."doctors" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b7c9cc719c797fa0e4f9e2b130" ON "doctor"."doctors" ("hospitalId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_01f41c4435b1e13060e05fdd55" ON "doctor"."doctors" ("clinicId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1777751b671a6d16774d03edfc" ON "doctor"."doctors" ("city") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0bbe41b415ae50167530fd99b8" ON "doctor"."doctors" ("providerType") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."appointments_type_enum" AS ENUM('in-clinic', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."appointments_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "doctorId" uuid NOT NULL, "customerId" character varying NOT NULL, "patientName" character varying(200) NOT NULL, "patientAge" integer, "patientGender" character varying(20), "date" date NOT NULL, "timeSlot" character varying(20) NOT NULL, "type" "doctor"."appointments_type_enum" NOT NULL DEFAULT 'in-clinic', "symptoms" text, "status" "doctor"."appointments_status_enum" NOT NULL DEFAULT 'CONFIRMED', "fee" numeric(10,2) NOT NULL DEFAULT '0', "platformFee" numeric(10,2) NOT NULL DEFAULT '0', "paymentId" character varying, "prescriptionNotes" text, "followUpDate" date, "tokenNumber" integer, "queuePosition" integer, "estimatedWaitMinutes" integer, "checkedInAt" TIMESTAMP WITH TIME ZONE, "consultationStartedAt" TIMESTAMP WITH TIME ZONE, "consultationEndedAt" TIMESTAMP WITH TIME ZONE, "notificationSentAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0c1af27b469cb8dca420c160d6" ON "doctor"."appointments" ("doctorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_60dbcf20669c096d319e20fca8" ON "doctor"."appointments" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6b8e84de5d15269b7f79187992" ON "doctor"."appointments" ("date") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3007a47d97a542e63b3308a69b" ON "doctor"."appointments" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."doctor_availability_consultmode_enum" AS ENUM('in-person', 'video', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."doctor_availability_locationtype_enum" AS ENUM('hospital', 'clinic', 'independent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."doctor_availability" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "doctorId" uuid NOT NULL, "dayOfWeek" integer NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "slotDurationMinutes" integer NOT NULL DEFAULT '30', "maxPatientsPerSlot" integer NOT NULL DEFAULT '1', "isActive" boolean NOT NULL DEFAULT true, "consultMode" "doctor"."doctor_availability_consultmode_enum" NOT NULL DEFAULT 'both', "locationId" character varying, "locationType" "doctor"."doctor_availability_locationtype_enum" NOT NULL DEFAULT 'independent', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3d2b4ffe9085f8c7f9f269aed89" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_7ebf8396e8918307342d6bcf82" ON "doctor"."doctor_availability" ("doctorId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."specialties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "icon" character varying(50), "description" text, "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "doctorCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6678765a8dcfa5597a6cdf71eb0" UNIQUE ("slug"), CONSTRAINT "PK_ba01cec5aa8ac48778a1d097e98" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_565f38f8b0417c7dbd40e42978" ON "doctor"."specialties" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6678765a8dcfa5597a6cdf71eb" ON "doctor"."specialties" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL, "name" character varying(200) NOT NULL, "slug" character varying(200), "description" text, "headDoctorId" character varying, "doctorCount" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0ce987364b9a455af2a739558a" ON "doctor"."departments" ("hospitalId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a23b1fdc69006219d8acc76c04" ON "doctor"."departments" ("slug") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."doctor_reviews_targettype_enum" AS ENUM('doctor', 'hospital', 'clinic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."doctor_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "targetType" "doctor"."doctor_reviews_targettype_enum", "targetId" character varying NOT NULL, "customerId" character varying NOT NULL, "customerName" character varying(200), "rating" integer NOT NULL, "comment" text, "isVerified" boolean NOT NULL DEFAULT false, "isVisible" boolean NOT NULL DEFAULT true, "appointmentId" character varying, "adminReply" text, "providerReply" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f0335ada748eaa9095e27288a97" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4940e8ad33dea694196af090b2" ON "doctor"."doctor_reviews" ("targetType") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_deca0564b2aa0fef4933cbce2b" ON "doctor"."doctor_reviews" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d8bc1586e77872fb3ca9435a20" ON "doctor"."doctor_reviews" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."documents_ownertype_enum" AS ENUM('doctor', 'hospital', 'clinic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."documents_documenttype_enum" AS ENUM('medical_license', 'registration_certificate', 'id_proof', 'degree_certificate', 'establishment_license', 'insurance', 'tax_certificate', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."documents_status_enum" AS ENUM('pending', 'verified', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" character varying NOT NULL, "ownerType" "doctor"."documents_ownertype_enum" NOT NULL, "documentType" "doctor"."documents_documenttype_enum" NOT NULL, "documentName" character varying(200) NOT NULL, "fileUrl" character varying(1000) NOT NULL, "fileType" character varying(50), "fileSizeBytes" integer, "status" "doctor"."documents_status_enum" NOT NULL DEFAULT 'pending', "verifiedBy" character varying, "verifiedAt" TIMESTAMP, "rejectionReason" text, "expiryDate" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4106f2a9b30c9ff2f717894a97" ON "doctor"."documents" ("ownerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_09f34b6c890300074aa6e908b6" ON "doctor"."documents" ("ownerType") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_709389d904fa03bdf5ec84998d" ON "doctor"."documents" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."prescription_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "prescriptionId" uuid NOT NULL, "drugName" character varying(300) NOT NULL, "genericName" character varying(300), "dosage" character varying(100) NOT NULL, "frequency" character varying(100) NOT NULL, "duration" character varying(100) NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "instructions" text, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6216831f49afc381b3934c9672c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."doctor_prescriptions_status_enum" AS ENUM('DRAFT', 'ISSUED', 'DISPENSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."doctor_prescriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointmentId" uuid NOT NULL, "doctorId" uuid NOT NULL, "customerId" character varying NOT NULL, "patientName" character varying(200) NOT NULL, "patientAge" integer, "patientGender" character varying(20), "diagnosis" text, "notes" text, "followUpDate" date, "status" "doctor"."doctor_prescriptions_status_enum" NOT NULL DEFAULT 'DRAFT', "issuedAt" TIMESTAMP WITH TIME ZONE, "pdfUrl" character varying(500), "pharmacyOrderId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_091fabfb48fbded637624713281" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cafc2437acf88befbdfd9879b4" ON "doctor"."doctor_prescriptions" ("appointmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_80c41d716a4958862b6b912dff" ON "doctor"."doctor_prescriptions" ("doctorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_697f5646a1db710b57555f2a2e" ON "doctor"."doctor_prescriptions" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f2c229b6b085c8b337e62ca35e" ON "doctor"."doctor_prescriptions" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."family_members_relation_enum" AS ENUM('self', 'spouse', 'child', 'parent', 'sibling', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."family_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying(200) NOT NULL, "relation" "doctor"."family_members_relation_enum" NOT NULL DEFAULT 'other', "dateOfBirth" date, "gender" character varying(20), "bloodGroup" character varying(10), "allergies" text, "medicalConditions" text, "insuranceProvider" character varying(200), "insurancePolicyNo" character varying(100), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_186da7c7fcbf23775fdd888a747" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ccda8487d562e954d3c93bfbd0" ON "doctor"."family_members" ("userId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."intake_forms_smokingstatus_enum" AS ENUM('never', 'former', 'current');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "doctor"."intake_forms_alcoholconsumption_enum" AS ENUM('none', 'occasional', 'moderate', 'heavy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "doctor"."intake_forms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointmentId" character varying NOT NULL, "customerId" character varying NOT NULL, "familyMemberId" character varying, "currentMedications" jsonb, "allergies" text, "previousSurgeries" text, "familyMedicalHistory" text, "smokingStatus" "doctor"."intake_forms_smokingstatus_enum" NOT NULL DEFAULT 'never', "alcoholConsumption" "doctor"."intake_forms_alcoholconsumption_enum" NOT NULL DEFAULT 'none', "height" numeric(5,2), "weight" numeric(5,2), "bloodPressure" character varying(20), "bloodGroup" character varying(10), "chiefComplaint" text, "symptomDuration" character varying(100), "additionalNotes" text, "completedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5aa0e78d4589808303905892830" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_44f4b0c42bbd490ebee41fcdf6" ON "doctor"."intake_forms" ("appointmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b0f20430376466835a5902b442" ON "doctor"."intake_forms" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."doctors" ADD CONSTRAINT "FK_b7c9cc719c797fa0e4f9e2b1303" FOREIGN KEY ("hospitalId") REFERENCES "doctor"."hospitals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."doctors" ADD CONSTRAINT "FK_01f41c4435b1e13060e05fdd557" FOREIGN KEY ("clinicId") REFERENCES "doctor"."clinics"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."appointments" ADD CONSTRAINT "FK_0c1af27b469cb8dca420c160d65" FOREIGN KEY ("doctorId") REFERENCES "doctor"."doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."doctor_availability" ADD CONSTRAINT "FK_7ebf8396e8918307342d6bcf82b" FOREIGN KEY ("doctorId") REFERENCES "doctor"."doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."departments" ADD CONSTRAINT "FK_0ce987364b9a455af2a739558ab" FOREIGN KEY ("hospitalId") REFERENCES "doctor"."hospitals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."prescription_items" ADD CONSTRAINT "FK_8f604306272f41c9be46cca4360" FOREIGN KEY ("prescriptionId") REFERENCES "doctor"."doctor_prescriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."doctor_prescriptions" ADD CONSTRAINT "FK_cafc2437acf88befbdfd9879b4b" FOREIGN KEY ("appointmentId") REFERENCES "doctor"."appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "doctor"."doctor_prescriptions" ADD CONSTRAINT "FK_80c41d716a4958862b6b912dff4" FOREIGN KEY ("doctorId") REFERENCES "doctor"."doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor"."doctor_prescriptions" DROP CONSTRAINT "FK_80c41d716a4958862b6b912dff4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor"."doctor_prescriptions" DROP CONSTRAINT "FK_cafc2437acf88befbdfd9879b4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor"."prescription_items" DROP CONSTRAINT "FK_8f604306272f41c9be46cca4360"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor"."departments" DROP CONSTRAINT "FK_0ce987364b9a455af2a739558ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor"."doctor_availability" DROP CONSTRAINT "FK_7ebf8396e8918307342d6bcf82b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor"."appointments" DROP CONSTRAINT "FK_0c1af27b469cb8dca420c160d65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor"."doctors" DROP CONSTRAINT "FK_01f41c4435b1e13060e05fdd557"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor"."doctors" DROP CONSTRAINT "FK_b7c9cc719c797fa0e4f9e2b1303"`,
    );
    await queryRunner.query(`DROP INDEX "doctor"."IDX_b0f20430376466835a5902b442"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_44f4b0c42bbd490ebee41fcdf6"`);
    await queryRunner.query(`DROP TABLE "doctor"."intake_forms"`);
    await queryRunner.query(`DROP TYPE "doctor"."intake_forms_alcoholconsumption_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."intake_forms_smokingstatus_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_ccda8487d562e954d3c93bfbd0"`);
    await queryRunner.query(`DROP TABLE "doctor"."family_members"`);
    await queryRunner.query(`DROP TYPE "doctor"."family_members_relation_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_f2c229b6b085c8b337e62ca35e"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_697f5646a1db710b57555f2a2e"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_80c41d716a4958862b6b912dff"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_cafc2437acf88befbdfd9879b4"`);
    await queryRunner.query(`DROP TABLE "doctor"."doctor_prescriptions"`);
    await queryRunner.query(`DROP TYPE "doctor"."doctor_prescriptions_status_enum"`);
    await queryRunner.query(`DROP TABLE "doctor"."prescription_items"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_709389d904fa03bdf5ec84998d"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_09f34b6c890300074aa6e908b6"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_4106f2a9b30c9ff2f717894a97"`);
    await queryRunner.query(`DROP TABLE "doctor"."documents"`);
    await queryRunner.query(`DROP TYPE "doctor"."documents_status_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."documents_documenttype_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."documents_ownertype_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_d8bc1586e77872fb3ca9435a20"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_deca0564b2aa0fef4933cbce2b"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_4940e8ad33dea694196af090b2"`);
    await queryRunner.query(`DROP TABLE "doctor"."doctor_reviews"`);
    await queryRunner.query(`DROP TYPE "doctor"."doctor_reviews_targettype_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_a23b1fdc69006219d8acc76c04"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_0ce987364b9a455af2a739558a"`);
    await queryRunner.query(`DROP TABLE "doctor"."departments"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_6678765a8dcfa5597a6cdf71eb"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_565f38f8b0417c7dbd40e42978"`);
    await queryRunner.query(`DROP TABLE "doctor"."specialties"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_7ebf8396e8918307342d6bcf82"`);
    await queryRunner.query(`DROP TABLE "doctor"."doctor_availability"`);
    await queryRunner.query(`DROP TYPE "doctor"."doctor_availability_locationtype_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."doctor_availability_consultmode_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_3007a47d97a542e63b3308a69b"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_6b8e84de5d15269b7f79187992"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_60dbcf20669c096d319e20fca8"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_0c1af27b469cb8dca420c160d6"`);
    await queryRunner.query(`DROP TABLE "doctor"."appointments"`);
    await queryRunner.query(`DROP TYPE "doctor"."appointments_status_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."appointments_type_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_0bbe41b415ae50167530fd99b8"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_1777751b671a6d16774d03edfc"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_01f41c4435b1e13060e05fdd55"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_b7c9cc719c797fa0e4f9e2b130"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_bb6b34d0edf46148f12dcd0868"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_738d9334429a42933b01e969a9"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_33c4883c04607c530c0c1858d9"`);
    await queryRunner.query(`DROP TABLE "doctor"."doctors"`);
    await queryRunner.query(`DROP TYPE "doctor"."doctors_providertype_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."doctors_status_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."doctors_consultmode_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_a3a497d43b80e5f34675aacef7"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_a2d0518524fc6a19d8e328f683"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_1c4933755297e407da44d46031"`);
    await queryRunner.query(`DROP TABLE "doctor"."clinics"`);
    await queryRunner.query(`DROP TYPE "doctor"."clinics_status_enum"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_279fb5c6a1bb0859ce7922c60e"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_c8721acd8ecadbc8792dc574e1"`);
    await queryRunner.query(`DROP INDEX "doctor"."IDX_009c5a5f2b10253584417d685d"`);
    await queryRunner.query(`DROP TABLE "doctor"."hospitals"`);
    await queryRunner.query(`DROP TYPE "doctor"."hospitals_hospitaltype_enum"`);
    await queryRunner.query(`DROP TYPE "doctor"."hospitals_status_enum"`);
  }
}
