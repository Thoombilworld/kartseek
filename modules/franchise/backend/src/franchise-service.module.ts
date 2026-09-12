import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { FranchiseController } from './franchise.controller';
import { FranchiseService } from './franchise.service';
import { databaseCredentials } from '@app/database';
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
        // Dedicated FRANCHISE_DB_* values win; anything unset falls back to the
        // shared DB_* credentials.
        ...databaseCredentials(cfg),
        host: cfg.get<string>('FRANCHISE_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('FRANCHISE_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('FRANCHISE_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('FRANCHISE_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('FRANCHISE_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
        schema: 'franchise',
        entities: [Franchise],
        synchronize: cfg.get('NODE_ENV', 'development') !== 'production',
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
