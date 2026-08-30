import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DeliveryServiceModule } from './delivery-service.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(DeliveryServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.DELIVERY_GRPC_PORT ?? 5008);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('delivery', 'delivery.proto', grpcPort),
  );

  await app.startAllMicroservices();
  const httpPort = +(process.env.DELIVERY_SERVICE_PORT ?? 3022);
  await app.listen(httpPort);
  Logger.log(`📦 Delivery Service — HTTP :${httpPort} | gRPC :${grpcPort}`, 'Bootstrap');
}
bootstrap();
