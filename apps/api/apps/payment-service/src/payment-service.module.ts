import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { PaymentController } from './payment.controller';
import { PaymentOrchestratorService } from './payment.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule],
  controllers: [PaymentController],
  providers: [PaymentOrchestratorService],
})
export class PaymentServiceModule {}
