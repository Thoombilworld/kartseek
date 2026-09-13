import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NotificationServiceModule } from './notification-service.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.NOTIFICATION_GRPC_PORT ?? 5004);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('notification', 'notification.proto', grpcPort),
  );

  // Kafka is consumed by PasswordResetConsumer with its own kafkajs client rather
  // than a Nest Kafka transport. Nest's ServerKafka turns EVERY pattern in the app
  // into a topic subscription, including this service's object-style
  // `@MessagePattern({ cmd: 'send_push' })` — `{"cmd":"send_push"}` is not a legal
  // Kafka topic name, so connecting the transport crashes the service on boot with
  // INVALID_TOPIC_EXCEPTION. A dedicated consumer keeps the two concerns apart.

  await app.startAllMicroservices();
  const httpPort = +(process.env.NOTIFICATION_SERVICE_PORT ?? 3026);
  await app.listen(httpPort);
  Logger.log(`🔔 Notification Service — HTTP :${httpPort} | gRPC :${grpcPort}`, 'Bootstrap');
}
bootstrap();
