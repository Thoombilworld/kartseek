import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { databaseCredentials } from '@app/database';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,        ...databaseCredentials(cfg),
        schema: 'refund',
        // Empty by design: this service owns no SQL entities and injects no
        // repositories. List classes explicitly if that changes — a __dirname
        // glob matches nothing once the build bundles the service into a single
        // main.js, which fails silently (boot and /health stay green).
        entities: [], synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    RedisModule,
    KafkaModule,
  ],
  controllers: [RefundController],
  providers: [RefundService],
})
export class RefundModule {}
