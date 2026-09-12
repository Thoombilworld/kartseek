import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    HealthModule.register({ service: 'cart-service', database: false, redis: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    KafkaModule,
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartServiceModule {}
