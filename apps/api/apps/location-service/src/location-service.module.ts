import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region, State, District, City, Pincode, DeliveryZone, ServiceArea } from './entities';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    DatabaseModule.registerPostgres([Region, State, District, City, Pincode, DeliveryZone, ServiceArea], 'location'),
    TypeOrmModule.forFeature([Region, State, District, City, Pincode, DeliveryZone, ServiceArea]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationServiceModule {}
