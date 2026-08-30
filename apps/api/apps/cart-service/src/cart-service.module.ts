import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartServiceModule {}
