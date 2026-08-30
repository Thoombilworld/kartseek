import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, KafkaModule], controllers: [AuditLogController], providers: [AuditLogService] })
export class AuditLogServiceModule {}
