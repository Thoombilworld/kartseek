import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { FranchiseServiceModule } from './franchise-service.module';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast on DB_SYNCHRONIZE=true, in every environment. The other six
  // vertical backends have always done this and franchise did not, so the
  // "auto-sync is refused" rule the .env.example states was true for six
  // services and not for this one. The schema comes from `migrations/` (IN3);
  // there is no environment in which auto-sync is the intended answer.
  validateDatabaseConfig();
  const app = await NestFactory.create(FranchiseServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.FRANCHISE_TCP_PORT ?? 4006);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.FRANCHISE_SERVICE_PORT ?? 3016);
  await app.listen(httpPort);
  Logger.log(`🏢 Franchise Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
