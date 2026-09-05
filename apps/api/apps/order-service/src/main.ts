import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { OrderServiceModule } from './order-service.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(OrderServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.ORDER_GRPC_PORT ?? 5002);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('order', 'order.proto', grpcPort),
  );

  // ── TCP transport (for gateway ClientProxy.send() calls) ────────────────────
  // Without this the `@MessagePattern` handlers in OrderController were dead
  // code: gRPC dispatches to `@GrpcMethod` (of which this service has none), and
  // nothing else was listening, so `place_order` had no reachable handler and
  // checkout could not complete. Mirrors marketplace-service's wiring; the port
  // default must stay in step with ORDER_TCP_PORT in the gateway's
  // env.validation.ts or an unset .env silently points them at different ports.
  const tcpPort = +(process.env.ORDER_TCP_PORT ?? 4004);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.ORDER_SERVICE_PORT ?? 3014);
  await app.listen(httpPort);
  Logger.log(`📦 Order Service — HTTP :${httpPort} | gRPC :${grpcPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
