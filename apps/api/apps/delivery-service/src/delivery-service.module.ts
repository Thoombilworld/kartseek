import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    HealthModule.register({ service: 'delivery-service', database: false, redis: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    KafkaModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryServiceModule {}
