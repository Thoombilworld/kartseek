import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';
import { FranchiseViewService } from './franchise/franchise-view.service';

// ── Entities ─────────────────────────────────────────────────────────────────
import { Doctor } from './entities/doctor.entity';
import { Appointment } from './entities/appointment.entity';
import { DoctorAvailability } from './entities/doctor-availability.entity';
import { Hospital } from './entities/hospital.entity';
import { Clinic } from './entities/clinic.entity';
import { Specialty } from './entities/specialty.entity';
import { Department } from './entities/department.entity';
import { Review } from './entities/review.entity';
import { Document } from './entities/document.entity';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { FamilyMember } from './entities/family-member.entity';
import { IntakeForm } from './entities/intake-form.entity';

const ENTITIES = [
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
];
import { HealthModule, buildEnvSchema, Joi } from '@app/common';
import { assertSynchronizeAllowed, databaseCredentials } from '@app/database';
import { resolveDoctorDbConfig, DOCTOR_DB_SCHEMA } from './db-config';

const envSchema = buildEnvSchema({
  DOCTOR_TCP_PORT: Joi.number().default(4007),
  // Must match this service's own main.ts. @nestjs/config writes validated
  // defaults BACK into process.env, and main.ts reads process.env after the
  // app is created — so a wrong default here silently moves the port the
  // service actually listens on, and the k8s probe then points at nothing.
  DOCTOR_SERVICE_PORT: Joi.number().default(3017),
});

@Module({
  imports: [
    HealthModule.register({ service: 'doctor-service', database: true, redis: true }),
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against process.cwd(). As an extracted microservice this is
      // started from its own directory, so its own `.env` wins; the platform
      // file stays as a fallback for the ~120 shared values.
      envFilePath: ['.env', '../../../apps/api/.env'],
      validationSchema: envSchema,
      // `validationOptions: { abortEarly: false }` was removed for
      // @nestjs/config v12: it validates through Standard Schema now, and
      // `abortEarly` is a Joi option the new type does not accept. Joi still
      // works as the schema — what changes is that a bad .env reports its
      // first problem rather than all of them, so fixing one may reveal the
      // next.
    }),

    // ── PostgreSQL via TypeORM ──────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        // SSL, the pool, the connect timeout and the retry policy — one policy
        // for every service (AUD2-033). The connection target itself is
        // overridden immediately below, by the resolver the CLI runner shares.
        //
        // The prefix matters: this module reads `DOCTOR_PASSWORD`, not
        // `DB_PASSWORD`, and its .env.example declares only the former. Without
        // it the helper refused to boot on a variable this service never uses —
        // masked in-repo by the fallback to apps/api/.env, fatal for a module
        // lifted out of this repository into an image of its own.
        ...databaseCredentials(cfg, { envPrefix: 'DOCTOR_DB' }),
        // One resolver, shared with data-source.ts — see ./db-config.ts. The
        // two used to resolve these five values separately, with different
        // last resorts, so without a module .env the CLI and the service
        // reached different databases.
        ...resolveDoctorDbConfig((key) => cfg.get<string>(key)),
        // Fixed, not configurable: each entity names this schema too.
        schema: DOCTOR_DB_SCHEMA,
        entities: ENTITIES,
        // Matches marketplace-service: each vertical owns a dedicated schema, so a
        // dev auto-sync cannot collide with another service's tables. Was gated on
        // DB_SYNCHRONIZE, which is explicitly false, so these tables were never
        // created and every query failed with "relation ... does not exist".
        // Production still uses migrations - see migrations/1786500000000.
        // Auto-sync is refused, everywhere, by two independent guards:
        //
        //   • `validateDatabaseConfig()` in main.ts throws on DB_SYNCHRONIZE=true
        //     in EVERY environment — there is no dev escape hatch, and asking
        //     for one is a fatal boot, not a warning;
        //   • `assertSynchronizeAllowed()` here throws when auto-sync survives
        //     as far as this factory under NODE_ENV=production — reachable when
        //     SKIP_DB=true has skipped the first guard (AUD2-070).
        //
        // The schema comes from `migrations/` and nothing else (IN3). To iterate
        // on entities, generate a migration against a scratch database:
        // `docs/guides/database-migrations.md`, "Generating a migration". The
        // previous `NODE_ENV !== 'production'` default is why annotating an
        // existing column made dev auto-sync DROP and recreate it — which
        // emptied that column three times during the regional plan.
        synchronize: assertSynchronizeAllowed(
          cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
          cfg.get('NODE_ENV', 'development'),
          'doctor-service',
        ),
      }),
    }),

    // ── Register repositories for injection ────────────────────────────────
    TypeOrmModule.forFeature(ENTITIES),

    RedisModule,
    KafkaModule,
  ],
  controllers: [DoctorController],
  providers: [DoctorService, FranchiseViewService],
})
export class DoctorServiceModule {}
