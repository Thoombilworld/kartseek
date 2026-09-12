import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    HealthModule.register({ service: 'refund-service', database: false, redis: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    KafkaModule,
  ],
  controllers: [RefundController],
  providers: [RefundService],
})
export class RefundServiceModule {}
