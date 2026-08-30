import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    RedisModule,
    KafkaModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
