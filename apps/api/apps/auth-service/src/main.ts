import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.AUTH_GRPC_PORT ?? 5001);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('auth', 'auth.proto', grpcPort),
  );

  await app.startAllMicroservices();
  const httpPort = +(process.env.AUTH_SERVICE_PORT ?? 3010);
  await app.listen(httpPort);
  Logger.log(`🛡️  Auth Service — HTTP :${httpPort} | gRPC :${grpcPort}`, 'Bootstrap');
}
bootstrap();
