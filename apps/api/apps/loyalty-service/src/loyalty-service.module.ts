import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule], controllers: [LoyaltyController], providers: [LoyaltyService] })
export class LoyaltyServiceModule {}
