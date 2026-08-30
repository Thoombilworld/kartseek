import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { GroceryModule } from './grocery.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(GroceryModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.GROCERY_GRPC_PORT ?? 5010);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('grocery', 'grocery.proto', grpcPort),
  );

  // ── TCP transport (used by API Gateway ClientProxy) ─────────────────────────
  const tcpPort = +(process.env.GROCERY_TCP_PORT ?? 4008);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.GROCERY_SERVICE_PORT ?? 3018);
  await app.listen(httpPort);
  Logger.log(`🥦 Grocery Service — HTTP :${httpPort} | gRPC :${grpcPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();

