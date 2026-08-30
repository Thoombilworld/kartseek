import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule], controllers: [CommissionController], providers: [CommissionService] })
export class CommissionServiceModule {}
