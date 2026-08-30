import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PasswordResetConsumer } from './password-reset.consumer';

// Note this is the module `main.ts` bootstraps — the similarly named
// `NotificationModule` in notification.module.ts is imported by nothing and has
// no effect at runtime.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule],
  controllers: [NotificationController],
  providers: [NotificationService, PasswordResetConsumer],
})
export class NotificationServiceModule {}
