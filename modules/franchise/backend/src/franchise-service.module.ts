import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { FranchiseController } from './franchise.controller';
import { FranchiseService } from './franchise.service';
import { assertSynchronizeAllowed, databaseCredentials } from '@app/database';
import { resolveFranchiseDbConfig, FRANCHISE_DB_SCHEMA } from './db-config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Franchise } from './entities/franchise.entity';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';

const envSchema = buildEnvSchema({
  FRANCHISE_TCP_PORT: Joi.number().default(4006),
  FRANCHISE_SERVICE_PORT: Joi.number().default(3016),
  // Defaults must match each service's own bind port in its main.ts.
  MARKETPLACE_TCP_PORT: Joi.number().default(4002),
  DOCTOR_TCP_PORT: Joi.number().default(4007),
  GROCERY_TCP_PORT: Joi.number().default(4008),
  PHARMACY_TCP_PORT: Joi.number().default(4010),
  RESTAURANT_TCP_PORT: Joi.number().default(4018),
});

@Module({
  imports: [
    HealthModule.register({ service: 'franchise-service', database: true, redis: true }),
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
    RedisModule.register({ keyPrefix: 'kartseek:franchise:' }),
    KafkaModule,

    // franchise-service owns exactly one table: `franchises`.
    // It reaches every other module's data through that module's own service,
    // which is why extracting it needed no cross-database access — the TCP
    // clients below are the whole of its dependency on the other verticals.
    //
    // Inline rather than DatabaseModule.registerPostgres, which takes no
    // database override: that helper is shared with services still on
    // kartseek_db, so franchise needed its own config to point at its own
    // database without changing behaviour for everything else.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        // Kept for the two things it owns: the SSL policy, and the production
        // guard that refuses to boot with the built-in development password
        // when NODE_ENV=production. The connection target itself is overridden
        // immediately below, by the resolver the CLI runner shares.
        ...databaseCredentials(cfg),
        // One resolver, shared with data-source.ts — see ./db-config.ts. The
        // two used to resolve these five values separately, with different
        // last resorts, so without a module .env the CLI and the service
        // reached different databases.
        ...resolveFranchiseDbConfig((key) => cfg.get<string>(key)),
        // Fixed, not configurable: each entity names this schema too.
        schema: FRANCHISE_DB_SCHEMA,
        entities: [Franchise],
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
          'franchise-service',
        ),
      }),
    }),
    TypeOrmModule.forFeature([Franchise]),

    ClientsModule.register([
      {
        name: 'MARKETPLACE_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: +(process.env.MARKETPLACE_TCP_PORT ?? 4002) },
      },
      {
        name: 'DOCTOR_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: +(process.env.DOCTOR_TCP_PORT ?? 4007) },
      },
      {
        name: 'GROCERY_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: +(process.env.GROCERY_TCP_PORT ?? 4008) },
      },
      {
        name: 'PHARMACY_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: +(process.env.PHARMACY_TCP_PORT ?? 4010) },
      },
      {
        name: 'RESTAURANT_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: +(process.env.RESTAURANT_TCP_PORT ?? 4018) },
      },
    ]),
  ],
  controllers: [FranchiseController],
  providers: [FranchiseService],
})
export class FranchiseServiceModule {}
