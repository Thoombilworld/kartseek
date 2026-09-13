import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AdminServiceModule } from './admin-service.module';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  // AdminServiceModule is the only root module. An earlier stub with this name
  // declared the controller and service but imported no TypeOrmModule, so
  // AdminService could never be constructed and the process died on boot with
  // UnknownDependenciesException. The stub is gone; do not reintroduce one.
  const app = await NestFactory.create(AdminServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.ADMIN_TCP_PORT ?? 4017);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.ADMIN_SERVICE_PORT ?? 3027);
  await app.listen(httpPort);
  Logger.log(`👑 Admin Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
