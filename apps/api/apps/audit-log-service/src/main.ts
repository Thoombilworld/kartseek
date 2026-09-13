import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AuditLogServiceModule } from './audit-log-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AuditLogServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── Kafka consumer ──────────────────────────────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'audit-log-service',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      },
      consumer: { groupId: 'audit-log-consumers' },
    },
  });

  // ── TCP request/reply ───────────────────────────────────────────────────────
  // Kafka carries writes: it is fire-and-forget, which is right for recording an
  // action but cannot answer a question. The admin console needs a *read* — one
  // filtered, market-scoped page of the trail, answered synchronously — so the
  // gateway dials this port for `audit.query` and `audit.record`.
  //
  // The default MUST match `AUDIT_LOG_TCP_PORT`'s Joi default in the gateway's
  // env.validation.ts. A mismatch between the two is invisible whenever `.env`
  // sets the variable explicitly, and surfaces as a 503 on every audit read the
  // day someone runs without it.
  const tcpPort = +(process.env.AUDIT_LOG_TCP_PORT ?? 4028);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.AUDIT_LOG_SERVICE_PORT ?? 3028);
  await app.listen(httpPort);
  Logger.log(
    `📋 Audit Log Service — HTTP :${httpPort} | TCP :${tcpPort} | Kafka consumer active`,
    'Bootstrap',
  );
}
bootstrap();
