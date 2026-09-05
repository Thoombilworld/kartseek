import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

const AUDIT_DB = 'kartseek_audit';

/** Dedicated audit URI, or the platform URI with its database name swapped. */
export function resolveAuditUri(cfg: ConfigService): string {
  const explicit = cfg.get<string>('MONGO_AUDIT_URI');
  if (explicit) return explicit;

  const platform = cfg.get<string>('MONGO_URI');
  if (!platform) return `mongodb://localhost:27017/${AUDIT_DB}`;

  try {
    const url = new URL(platform);
    url.pathname = `/${AUDIT_DB}`;
    return url.toString();
  } catch {
    // Not parseable (e.g. a mongodb+srv seed list with options) — append rather
    // than guess, and let Mongo reject it loudly if that is wrong.
    return platform.includes('?')
      ? platform.replace(/\/[^/?]*\?/, `/${AUDIT_DB}?`)
      : platform.replace(/\/[^/]*$/, `/${AUDIT_DB}`);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      /**
       * The audit trail gets its own database.
       *
       * This used to read `MONGO_URI` with `.../kartseek_audit` as a *default*.
       * The default is dead: `MONGO_URI` is set platform-wide and points at
       * `kartseek_catalog`, so every audit record would have been written into
       * the product catalogue's database — the one store that is bulk-reseeded.
       *
       * `MONGO_AUDIT_URI` wins if set. Otherwise the platform URI is reused for
       * host and credentials, with the database name replaced, so the audit
       * trail is isolated without needing a second set of credentials.
       */
      useFactory: (cfg: ConfigService) => ({ uri: resolveAuditUri(cfg) }),
    }),
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
    RedisModule,
    KafkaModule,
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
})
export class AuditLogServiceModule {}
