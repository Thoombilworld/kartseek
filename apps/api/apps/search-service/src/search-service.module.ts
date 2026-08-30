import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchServiceModule {}
