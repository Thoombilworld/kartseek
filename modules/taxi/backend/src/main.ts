import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { TaxiServiceModule } from './taxi-service.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  // TaxiServiceModule is the only root module. An earlier stub with this name
  // declared the controller and service but imported no TypeOrmModule, so
  // TaxiService could never be constructed and the process died on boot — the
  // same stub-shadows-the-real-module defect admin-service had. The stub is gone.
  const app = await NestFactory.create(TaxiServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport (gateway ClientProxy) ───────────────────────────────────
  const tcpPort = +(process.env.TAXI_TCP_PORT ?? 4027);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.TAXI_GRPC_PORT ?? 5007);
  app.connectMicroservice(createGrpcMicroserviceOptions('taxi', 'taxi.proto', grpcPort));

  await app.startAllMicroservices();
  const httpPort = +(process.env.TAXI_SERVICE_PORT ?? 3021);
  await app.listen(httpPort);
  Logger.log(
    `🚖 Taxi Service — HTTP :${httpPort} | TCP :${tcpPort} | gRPC :${grpcPort}`,
    'Bootstrap',
  );
}
bootstrap();
