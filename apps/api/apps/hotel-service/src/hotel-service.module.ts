import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { HotelController } from './hotel.controller';
import { HotelService } from './hotel.service';
import { HotelOwnerController } from './hotel-owner.controller';
import { HotelAdminController } from './hotel-admin.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule],
  controllers: [HotelController, HotelOwnerController, HotelAdminController],
  providers: [HotelService],
})
export class HotelServiceModule {}
