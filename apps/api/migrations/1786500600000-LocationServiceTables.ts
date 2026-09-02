import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK - location-service tables
 *
 * The location schema was created by RemainingServiceSchemas but held no
 * tables: location-service registers through DatabaseModule.registerPostgres,
 * which hardcodes synchronize: false, so nothing ever built them from the seven
 * entities (region, state, city, district, pincode, service area, delivery zone).
 *
 * Generated with the schema builder in log mode and filtered to CREATE
 * statements; the plan contained no destructive statements for this schema.
 */
export class LocationServiceTables1786500600000 implements MigrationInterface {
  name = 'LocationServiceTables1786500600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "location"."regions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "countryCode" character varying NOT NULL, "name" character varying NOT NULL, "currency" character varying NOT NULL, "taxRate" numeric(5,2) NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d681a9200bf94c4015f84214662" UNIQUE ("countryCode"), CONSTRAINT "PK_4fcd12ed6a046276e2deb08801c" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "location"."states" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "region_id" uuid, CONSTRAINT "UQ_b8af4194277281dcfe08be42643" UNIQUE ("code"), CONSTRAINT "PK_09ab30ca0975c02656483265f4f" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "location"."service_areas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "moduleType" character varying NOT NULL, "polygon" geometry(Polygon,4326), "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_cdda4e5b616d5be3c81d15fd756" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "location"."districts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "state_id" uuid, CONSTRAINT "PK_972a72ff4e3bea5c7f43a2b98af" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "location"."cities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "boundingBoxPolygon" geometry(Polygon,4326), "district_id" uuid, CONSTRAINT "PK_4762ffb6e5d198cfec5606bc11e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "location"."delivery_zones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "polygon" geometry(Polygon,4326), "baseFee" numeric(10,2) NOT NULL DEFAULT '0', "feePerKm" numeric(10,2) NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, "city_id" uuid, CONSTRAINT "PK_88bc4c12be62436a61930cf34a9" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "location"."pincodes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "city_id" uuid, CONSTRAINT "PK_5fd33a6501ef942b0c815bd60ec" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "location"."states" ADD CONSTRAINT "FK_5e92ce53d0835e3e36630ff134e" FOREIGN KEY ("region_id") REFERENCES "location"."regions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "location"."districts" ADD CONSTRAINT "FK_18b176b7f592f3a1c55d5e43a87" FOREIGN KEY ("state_id") REFERENCES "location"."states"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "location"."cities" ADD CONSTRAINT "FK_170e96ae23943e35c2725378f0a" FOREIGN KEY ("district_id") REFERENCES "location"."districts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "location"."delivery_zones" ADD CONSTRAINT "FK_f214306977e0180efa383d052b3" FOREIGN KEY ("city_id") REFERENCES "location"."cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "location"."pincodes" ADD CONSTRAINT "FK_5036aecf2419e74c19f646a78d7" FOREIGN KEY ("city_id") REFERENCES "location"."cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "location"."pincodes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location"."delivery_zones" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location"."cities" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location"."districts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location"."service_areas" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location"."states" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location"."regions" CASCADE`);
  }
}
