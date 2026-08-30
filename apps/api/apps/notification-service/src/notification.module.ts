import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    RedisModule,
    KafkaModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
