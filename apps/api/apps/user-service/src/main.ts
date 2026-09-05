import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { UserServiceModule } from './user-service.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(UserServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.USER_GRPC_PORT ?? 5009);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('user', 'user.proto', grpcPort),
  );

  await app.startAllMicroservices();
  const httpPort = +(process.env.USER_SERVICE_PORT ?? 3011);
  await app.listen(httpPort);
  Logger.log(`👤 User Service — HTTP :${httpPort} | gRPC :${grpcPort}`, 'Bootstrap');
}
bootstrap();
