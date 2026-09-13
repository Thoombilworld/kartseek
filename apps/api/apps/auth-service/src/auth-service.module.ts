import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from '@app/security';
import { AuthController } from './auth.controller';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';

const envSchema = buildEnvSchema({
  AUTH_GRPC_PORT: Joi.number().default(5001),
  AUTH_SERVICE_PORT: Joi.number().default(3010),
  // 32, the same floor the gateway's schema applies and the same one
  // `resolveJwtSecret()` enforces at the point of use. Bare `.required()` let a
  // 20-character secret pass auth-service's boot validation and then be refused
  // by the resolver — which reads as "auth is broken" rather than "the secret is
  // too short", and this is the process that MINTS the tokens.
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.number().default(900),
});

@Module({
  imports: [
    // `database: false` because this service opens no database connection —
    // see the note on the removed DatabaseModule import below. Readiness
    // reported a Postgres it never used, so a database outage failed the probe
    // of the one service that could have carried on issuing tokens.
    HealthModule.register({ service: 'auth-service', database: false, redis: true }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
      // `validationOptions: { abortEarly: false }` was removed for
      // @nestjs/config v12: it validates through Standard Schema now, and
      // `abortEarly` is a Joi option the new type does not accept. Joi still
      // works as the schema — what changes is that a bad .env reports its
      // first problem rather than all of them, so fixing one may reveal the
      // next.
    }),
    /**
     * `DatabaseModule.registerPostgres()` used to sit here, with no entities
     * and nothing to query (AUD2-142).
     *
     * It opened a pooled Postgres connection per replica and held it idle for
     * the life of the process. Nothing in `src/` and nothing in `@app/security`
     * touches TypeORM — `ResourceOwnershipGuard` documents itself as NOT
     * IMPLEMENTED precisely because it has no EntityManager — so the pool
     * existed only to be counted against `max_connections`, and to fail this
     * service's readiness probe whenever the database was down.
     *
     * Authentication state lives in Redis (`AccountLockoutService`,
     * `RefreshTokenService`), which is why `dependsOn` is `[redis]` in
     * `services.yaml`. If a future controller here needs a row, add the
     * connection back *with its entities* and flip `database` back to `true`
     * in both the HealthModule call above and the registry entry.
     */
    SecurityModule,
  ],
  controllers: [AuthController],
  providers: [],
})
export class AuthServiceModule {}
