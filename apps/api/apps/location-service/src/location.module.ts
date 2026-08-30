import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';


import { RedisModule } from '@app/redis';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    RedisModule,
    
  ],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
