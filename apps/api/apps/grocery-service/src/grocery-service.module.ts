import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { GroceryController } from './grocery.controller';
import { GroceryService } from './grocery.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule], controllers: [GroceryController], providers: [GroceryService] })
export class GroceryServiceModule {}
