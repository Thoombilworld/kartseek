import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { PharmacyServiceModule } from './pharmacy-service.module';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(PharmacyServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.PHARMACY_TCP_PORT ?? 4010);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();

  // ── HTTP — bound to loopback only (internal) ─────────────────────────────
  // The pharmacy-service HTTP endpoints have NO auth guards by design.
  // All external traffic MUST flow through the API Gateway (port 3001) which
  // enforces JwtAuthGuard and RolesGuard.  Binding to 127.0.0.1 ensures
  // these unguarded endpoints are unreachable from outside the host.
  const httpPort = +(process.env.PHARMACY_SERVICE_PORT ?? 3020);
  await app.listen(httpPort, '127.0.0.1');
  Logger.log(`💊 Pharmacy Service — HTTP 127.0.0.1:${httpPort} (internal) | TCP 0.0.0.0:${tcpPort}`, 'Bootstrap');
}
bootstrap();

