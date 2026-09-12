import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { HealthModule } from '@app/common';
import { ElasticsearchHealthCheck } from './elasticsearch-health.check';

@Module({
  imports: [
    HealthModule.register({
      service: 'search-service',
      database: false,
      redis: true,
      checks: [ElasticsearchHealthCheck],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    KafkaModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchServiceModule {}
