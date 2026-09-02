import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AuditLogModule } from './audit-log.module';

async function bootstrap() {
  const app = await NestFactory.create(AuditLogModule);
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

  await app.startAllMicroservices();
  const httpPort = +(process.env.AUDIT_LOG_SERVICE_PORT ?? 3028);
  await app.listen(httpPort);
  Logger.log(`📋 Audit Log Service — HTTP :${httpPort} | Kafka consumer active`, 'Bootstrap');
}
bootstrap();
