import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The hotel module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the hotel database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/hotel-service.module.ts`), and this is the schema.
 *
 * ── It starts from nothing ─────────────────────────────────────────────────
 *
 * The first two statements are `CREATE SCHEMA IF NOT EXISTS "hotel"` and
 * `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, because a dedicated module
 * database arrives with neither and every primary key below defaults to
 * `uuid_generate_v4()`. Nothing else in a deploy creates them: dev
 * `synchronize` used to create the schema, and IN3 turned that off. This works
 * only because the ledger lives in `public.hotel_migrations` rather than inside
 * this schema — TypeORM builds the ledger before the first `up()` runs, so a
 * ledger in `hotel` would need the schema that this line creates.
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
export class InitialHotelSchema1786498500000 implements MigrationInterface {
  name = 'InitialHotelSchema1786498500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The schema itself, and it has to be first. A dedicated module
    // database is created empty and nothing else in the deploy creates
    // this schema — dev `synchronize` used to, and IN3 turned that off.
    // The ledger is deliberately `public.hotel_migrations` (see
    // data-source.ts), so TypeORM does not need this schema to exist
    // before this line runs.
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "hotel"`);
    // Every table below defaults its primary key to uuid_generate_v4().
    // A plain postgres image does not ship this enabled.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_bookings_paymentmethod_enum" AS ENUM('ONLINE', 'WALLET', 'PAY_AT_HOTEL', 'CARD', 'UPI', 'BANK_TRANSFER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_bookings_paymentstatus_enum" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_bookings_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'MODIFICATION_REQUESTED', 'MODIFIED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingNumber" character varying NOT NULL, "confirmationCode" character varying NOT NULL, "hotel_id" uuid NOT NULL, "room_id" uuid NOT NULL, "customerId" character varying NOT NULL, "checkinDate" date NOT NULL, "checkoutDate" date NOT NULL, "nights" integer NOT NULL DEFAULT '1', "roomCount" integer NOT NULL DEFAULT '1', "adults" integer NOT NULL DEFAULT '2', "children" integer NOT NULL DEFAULT '0', "primaryGuest" jsonb NOT NULL, "additionalGuests" jsonb, "specialRequests" text, "pricePerNight" numeric(10,2) NOT NULL, "roomTotal" numeric(10,2) NOT NULL, "extraCharges" numeric(10,2) NOT NULL DEFAULT '0', "taxAmount" numeric(10,2) NOT NULL DEFAULT '0', "serviceFee" numeric(10,2) NOT NULL DEFAULT '0', "discount" numeric(10,2) NOT NULL DEFAULT '0', "couponCode" character varying, "pointsRedeemed" integer NOT NULL DEFAULT '0', "pointsDiscount" numeric(10,2) NOT NULL DEFAULT '0', "grandTotal" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'AED', "paymentMethod" "hotel"."hotel_bookings_paymentmethod_enum" NOT NULL DEFAULT 'ONLINE', "paymentStatus" "hotel"."hotel_bookings_paymentstatus_enum" NOT NULL DEFAULT 'PENDING', "paymentTransactionId" character varying, "walletAmountUsed" numeric(10,2) NOT NULL DEFAULT '0', "mealPlan" character varying(50), "status" "hotel"."hotel_bookings_status_enum" NOT NULL DEFAULT 'PENDING', "cancelReason" text, "cancelledBy" character varying, "refundAmount" numeric(10,2) NOT NULL DEFAULT '0', "refundStatus" character varying, "refundTransactionId" character varying, "modifications" jsonb, "hotelName" character varying(255) NOT NULL, "roomName" character varying(255) NOT NULL, "hotelCity" character varying(100), "hotelCountryCode" character varying(3), "confirmedAt" TIMESTAMP WITH TIME ZONE, "checkedInAt" TIMESTAMP WITH TIME ZONE, "checkedOutAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "cancelledAt" TIMESTAMP WITH TIME ZONE, "idempotencyKey" character varying(36), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_33689dfe5dcc235cca4e6b24549" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_bookings"."bookingNumber" IS 'Human-readable booking number e.g. HBK-A7B3C9'; COMMENT ON COLUMN "hotel"."hotel_bookings"."confirmationCode" IS 'Confirmation code shown to guest e.g. KS-A7B3C9'; COMMENT ON COLUMN "hotel"."hotel_bookings"."customerId" IS 'Links to Auth Service user (customer)'; COMMENT ON COLUMN "hotel"."hotel_bookings"."checkinDate" IS 'Check-in date'; COMMENT ON COLUMN "hotel"."hotel_bookings"."checkoutDate" IS 'Check-out date'; COMMENT ON COLUMN "hotel"."hotel_bookings"."roomCount" IS 'Number of rooms booked'; COMMENT ON COLUMN "hotel"."hotel_bookings"."additionalGuests" IS 'Additional guests for multi-guest bookings'; COMMENT ON COLUMN "hotel"."hotel_bookings"."pricePerNight" IS 'Price per night at time of booking'; COMMENT ON COLUMN "hotel"."hotel_bookings"."roomTotal" IS 'Room total = pricePerNight × nights × rooms'; COMMENT ON COLUMN "hotel"."hotel_bookings"."pointsRedeemed" IS 'Loyalty points redeemed'; COMMENT ON COLUMN "hotel"."hotel_bookings"."pointsDiscount" IS 'Monetary value of redeemed points'; COMMENT ON COLUMN "hotel"."hotel_bookings"."grandTotal" IS 'Final amount charged'; COMMENT ON COLUMN "hotel"."hotel_bookings"."paymentTransactionId" IS 'Payment gateway transaction ID'; COMMENT ON COLUMN "hotel"."hotel_bookings"."walletAmountUsed" IS 'Amount paid from wallet'; COMMENT ON COLUMN "hotel"."hotel_bookings"."mealPlan" IS 'e.g. Room Only, Breakfast, Half Board, Full Board, All Inclusive'; COMMENT ON COLUMN "hotel"."hotel_bookings"."cancelledBy" IS 'Who cancelled: customer, hotel, admin, system'; COMMENT ON COLUMN "hotel"."hotel_bookings"."hotelName" IS 'Hotel name at time of booking (snapshot)'; COMMENT ON COLUMN "hotel"."hotel_bookings"."roomName" IS 'Room name at time of booking (snapshot)'; COMMENT ON COLUMN "hotel"."hotel_bookings"."idempotencyKey" IS 'Idempotency key to prevent duplicate bookings'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_a57b065827fdb98de0ec98894c" ON "hotel"."hotel_bookings" ("bookingNumber") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_c68646d80e3f2f9111e292f5ff" ON "hotel"."hotel_bookings" ("confirmationCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_061922f243c805fb7d3cdd55cf" ON "hotel"."hotel_bookings" ("hotel_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e745f25469d342910784b5f894" ON "hotel"."hotel_bookings" ("room_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_7cf6e642d55fd920f5088b8fd8" ON "hotel"."hotel_bookings" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_rooms_type_enum" AS ENUM('STANDARD', 'DELUXE', 'PREMIUM', 'SUITE', 'EXECUTIVE_SUITE', 'PRESIDENTIAL_SUITE', 'FAMILY', 'STUDIO', 'PENTHOUSE', 'DORMITORY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_rooms_bedtype_enum" AS ENUM('SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'TWIN', 'BUNK', 'SOFA_BED', 'KING_PLUS_TWIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_rooms_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hotel_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "type" "hotel"."hotel_rooms_type_enum" NOT NULL DEFAULT 'STANDARD', "bedType" "hotel"."hotel_rooms_bedtype_enum" NOT NULL DEFAULT 'DOUBLE', "description" text, "maxGuests" integer NOT NULL DEFAULT '2', "maxAdults" integer NOT NULL DEFAULT '2', "maxChildren" integer NOT NULL DEFAULT '1', "area" character varying(20), "floor" integer, "pricePerNight" numeric(10,2) NOT NULL, "rackRate" numeric(10,2), "currency" character varying(3) NOT NULL DEFAULT 'AED', "extraBedCharge" numeric(10,2) NOT NULL DEFAULT '0', "taxPercentage" numeric(5,2) NOT NULL DEFAULT '0', "totalInventory" integer NOT NULL DEFAULT '1', "availableCount" integer NOT NULL DEFAULT '1', "amenities" text, "images" jsonb, "view" character varying(100), "hasBalcony" boolean NOT NULL DEFAULT false, "hasKitchenette" boolean NOT NULL DEFAULT false, "hasLivingRoom" boolean NOT NULL DEFAULT false, "isSmokingAllowed" boolean NOT NULL DEFAULT false, "isAccessible" boolean NOT NULL DEFAULT false, "breakfastIncluded" boolean NOT NULL DEFAULT false, "halfBoardAvailable" boolean NOT NULL DEFAULT false, "fullBoardAvailable" boolean NOT NULL DEFAULT false, "allInclusiveAvailable" boolean NOT NULL DEFAULT false, "freeCancellation" boolean NOT NULL DEFAULT false, "payAtHotel" boolean NOT NULL DEFAULT false, "nonRefundableRate" boolean NOT NULL DEFAULT false, "status" "hotel"."hotel_rooms_status_enum" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1d226a170f53beff6c64f10c3ac" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_rooms"."name" IS 'Display name e.g. Deluxe King Room'; COMMENT ON COLUMN "hotel"."hotel_rooms"."maxGuests" IS 'Maximum number of guests'; COMMENT ON COLUMN "hotel"."hotel_rooms"."maxAdults" IS 'Maximum adults'; COMMENT ON COLUMN "hotel"."hotel_rooms"."maxChildren" IS 'Maximum children (0-12)'; COMMENT ON COLUMN "hotel"."hotel_rooms"."area" IS 'Room area e.g. 35 sqm'; COMMENT ON COLUMN "hotel"."hotel_rooms"."floor" IS 'Floor number'; COMMENT ON COLUMN "hotel"."hotel_rooms"."pricePerNight" IS 'Base price per night'; COMMENT ON COLUMN "hotel"."hotel_rooms"."rackRate" IS 'Rack rate (original price before discount)'; COMMENT ON COLUMN "hotel"."hotel_rooms"."currency" IS 'Currency ISO code'; COMMENT ON COLUMN "hotel"."hotel_rooms"."extraBedCharge" IS 'Extra bed charge per night'; COMMENT ON COLUMN "hotel"."hotel_rooms"."taxPercentage" IS 'Tax percentage applied to this room'; COMMENT ON COLUMN "hotel"."hotel_rooms"."totalInventory" IS 'Total rooms of this type'; COMMENT ON COLUMN "hotel"."hotel_rooms"."availableCount" IS 'Currently available rooms'; COMMENT ON COLUMN "hotel"."hotel_rooms"."amenities" IS 'Room-specific amenities e.g. Mini Bar, Safe, City View'; COMMENT ON COLUMN "hotel"."hotel_rooms"."view" IS 'e.g. City View, Sea View, Garden View, Pool View'; COMMENT ON COLUMN "hotel"."hotel_rooms"."isAccessible" IS 'Wheelchair accessible room'; COMMENT ON COLUMN "hotel"."hotel_rooms"."freeCancellation" IS 'Whether this room offers free cancellation'; COMMENT ON COLUMN "hotel"."hotel_rooms"."payAtHotel" IS 'Pay at hotel option'; COMMENT ON COLUMN "hotel"."hotel_rooms"."nonRefundableRate" IS 'Non-refundable discounted rate'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_371d751ab23caad7e7bf64e77f" ON "hotel"."hotel_rooms" ("hotel_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hotel_id" uuid NOT NULL, "customerId" character varying NOT NULL, "customerName" character varying(128) NOT NULL, "customerAvatar" character varying, "bookingId" character varying, "rating" smallint NOT NULL, "cleanlinessRating" smallint, "serviceRating" smallint, "locationRating" smallint, "valueRating" smallint, "amenitiesRating" smallint, "title" text, "comment" text, "photos" jsonb, "stayType" character varying(50), "roomType" character varying(100), "stayDate" date, "hotelReply" text, "repliedAt" TIMESTAMP WITH TIME ZONE, "helpfulCount" integer NOT NULL DEFAULT '0', "notHelpfulCount" integer NOT NULL DEFAULT '0', "isFlagged" boolean NOT NULL DEFAULT false, "flagReason" text, "isVisible" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_56f39d31f4a70990bed764be9d6" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_reviews"."bookingId" IS 'Links to the booking being reviewed'; COMMENT ON COLUMN "hotel"."hotel_reviews"."rating" IS 'Overall 1-5 star rating'; COMMENT ON COLUMN "hotel"."hotel_reviews"."cleanlinessRating" IS 'Cleanliness 1-5'; COMMENT ON COLUMN "hotel"."hotel_reviews"."serviceRating" IS 'Service 1-5'; COMMENT ON COLUMN "hotel"."hotel_reviews"."locationRating" IS 'Location 1-5'; COMMENT ON COLUMN "hotel"."hotel_reviews"."valueRating" IS 'Value for money 1-5'; COMMENT ON COLUMN "hotel"."hotel_reviews"."amenitiesRating" IS 'Amenities 1-5'; COMMENT ON COLUMN "hotel"."hotel_reviews"."stayType" IS 'e.g. Solo, Couple, Family, Business, Group'; COMMENT ON COLUMN "hotel"."hotel_reviews"."roomType" IS 'Room type the guest stayed in'; COMMENT ON COLUMN "hotel"."hotel_reviews"."stayDate" IS 'When the guest stayed'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6622ddf45f0ca7533b0f1ca4a7" ON "hotel"."hotel_reviews" ("hotel_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b9d66f3d2a4026ef17ac5272cc" ON "hotel"."hotel_reviews" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_staff_role_enum" AS ENUM('OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'CONCIERGE', 'HOUSEKEEPING_MANAGER', 'HOUSEKEEPING', 'MAINTENANCE', 'REVENUE_MANAGER', 'F_AND_B_MANAGER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hotel_id" uuid NOT NULL, "userId" character varying NOT NULL, "name" character varying(128) NOT NULL, "email" character varying(255), "phone" character varying(20), "role" "hotel"."hotel_staff_role_enum" NOT NULL DEFAULT 'FRONT_DESK', "permissions" jsonb, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_49aba544471535bbd3557179479" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_staff"."userId" IS 'Links to Auth Service user'; COMMENT ON COLUMN "hotel"."hotel_staff"."permissions" IS 'Granular permissions'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cdadf3b2bedcba38e218e4cc4a" ON "hotel"."hotel_staff" ("hotel_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_921093cd6833e36d91657f8a3a" ON "hotel"."hotel_staff" ("userId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotels_type_enum" AS ENUM('HOTEL', 'RESORT', 'BOUTIQUE', 'BUSINESS', 'BUDGET', 'HOSTEL', 'VILLA', 'APARTMENT', 'HOMESTAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotels_status_enum" AS ENUM('PENDING_KYC', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(128) NOT NULL, "description" text, "translations" jsonb, "ownerId" character varying NOT NULL, "ownerName" character varying(255), "address" text NOT NULL, "city" character varying(100) NOT NULL, "state" character varying(100), "pincode" character varying(20), "countryCode" character varying(3) NOT NULL, "latitude" numeric(10,7) NOT NULL, "longitude" numeric(10,7) NOT NULL, "landmark" text, "distanceFromCenter" numeric(5,2), "type" "hotel"."hotels_type_enum" NOT NULL DEFAULT 'HOTEL', "starRating" smallint NOT NULL DEFAULT '3', "amenities" text, "tags" text, "logoUrl" character varying, "bannerUrl" character varying, "photos" jsonb, "phone" character varying(20), "email" character varying(255), "website" character varying(255), "checkInTime" character varying(10) NOT NULL DEFAULT '14:00', "checkOutTime" character varying(10) NOT NULL DEFAULT '12:00', "totalRooms" integer NOT NULL DEFAULT '0', "totalFloors" integer NOT NULL DEFAULT '0', "yearBuilt" integer, "lastRenovated" integer, "cancellationPolicy" jsonb, "childrenPolicy" text, "petsAllowed" boolean NOT NULL DEFAULT false, "smokingAllowed" boolean NOT NULL DEFAULT true, "additionalPolicies" jsonb, "rating" numeric(3,1) NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "totalBookings" integer NOT NULL DEFAULT '0', "occupancyRate" numeric(5,2) NOT NULL DEFAULT '0', "commissionRate" numeric(5,2) NOT NULL DEFAULT '15', "taxRate" numeric(5,2) NOT NULL DEFAULT '0', "currency" character varying(3) NOT NULL DEFAULT 'AED', "bankDetails" jsonb, "kycDocuments" jsonb, "licenseNumber" character varying, "licenseExpiry" date, "status" "hotel"."hotels_status_enum" NOT NULL DEFAULT 'PENDING_KYC', "rejectionReason" text, "isFeatured" boolean NOT NULL DEFAULT false, "isAcceptingBookings" boolean NOT NULL DEFAULT true, "nearbyAttractions" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2bb06797684115a1ba7c705fc7b" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotels"."translations" IS 'Localized name/description translations'; COMMENT ON COLUMN "hotel"."hotels"."ownerId" IS 'Links to Auth Service user (hotel owner)'; COMMENT ON COLUMN "hotel"."hotels"."ownerName" IS 'Hotel owner / management company name'; COMMENT ON COLUMN "hotel"."hotels"."countryCode" IS 'ISO 3166-1 alpha-2 market code e.g. AE, IN, GB'; COMMENT ON COLUMN "hotel"."hotels"."landmark" IS 'Nearest landmark or point of interest'; COMMENT ON COLUMN "hotel"."hotels"."distanceFromCenter" IS 'Distance from city center in km'; COMMENT ON COLUMN "hotel"."hotels"."starRating" IS '1-5 star rating classification'; COMMENT ON COLUMN "hotel"."hotels"."amenities" IS 'e.g. Pool, Spa, Gym, Restaurant, WiFi, Parking'; COMMENT ON COLUMN "hotel"."hotels"."tags" IS 'e.g. Luxury, Family-Friendly, Pet-Friendly, Beach'; COMMENT ON COLUMN "hotel"."hotels"."checkInTime" IS 'Standard check-in time'; COMMENT ON COLUMN "hotel"."hotels"."checkOutTime" IS 'Standard check-out time'; COMMENT ON COLUMN "hotel"."hotels"."totalRooms" IS 'Total number of rooms in the property'; COMMENT ON COLUMN "hotel"."hotels"."totalFloors" IS 'Total number of floors'; COMMENT ON COLUMN "hotel"."hotels"."yearBuilt" IS 'Year the hotel was built'; COMMENT ON COLUMN "hotel"."hotels"."lastRenovated" IS 'Year of last renovation'; COMMENT ON COLUMN "hotel"."hotels"."cancellationPolicy" IS 'Cancellation policy configuration'; COMMENT ON COLUMN "hotel"."hotels"."additionalPolicies" IS 'Additional policies as key-value pairs'; COMMENT ON COLUMN "hotel"."hotels"."occupancyRate" IS 'Occupancy rate percentage'; COMMENT ON COLUMN "hotel"."hotels"."commissionRate" IS 'Platform commission percentage'; COMMENT ON COLUMN "hotel"."hotels"."taxRate" IS 'GST/VAT percentage'; COMMENT ON COLUMN "hotel"."hotels"."currency" IS 'Default currency ISO code'; COMMENT ON COLUMN "hotel"."hotels"."bankDetails" IS 'Bank details for payouts'; COMMENT ON COLUMN "hotel"."hotels"."licenseNumber" IS 'Tourism / hotel license number'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_4b1e0a5251af116f478314ce1c" ON "hotel"."hotels" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d87ba6d25d4ad000f93a503ff3" ON "hotel"."hotels" ("ownerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_owners_status_enum" AS ENUM('PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_owners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying(128) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(20) NOT NULL, "businessName" character varying(255) NOT NULL, "countryCode" character varying(3) NOT NULL, "city" character varying(100), "businessAddress" text, "registrationNumber" character varying, "taxNumber" character varying, "kycDocuments" jsonb, "bankDetails" jsonb, "status" "hotel"."hotel_owners_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION', "rejectionReason" text, "avatarUrl" character varying, "propertyCount" integer NOT NULL DEFAULT '0', "avgRating" numeric(3,1) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_173d84c0142c72f20e7bbc44df4" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_owners"."userId" IS 'Links to Auth Service user'; COMMENT ON COLUMN "hotel"."hotel_owners"."businessName" IS 'Hotel management company or business name'; COMMENT ON COLUMN "hotel"."hotel_owners"."countryCode" IS 'Primary country of operations'; COMMENT ON COLUMN "hotel"."hotel_owners"."registrationNumber" IS 'Business registration / trade license number'; COMMENT ON COLUMN "hotel"."hotel_owners"."taxNumber" IS 'Tax registration number (GST/VAT)'; COMMENT ON COLUMN "hotel"."hotel_owners"."propertyCount" IS 'Number of properties managed'; COMMENT ON COLUMN "hotel"."hotel_owners"."avgRating" IS 'Average rating across all properties'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_97174ac505162a5ac75467548f" ON "hotel"."hotel_owners" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_guests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" character varying NOT NULL, "hotelId" character varying NOT NULL, "customerId" character varying, "firstName" character varying(128) NOT NULL, "lastName" character varying(128) NOT NULL, "email" character varying(255), "phone" character varying(20), "nationality" character varying(100), "idType" character varying(50), "idNumber" character varying(100), "dateOfBirth" date, "checkinDate" date NOT NULL, "checkoutDate" date NOT NULL, "roomNumber" character varying(100), "isPrimaryGuest" boolean NOT NULL DEFAULT false, "isChild" boolean NOT NULL DEFAULT false, "age" integer, "hasCheckedIn" boolean NOT NULL DEFAULT false, "actualCheckinTime" TIMESTAMP WITH TIME ZONE, "hasCheckedOut" boolean NOT NULL DEFAULT false, "actualCheckoutTime" TIMESTAMP WITH TIME ZONE, "specialRequests" text, "preferences" jsonb, "isVip" boolean NOT NULL DEFAULT false, "previousStays" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f63b6b5b865f635503426312f0d" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_guests"."bookingId" IS 'Links to hotel booking'; COMMENT ON COLUMN "hotel"."hotel_guests"."hotelId" IS 'Links to hotel'; COMMENT ON COLUMN "hotel"."hotel_guests"."customerId" IS 'Links to Auth Service user (if registered)'; COMMENT ON COLUMN "hotel"."hotel_guests"."idType" IS 'e.g. Passport, National ID, Driving License'; COMMENT ON COLUMN "hotel"."hotel_guests"."roomNumber" IS 'Room number assigned'; COMMENT ON COLUMN "hotel"."hotel_guests"."preferences" IS 'Guest preferences e.g. pillow type, floor preference'; COMMENT ON COLUMN "hotel"."hotel_guests"."isVip" IS 'VIP/loyalty guest flag'; COMMENT ON COLUMN "hotel"."hotel_guests"."previousStays" IS 'Number of previous stays at this hotel'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_09e1d9cd8a42738e60ee8284e1" ON "hotel"."hotel_guests" ("bookingId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ed1447a93e5bd4fb4cba41aa3a" ON "hotel"."hotel_guests" ("hotelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ea02e4d3487c15013acdf87696" ON "hotel"."hotel_guests" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "hotel"."hotel_payouts_status_enum" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ON_HOLD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payoutNumber" character varying NOT NULL, "ownerId" character varying NOT NULL, "hotelId" character varying NOT NULL, "period" character varying(50) NOT NULL, "grossAmount" numeric(12,2) NOT NULL, "commissionAmount" numeric(12,2) NOT NULL DEFAULT '0', "commissionRate" numeric(5,2) NOT NULL DEFAULT '15', "taxDeducted" numeric(12,2) NOT NULL DEFAULT '0', "refundsDeducted" numeric(12,2) NOT NULL DEFAULT '0', "adjustments" numeric(12,2) NOT NULL DEFAULT '0', "netAmount" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'AED', "totalBookings" integer NOT NULL DEFAULT '0', "cancelledBookings" integer NOT NULL DEFAULT '0', "completedNights" integer NOT NULL DEFAULT '0', "status" "hotel"."hotel_payouts_status_enum" NOT NULL DEFAULT 'PENDING', "transferReference" character varying, "failureReason" text, "bankDetails" jsonb, "processedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3f837a57c8e66e3491e968f22d" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_payouts"."payoutNumber" IS 'Human-readable payout number e.g. PO-001'; COMMENT ON COLUMN "hotel"."hotel_payouts"."ownerId" IS 'Hotel owner ID'; COMMENT ON COLUMN "hotel"."hotel_payouts"."hotelId" IS 'Hotel ID'; COMMENT ON COLUMN "hotel"."hotel_payouts"."period" IS 'Payout period e.g. Jun 2026'; COMMENT ON COLUMN "hotel"."hotel_payouts"."grossAmount" IS 'Gross booking revenue for the period'; COMMENT ON COLUMN "hotel"."hotel_payouts"."commissionAmount" IS 'Platform commission deducted'; COMMENT ON COLUMN "hotel"."hotel_payouts"."commissionRate" IS 'Commission rate applied'; COMMENT ON COLUMN "hotel"."hotel_payouts"."taxDeducted" IS 'Tax deducted (TDS/WHT)'; COMMENT ON COLUMN "hotel"."hotel_payouts"."refundsDeducted" IS 'Refunds deducted from payout'; COMMENT ON COLUMN "hotel"."hotel_payouts"."adjustments" IS 'Adjustments (penalties, bonuses)'; COMMENT ON COLUMN "hotel"."hotel_payouts"."netAmount" IS 'Net payout amount'; COMMENT ON COLUMN "hotel"."hotel_payouts"."transferReference" IS 'Bank transfer reference number'; COMMENT ON COLUMN "hotel"."hotel_payouts"."bankDetails" IS 'Bank account used for this payout (snapshot)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_07a6332d6794a918857718fe7d" ON "hotel"."hotel_payouts" ("payoutNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d64db6b52950e4e08a207f38ce" ON "hotel"."hotel_payouts" ("ownerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6efc818a45ebc2604d57301a0c" ON "hotel"."hotel_payouts" ("hotelId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "hotel"."hotel_seasonal_pricing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hotel_id" uuid NOT NULL, "room_id" uuid, "name" character varying(128) NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "multiplier" numeric(5,2), "fixedPrice" numeric(12,2), "dayOfWeekMultipliers" jsonb, "priority" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6eaa7819a8e333cafebc2f7c61d" PRIMARY KEY ("id")); COMMENT ON COLUMN "hotel"."hotel_seasonal_pricing"."room_id" IS 'Null = applies to all rooms'; COMMENT ON COLUMN "hotel"."hotel_seasonal_pricing"."name" IS 'e.g. Summer Peak, Eid Holiday, Winter Special'; COMMENT ON COLUMN "hotel"."hotel_seasonal_pricing"."multiplier" IS 'Multiplier (1.25 = 25% increase)'; COMMENT ON COLUMN "hotel"."hotel_seasonal_pricing"."fixedPrice" IS 'Fixed price override (takes priority over multiplier)'; COMMENT ON COLUMN "hotel"."hotel_seasonal_pricing"."dayOfWeekMultipliers" IS 'Day-of-week overrides: { "friday": 1.3, "saturday": 1.3 }'; COMMENT ON COLUMN "hotel"."hotel_seasonal_pricing"."priority" IS 'Higher priority wins conflicts'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_53fe8b1b6d23d0d82b71c00413" ON "hotel"."hotel_seasonal_pricing" ("hotel_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a0f242c25f4d86033d189ed26a" ON "hotel"."hotel_seasonal_pricing" ("room_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_87828690500e22f61e4b7dbdc8" ON "hotel"."hotel_seasonal_pricing" ("startDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_95b81f9d08f2ece29717d99472" ON "hotel"."hotel_seasonal_pricing" ("endDate") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "hotel"."hotel_bookings" ADD CONSTRAINT "FK_061922f243c805fb7d3cdd55cf7" FOREIGN KEY ("hotel_id") REFERENCES "hotel"."hotels"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "hotel"."hotel_bookings" ADD CONSTRAINT "FK_e745f25469d342910784b5f8942" FOREIGN KEY ("room_id") REFERENCES "hotel"."hotel_rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "hotel"."hotel_rooms" ADD CONSTRAINT "FK_371d751ab23caad7e7bf64e77ff" FOREIGN KEY ("hotel_id") REFERENCES "hotel"."hotels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "hotel"."hotel_reviews" ADD CONSTRAINT "FK_6622ddf45f0ca7533b0f1ca4a7d" FOREIGN KEY ("hotel_id") REFERENCES "hotel"."hotels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "hotel"."hotel_staff" ADD CONSTRAINT "FK_cdadf3b2bedcba38e218e4cc4ae" FOREIGN KEY ("hotel_id") REFERENCES "hotel"."hotels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "hotel"."hotel_seasonal_pricing" ADD CONSTRAINT "FK_53fe8b1b6d23d0d82b71c00413b" FOREIGN KEY ("hotel_id") REFERENCES "hotel"."hotels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "hotel"."hotel_seasonal_pricing" ADD CONSTRAINT "FK_a0f242c25f4d86033d189ed26ac" FOREIGN KEY ("room_id") REFERENCES "hotel"."hotel_rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hotel"."hotel_seasonal_pricing" DROP CONSTRAINT "FK_a0f242c25f4d86033d189ed26ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotel"."hotel_seasonal_pricing" DROP CONSTRAINT "FK_53fe8b1b6d23d0d82b71c00413b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotel"."hotel_staff" DROP CONSTRAINT "FK_cdadf3b2bedcba38e218e4cc4ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotel"."hotel_reviews" DROP CONSTRAINT "FK_6622ddf45f0ca7533b0f1ca4a7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotel"."hotel_rooms" DROP CONSTRAINT "FK_371d751ab23caad7e7bf64e77ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotel"."hotel_bookings" DROP CONSTRAINT "FK_e745f25469d342910784b5f8942"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotel"."hotel_bookings" DROP CONSTRAINT "FK_061922f243c805fb7d3cdd55cf7"`,
    );
    await queryRunner.query(`DROP INDEX "hotel"."IDX_95b81f9d08f2ece29717d99472"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_87828690500e22f61e4b7dbdc8"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_a0f242c25f4d86033d189ed26a"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_53fe8b1b6d23d0d82b71c00413"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_seasonal_pricing"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_6efc818a45ebc2604d57301a0c"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_d64db6b52950e4e08a207f38ce"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_07a6332d6794a918857718fe7d"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_payouts"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_payouts_status_enum"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_ea02e4d3487c15013acdf87696"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_ed1447a93e5bd4fb4cba41aa3a"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_09e1d9cd8a42738e60ee8284e1"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_guests"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_97174ac505162a5ac75467548f"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_owners"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_owners_status_enum"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_d87ba6d25d4ad000f93a503ff3"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_4b1e0a5251af116f478314ce1c"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotels"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotels_status_enum"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotels_type_enum"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_921093cd6833e36d91657f8a3a"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_cdadf3b2bedcba38e218e4cc4a"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_staff"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_staff_role_enum"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_b9d66f3d2a4026ef17ac5272cc"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_6622ddf45f0ca7533b0f1ca4a7"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_reviews"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_371d751ab23caad7e7bf64e77f"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_rooms"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_rooms_status_enum"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_rooms_bedtype_enum"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_rooms_type_enum"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_7cf6e642d55fd920f5088b8fd8"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_e745f25469d342910784b5f894"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_061922f243c805fb7d3cdd55cf"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_c68646d80e3f2f9111e292f5ff"`);
    await queryRunner.query(`DROP INDEX "hotel"."IDX_a57b065827fdb98de0ec98894c"`);
    await queryRunner.query(`DROP TABLE "hotel"."hotel_bookings"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_bookings_status_enum"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_bookings_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "hotel"."hotel_bookings_paymentmethod_enum"`);
    // The schema last, and only if nothing is left in it. RESTRICT
    // raises dependent_objects_still_exist when it still holds objects
    // this migration did not create — exactly the case where dropping it
    // would take somebody else's tables with it.
    await queryRunner.query(`DO $guard$ BEGIN
  DROP SCHEMA IF EXISTS "hotel" RESTRICT;
EXCEPTION WHEN dependent_objects_still_exist THEN NULL;
END $guard$`);
  }
}
