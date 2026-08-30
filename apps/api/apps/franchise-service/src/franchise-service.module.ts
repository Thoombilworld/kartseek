import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { FranchiseController } from './franchise.controller';
import { FranchiseService } from './franchise.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule], controllers: [FranchiseController], providers: [FranchiseService] })
export class FranchiseServiceModule {}
