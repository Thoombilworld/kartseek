import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PasswordResetConsumer } from './password-reset.consumer';
import { NotificationEventsConsumer } from './notification-events.consumer';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';

/**
 * Validated at boot, which is where a misconfiguration is cheapest.
 *
 * `buildEnvSchema()` carries the production refusal of SKIP_DB / SKIP_KAFKA /
 * SKIP_REDIS — each swaps a shared store for an in-process emulator — and that
 * refusal is only ever reached through `validationSchema`. This module called
 * a bare `ConfigModule.forRoot`, so it loaded no schema and the guard was
 * written, tested, and absent from this process.
 *
 * The port defaults must equal this service's own main.ts defaults:
 * @nestjs/config writes validated defaults BACK into process.env, and main.ts
 * reads process.env after the app is created — so a wrong default here silently
 * moves the port the service listens on, and `npm run registry:check` is what
 * catches the disagreement.
 */
const envSchema = buildEnvSchema({
  NOTIFICATION_SERVICE_PORT: Joi.number().port().default(3026),
  NOTIFICATION_GRPC_PORT: Joi.number().port().default(5004),
});

// This is the module `main.ts` bootstraps, and now the only one in this service.
//
// A second, similarly named `NotificationModule` used to sit beside it in
// notification.module.ts, imported by nothing and with no effect at runtime —
// one of eight such siblings across these services. Each opened its own eager
// `TypeOrmModule.forRootAsync`, so reading one gave a confident and entirely
// wrong picture of what the service connects to; two reviews were misled by
// exactly that. All eight are deleted (dispatch addendum item 12).
@Module({
  imports: [
    HealthModule.register({ service: 'notification-service', database: false, redis: true }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    RedisModule,
    KafkaModule.forService('notification-service'),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, PasswordResetConsumer, NotificationEventsConsumer],
})
export class NotificationServiceModule {}
