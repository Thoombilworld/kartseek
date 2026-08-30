import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { SecurityModule } from '@app/security';
import { AuthController } from './auth.controller';
import { HealthController } from './health.controller';
import { buildEnvSchema, Joi } from '@app/common';

const envSchema = buildEnvSchema({
  AUTH_GRPC_PORT: Joi.number().default(5001),
  AUTH_SERVICE_PORT: Joi.number().default(3010),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.number().default(900),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    DatabaseModule.registerPostgres(),
    SecurityModule,
  ],
  controllers: [AuthController, HealthController],
  providers: [],
})
export class AppModule {}
