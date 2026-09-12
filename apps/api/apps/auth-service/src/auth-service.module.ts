import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { SecurityModule } from '@app/security';
import { AuthController } from './auth.controller';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';

const envSchema = buildEnvSchema({
  AUTH_GRPC_PORT: Joi.number().default(5001),
  AUTH_SERVICE_PORT: Joi.number().default(3010),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.number().default(900),
});

@Module({
  imports: [
    HealthModule.register({ service: 'auth-service', database: true, redis: true }),
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
    DatabaseModule.registerPostgres(),
    SecurityModule,
  ],
  controllers: [AuthController],
  providers: [],
})
export class AuthServiceModule {}
