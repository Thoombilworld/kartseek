import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PageLayout } from './entities/page-layout.entity';
import { databaseCredentials } from '@app/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,        ...databaseCredentials(cfg),
        schema: 'admin',
        // Explicit classes, never a __dirname glob — the bundled build makes the
        // glob match nothing, leaving TypeORM with no metadata and every
        // DB-backed route throwing while /health still returns 200.
        entities: [PageLayout], synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([PageLayout]),
    RedisModule,
    KafkaModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminServiceModule {}
