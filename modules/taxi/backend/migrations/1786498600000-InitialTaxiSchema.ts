import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The taxi module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the taxi database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/taxi-service.module.ts`), and this is the schema.
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
export class InitialTaxiSchema1786498600000 implements MigrationInterface {
  name = 'InitialTaxiSchema1786498600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_drivers_status_enum" AS ENUM('pending', 'onboarding', 'active', 'suspended', 'blocked', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_drivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "phone" character varying(30) NOT NULL, "email" character varying(200) NOT NULL, "countryCode" character varying(5) NOT NULL, "vendorId" uuid, "status" "taxi"."taxi_drivers_status_enum" NOT NULL DEFAULT 'pending', "vehicleType" character varying(30) NOT NULL DEFAULT 'economy', "vehiclePlate" character varying(20), "vehicleModel" character varying(100), "vehicleColor" character varying(30), "vehicleYear" integer, "rating" numeric(3,2) NOT NULL DEFAULT '5', "totalTrips" integer NOT NULL DEFAULT '0', "acceptanceRate" numeric(5,2) NOT NULL DEFAULT '100', "cancellationRate" numeric(5,2) NOT NULL DEFAULT '0', "licenseNumber" character varying(100), "licenseExpiry" date, "insuranceExpiry" date, "profilePhotoUrl" character varying, "approvedBy" character varying, "approvedAt" TIMESTAMP WITH TIME ZONE, "suspensionReason" character varying, "onboardingProgress" integer NOT NULL DEFAULT '0', "bankDetails" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b6bfbcf11fcd83cde00cae04e6a" UNIQUE ("email"), CONSTRAINT "PK_9dd2e5937269189d3571e50c3c8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8eca486c5f357ddd89f1cbda77" ON "taxi"."taxi_drivers" ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_614ed6d6795769e5a1857cdc70" ON "taxi"."taxi_drivers" ("vendorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e94e592bcd3087c24d8084350d" ON "taxi"."taxi_drivers" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_vendors_status_enum" AS ENUM('pending', 'active', 'suspended', 'blocked', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_vendors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "countryCode" character varying(5) NOT NULL, "city" character varying(100) NOT NULL, "ownerName" character varying(200) NOT NULL, "email" character varying(200) NOT NULL, "phone" character varying(30) NOT NULL, "businessLicenseNo" character varying(100), "status" "taxi"."taxi_vendors_status_enum" NOT NULL DEFAULT 'pending', "approvedBy" character varying, "approvedAt" TIMESTAMP WITH TIME ZONE, "suspensionReason" character varying, "maxDrivers" integer NOT NULL DEFAULT '50', "commissionRate" numeric(5,2), "bankDetails" jsonb, "address" jsonb, "notes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b53460f2b5c6d7c4c0f419d78fc" UNIQUE ("email"), CONSTRAINT "PK_ff05f54b41711691581d2dd49b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d29e35986c2795937f0715227b" ON "taxi"."taxi_vendors" ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5713b615aaa72ecb4b41283226" ON "taxi"."taxi_vendors" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_documents_ownertype_enum" AS ENUM('vendor', 'driver');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_documents_status_enum" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerType" "taxi"."taxi_documents_ownertype_enum" NOT NULL, "ownerId" character varying NOT NULL, "documentType" character varying(50) NOT NULL, "displayName" character varying(200) NOT NULL, "fileUrl" character varying NOT NULL, "fileName" character varying(200) NOT NULL, "mimeType" character varying(20), "fileSizeBytes" bigint, "status" "taxi"."taxi_documents_status_enum" NOT NULL DEFAULT 'pending', "reviewedBy" character varying, "reviewedAt" TIMESTAMP WITH TIME ZONE, "rejectionReason" text, "expiresAt" date, "documentNumber" character varying(100), "issuingCountry" character varying(5), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fd4cce12f287ad635ab57103584" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_314f8d07f56ee9d55a8477479d" ON "taxi"."taxi_documents" ("ownerType") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e8e92087a3c448e7bc9996159a" ON "taxi"."taxi_documents" ("ownerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_80c4e57a035e876df43cfba163" ON "taxi"."taxi_documents" ("documentType") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ac6400300cb43388c09b2029bc" ON "taxi"."taxi_documents" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_country_configs" ("countryCode" character varying(5) NOT NULL, "currency" character varying(10) NOT NULL DEFAULT 'INR', "distanceUnit" character varying(3) NOT NULL DEFAULT 'km', "otpRequired" boolean NOT NULL DEFAULT true, "scheduledRidesEnabled" boolean NOT NULL DEFAULT true, "cashEnabled" boolean NOT NULL DEFAULT true, "tipsEnabled" boolean NOT NULL DEFAULT true, "maxStops" integer NOT NULL DEFAULT '3', "rideShareEnabled" boolean NOT NULL DEFAULT true, "vendorsEnabled" boolean NOT NULL DEFAULT true, "enabledPaymentGateways" jsonb NOT NULL DEFAULT '["cash", "card", "wallet"]', "enabledVehicleTypes" jsonb NOT NULL DEFAULT '["economy", "comfort", "premium", "bike"]', "requiredVendorDocuments" jsonb NOT NULL DEFAULT '["business_license", "tax_certificate", "insurance_certificate"]', "requiredDriverDocuments" jsonb NOT NULL DEFAULT '["driving_license", "vehicle_registration", "vehicle_insurance", "identity_proof"]', "platformCommissionRate" numeric(5,4) NOT NULL DEFAULT '0.15', "defaultVendorCommissionRate" numeric(5,4) NOT NULL DEFAULT '0.05', "taxRate" numeric(5,4) NOT NULL DEFAULT '0', "surgeLimits" jsonb NOT NULL DEFAULT '{"minMultiplier": 1.0, "maxMultiplier": 3.0, "autoEnabled": true}', "peakHourConfig" jsonb NOT NULL DEFAULT '[]', "emergencyNumber" character varying(20) NOT NULL DEFAULT '911', "defaultLocale" character varying(10) NOT NULL DEFAULT 'en', "timezone" character varying(50), "minimumDriverRating" numeric(3,2) NOT NULL DEFAULT '3', "freeWaitingMinutes" integer NOT NULL DEFAULT '5', "autoCancelTimeoutSeconds" integer NOT NULL DEFAULT '120', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_38232e93029e8e3233756bd1600" PRIMARY KEY ("countryCode"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_rate_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "countryCode" character varying(5) NOT NULL, "vehicleType" character varying(30) NOT NULL, "displayName" character varying(50) NOT NULL, "baseFare" numeric(10,2) NOT NULL, "distanceRate" numeric(10,2) NOT NULL, "timeRate" numeric(10,2) NOT NULL, "minimumFare" numeric(10,2) NOT NULL, "waitingRate" numeric(10,2) NOT NULL, "nightSurcharge" numeric(10,2) NOT NULL DEFAULT '0', "airportSurcharge" numeric(10,2) NOT NULL DEFAULT '0', "cancellationFee" numeric(10,2) NOT NULL DEFAULT '0', "maxPassengers" integer NOT NULL DEFAULT '4', "maxLuggage" integer NOT NULL DEFAULT '2', "isAccessible" boolean NOT NULL DEFAULT false, "iconName" character varying(50) NOT NULL DEFAULT 'car', "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6cf014e6b7c11db9164ea93aa12" UNIQUE ("countryCode", "vehicleType"), CONSTRAINT "PK_520481a96ecb85adfbf24fb91b3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cbea4aaa7119c3e477b4b3871e" ON "taxi"."taxi_rate_cards" ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_eced2b1a094884e6fcacb967ed" ON "taxi"."taxi_rate_cards" ("vehicleType") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_payout_records_recipienttype_enum" AS ENUM('vendor', 'driver');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_payout_records_status_enum" AS ENUM('pending', 'approved', 'processing', 'settled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_payout_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipientType" "taxi"."taxi_payout_records_recipienttype_enum" NOT NULL, "recipientId" character varying NOT NULL, "recipientName" character varying(200) NOT NULL, "rideId" character varying NOT NULL, "countryCode" character varying(5) NOT NULL, "grossAmount" numeric(12,2) NOT NULL, "platformCommission" numeric(12,2) NOT NULL, "vendorCommission" numeric(12,2) NOT NULL DEFAULT '0', "taxAmount" numeric(12,2) NOT NULL DEFAULT '0', "netPayout" numeric(12,2) NOT NULL, "currency" character varying(10) NOT NULL, "status" "taxi"."taxi_payout_records_status_enum" NOT NULL DEFAULT 'pending', "paymentGateway" character varying(50), "transactionRef" character varying(200), "approvedBy" character varying, "approvedAt" TIMESTAMP WITH TIME ZONE, "settledAt" TIMESTAMP WITH TIME ZONE, "failureReason" text, "retryCount" integer NOT NULL DEFAULT '0', "batchId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e4c6fbb3ccadd31ade55770e136" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_25c8f6c8bfc5462ab26cbec709" ON "taxi"."taxi_payout_records" ("recipientType") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e266431c4abee5591f9e1d2d45" ON "taxi"."taxi_payout_records" ("recipientId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9cda8eeacc719cf572c441581c" ON "taxi"."taxi_payout_records" ("rideId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_04126740c18d0d9b5b86e7713f" ON "taxi"."taxi_payout_records" ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1189199a8b933610fd11f84b37" ON "taxi"."taxi_payout_records" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f12a84e2ec207219ed4a3ba718" ON "taxi"."taxi_payout_records" ("batchId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_complaints_filedby_enum" AS ENUM('customer', 'driver', 'vendor', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_complaints_category_enum" AS ENUM('safety_incident', 'fare_dispute', 'driver_behavior', 'vehicle_condition', 'route_deviation', 'overcharging', 'payment_issue', 'harassment', 'discrimination', 'damage_to_property', 'lost_item', 'cancellation_abuse', 'no_show', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_complaints_severity_enum" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_complaints_accountability_enum" AS ENUM('vendor', 'platform');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_complaints_status_enum" AS ENUM('open', 'investigating', 'pending_response', 'escalated', 'resolved', 'dismissed', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_complaints_actiontaken_enum" AS ENUM('none', 'warning', 'fine', 'suspension', 'termination', 'ban', 'refund', 'compensation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_complaints" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tripId" character varying(100) NOT NULL, "countryCode" character varying(5) NOT NULL, "filedBy" "taxi"."taxi_complaints_filedby_enum" NOT NULL DEFAULT 'customer', "filerId" character varying(100) NOT NULL, "filerName" character varying(200) NOT NULL, "category" "taxi"."taxi_complaints_category_enum" NOT NULL, "severity" "taxi"."taxi_complaints_severity_enum" NOT NULL DEFAULT 'medium', "description" text NOT NULL, "evidence" jsonb, "driverId" uuid, "driverName" character varying(200), "vendorId" uuid, "vendorName" character varying(200), "accountability" "taxi"."taxi_complaints_accountability_enum" NOT NULL DEFAULT 'platform', "tripContext" jsonb, "status" "taxi"."taxi_complaints_status_enum" NOT NULL DEFAULT 'open', "assignedTo" character varying, "assignedToName" character varying(200), "internalNotes" text, "resolution" text, "actionTaken" "taxi"."taxi_complaints_actiontaken_enum" NOT NULL DEFAULT 'none', "compensationAmount" numeric(10,2), "resolvedAt" TIMESTAMP WITH TIME ZONE, "resolvedBy" character varying, "escalationLevel" integer NOT NULL DEFAULT '0', "escalatedAt" TIMESTAMP WITH TIME ZONE, "slaDeadline" TIMESTAMP WITH TIME ZONE, "slaBreached" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5215168977ed8fa4acf107312a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f6f89c33cd1286309b077beb03" ON "taxi"."taxi_complaints" ("tripId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6e4e46f1869befde3752062184" ON "taxi"."taxi_complaints" ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_734ac8ccb8133f20ab75afae61" ON "taxi"."taxi_complaints" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bfd5d808e0a9f3fff21c8a7b8e" ON "taxi"."taxi_complaints" ("driverId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0a771df2e16a722b61da362478" ON "taxi"."taxi_complaints" ("vendorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_72e590c7bf5c2bad3519b7afab" ON "taxi"."taxi_complaints" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_disciplinary_actions_targettype_enum" AS ENUM('driver', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_disciplinary_actions_actiontype_enum" AS ENUM('verbal_warning', 'written_warning', 'fine', 'temporary_suspension', 'permanent_suspension', 'license_revocation', 'platform_ban', 'retraining_required', 'probation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_disciplinary_actions_status_enum" AS ENUM('pending', 'active', 'appealed', 'overturned', 'completed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_disciplinary_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "complaintId" uuid, "countryCode" character varying(5) NOT NULL, "targetType" "taxi"."taxi_disciplinary_actions_targettype_enum" NOT NULL, "driverId" uuid, "vendorId" uuid, "targetName" character varying(200) NOT NULL, "actionType" "taxi"."taxi_disciplinary_actions_actiontype_enum" NOT NULL, "reason" text NOT NULL, "legalReference" text, "fineAmount" numeric(10,2), "fineCurrency" character varying(5), "suspensionDays" integer, "effectiveFrom" TIMESTAMP WITH TIME ZONE, "effectiveUntil" TIMESTAMP WITH TIME ZONE, "status" "taxi"."taxi_disciplinary_actions_status_enum" NOT NULL DEFAULT 'pending', "issuedBy" character varying NOT NULL, "issuedByName" character varying(200) NOT NULL, "appealReason" text, "appealedAt" TIMESTAMP WITH TIME ZONE, "appealResolution" text, "autoTriggered" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c28d8ccfbb6089949831cd5a495" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b3b8df728c3c8a7519eb645b0f" ON "taxi"."taxi_disciplinary_actions" ("complaintId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_063d28f4a2613fd4e0e204b47f" ON "taxi"."taxi_disciplinary_actions" ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_99ce918d1b5c1920ee44869a5d" ON "taxi"."taxi_disciplinary_actions" ("driverId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b042f12b6e25baa52895cc06e3" ON "taxi"."taxi_disciplinary_actions" ("vendorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e762fa3bb4065de0b321226108" ON "taxi"."taxi_disciplinary_actions" ("status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "taxi"."taxi_rides_status_enum" AS ENUM('SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED', 'RIDE_COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_ADMIN', 'NO_DRIVER_FOUND', 'EXPIRED', 'PAYMENT_FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "taxi"."taxi_rides" ("id" character varying(50) NOT NULL, "customerId" character varying(100) NOT NULL, "driverId" uuid, "vendorId" character varying(100), "pickupLat" numeric(10,7) NOT NULL, "pickupLng" numeric(10,7) NOT NULL, "dropLat" numeric(10,7) NOT NULL, "dropLng" numeric(10,7) NOT NULL, "pickupAddress" character varying(500) NOT NULL DEFAULT 'Current Location', "dropAddress" character varying(500) NOT NULL DEFAULT 'Destination', "status" "taxi"."taxi_rides_status_enum" NOT NULL DEFAULT 'SEARCHING_DRIVER', "vehicleType" character varying(30) NOT NULL DEFAULT 'economy', "paymentMethod" character varying(30) NOT NULL DEFAULT 'cash', "countryCode" character varying(5) NOT NULL DEFAULT 'NG', "fareEstimate" numeric(12,2) NOT NULL DEFAULT '0', "finalFare" numeric(12,2), "surgeMultiplier" numeric(5,2) NOT NULL DEFAULT '1', "currency" character varying(10) NOT NULL DEFAULT 'NGN', "tipAmount" numeric(12,2), "discount" numeric(12,2), "promoCode" character varying(50), "estimatedDistanceKm" numeric(8,2), "estimatedDurationMin" numeric(8,2), "finalDistanceKm" numeric(8,2), "finalDurationMin" numeric(8,2), "otp" character varying(6), "otpVerified" boolean NOT NULL DEFAULT false, "customerRating" smallint, "customerFeedback" character varying, "driverRating" smallint, "cancelReason" character varying, "cancelledBy" character varying(50), "driverAssignedAt" TIMESTAMP WITH TIME ZONE, "driverArrivedAt" TIMESTAMP WITH TIME ZONE, "rideStartedAt" TIMESTAMP WITH TIME ZONE, "rideCompletedAt" TIMESTAMP WITH TIME ZONE, "cancelledAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_17933b801e2e94155d1f2b06fc6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0b2e79e6fa53fb525bdfb5de26" ON "taxi"."taxi_rides" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6d84172da8689a850f1a90b20d" ON "taxi"."taxi_rides" ("driverId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_24d8ae374fa4608a0775e4b362" ON "taxi"."taxi_rides" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e4a53691020a1ac2b3826ab746" ON "taxi"."taxi_rides" ("countryCode") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "taxi"."taxi_drivers" ADD CONSTRAINT "FK_614ed6d6795769e5a1857cdc70f" FOREIGN KEY ("vendorId") REFERENCES "taxi"."taxi_vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "taxi"."taxi_complaints" ADD CONSTRAINT "FK_bfd5d808e0a9f3fff21c8a7b8ec" FOREIGN KEY ("driverId") REFERENCES "taxi"."taxi_drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "taxi"."taxi_complaints" ADD CONSTRAINT "FK_0a771df2e16a722b61da362478d" FOREIGN KEY ("vendorId") REFERENCES "taxi"."taxi_vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "taxi"."taxi_disciplinary_actions" ADD CONSTRAINT "FK_b3b8df728c3c8a7519eb645b0f3" FOREIGN KEY ("complaintId") REFERENCES "taxi"."taxi_complaints"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "taxi"."taxi_disciplinary_actions" ADD CONSTRAINT "FK_99ce918d1b5c1920ee44869a5d1" FOREIGN KEY ("driverId") REFERENCES "taxi"."taxi_drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "taxi"."taxi_disciplinary_actions" ADD CONSTRAINT "FK_b042f12b6e25baa52895cc06e38" FOREIGN KEY ("vendorId") REFERENCES "taxi"."taxi_vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "taxi"."taxi_rides" ADD CONSTRAINT "FK_6d84172da8689a850f1a90b20da" FOREIGN KEY ("driverId") REFERENCES "taxi"."taxi_drivers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taxi"."taxi_rides" DROP CONSTRAINT "FK_6d84172da8689a850f1a90b20da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taxi"."taxi_disciplinary_actions" DROP CONSTRAINT "FK_b042f12b6e25baa52895cc06e38"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taxi"."taxi_disciplinary_actions" DROP CONSTRAINT "FK_99ce918d1b5c1920ee44869a5d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taxi"."taxi_disciplinary_actions" DROP CONSTRAINT "FK_b3b8df728c3c8a7519eb645b0f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taxi"."taxi_complaints" DROP CONSTRAINT "FK_0a771df2e16a722b61da362478d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taxi"."taxi_complaints" DROP CONSTRAINT "FK_bfd5d808e0a9f3fff21c8a7b8ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taxi"."taxi_drivers" DROP CONSTRAINT "FK_614ed6d6795769e5a1857cdc70f"`,
    );
    await queryRunner.query(`DROP INDEX "taxi"."IDX_e4a53691020a1ac2b3826ab746"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_24d8ae374fa4608a0775e4b362"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_6d84172da8689a850f1a90b20d"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_0b2e79e6fa53fb525bdfb5de26"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_rides"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_rides_status_enum"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_e762fa3bb4065de0b321226108"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_b042f12b6e25baa52895cc06e3"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_99ce918d1b5c1920ee44869a5d"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_063d28f4a2613fd4e0e204b47f"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_b3b8df728c3c8a7519eb645b0f"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_disciplinary_actions"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_disciplinary_actions_status_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_disciplinary_actions_actiontype_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_disciplinary_actions_targettype_enum"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_72e590c7bf5c2bad3519b7afab"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_0a771df2e16a722b61da362478"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_bfd5d808e0a9f3fff21c8a7b8e"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_734ac8ccb8133f20ab75afae61"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_6e4e46f1869befde3752062184"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_f6f89c33cd1286309b077beb03"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_complaints"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_complaints_actiontaken_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_complaints_status_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_complaints_accountability_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_complaints_severity_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_complaints_category_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_complaints_filedby_enum"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_f12a84e2ec207219ed4a3ba718"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_1189199a8b933610fd11f84b37"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_04126740c18d0d9b5b86e7713f"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_9cda8eeacc719cf572c441581c"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_e266431c4abee5591f9e1d2d45"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_25c8f6c8bfc5462ab26cbec709"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_payout_records"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_payout_records_status_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_payout_records_recipienttype_enum"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_eced2b1a094884e6fcacb967ed"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_cbea4aaa7119c3e477b4b3871e"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_rate_cards"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_country_configs"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_ac6400300cb43388c09b2029bc"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_80c4e57a035e876df43cfba163"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_e8e92087a3c448e7bc9996159a"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_314f8d07f56ee9d55a8477479d"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_documents"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_documents_status_enum"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_documents_ownertype_enum"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_5713b615aaa72ecb4b41283226"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_d29e35986c2795937f0715227b"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_vendors"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_vendors_status_enum"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_e94e592bcd3087c24d8084350d"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_614ed6d6795769e5a1857cdc70"`);
    await queryRunner.query(`DROP INDEX "taxi"."IDX_8eca486c5f357ddd89f1cbda77"`);
    await queryRunner.query(`DROP TABLE "taxi"."taxi_drivers"`);
    await queryRunner.query(`DROP TYPE "taxi"."taxi_drivers_status_enum"`);
  }
}
