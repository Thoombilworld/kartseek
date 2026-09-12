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
import { databaseCredentials } from '@app/database';

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
        // Dedicated DOCTOR_DB_* values win; anything unset falls back to the
        // shared DB_* credentials. `databaseCredentials` still supplies the
        // password default and its production guard.
        ...databaseCredentials(cfg),
        host: cfg.get<string>('DOCTOR_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('DOCTOR_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('DOCTOR_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('DOCTOR_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('DOCTOR_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
        // Fixed, not configurable: the same entities must work against either.
        schema: 'doctor',
        entities: ENTITIES,
        // Matches marketplace-service: each vertical owns a dedicated schema, so a
        // dev auto-sync cannot collide with another service's tables. Was gated on
        // DB_SYNCHRONIZE, which is explicitly false, so these tables were never
        // created and every query failed with "relation ... does not exist".
        // Production still uses migrations - see migrations/1786500000000.
        synchronize: cfg.get('NODE_ENV', 'development') !== 'production',
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
