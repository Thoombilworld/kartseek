import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { RestaurantServiceModule } from './restaurant-service.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(RestaurantServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport (gateway ClientProxy) ───────────────────────────────────
  const tcpPort = +(process.env.RESTAURANT_TCP_PORT ?? 4018);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.RESTAURANT_GRPC_PORT ?? 5005);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('restaurant', 'restaurant.proto', grpcPort),
  );

  await app.startAllMicroservices();
  const httpPort = +(process.env.RESTAURANT_SERVICE_PORT ?? 3019);
  await app.listen(httpPort);
  Logger.log(`🍽️  Restaurant Service — HTTP :${httpPort} | TCP :${tcpPort} | gRPC :${grpcPort}`, 'Bootstrap');
}
bootstrap();
