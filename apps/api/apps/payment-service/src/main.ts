import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { PaymentServiceModule } from './payment-service.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(PaymentServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.PAYMENT_GRPC_PORT ?? 5003);
  app.connectMicroservice(createGrpcMicroserviceOptions('payment', 'payment.proto', grpcPort));

  // ── TCP transport (for API Gateway ClientProxy) ─────────────────────────────
  const tcpPort = +(process.env.PAYMENT_TCP_PORT ?? 4026);
  // See hotel-service/src/main.ts: loopback here makes the transport
  // unreachable from any other pod, so the gateway could never take a payment.
  const tcpHost = process.env.PAYMENT_TCP_HOST ?? '0.0.0.0';
  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: tcpHost, port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.PAYMENT_SERVICE_PORT ?? 3025);
  await app.listen(httpPort);
  Logger.log(
    `💳 Payment Service — HTTP :${httpPort} | gRPC :${grpcPort} | TCP :${tcpPort}`,
    'Bootstrap',
  );
}
bootstrap();
