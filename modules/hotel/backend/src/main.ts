import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { HotelServiceModule } from './hotel-service.module';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(HotelServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP Microservice Transport (for API Gateway ClientProxy) ───────────────
  const tcpPort = +(process.env.HOTEL_TCP_PORT ?? 4025);
  // Hotel and Payment were the only two of the twenty TCP services binding this
  // transport to loopback. On one host that is invisible; once the gateway is a
  // separate container it means nothing outside this pod can ever reach the
  // transport, so every hotel RPC failed to connect.
  const tcpHost = process.env.HOTEL_TCP_HOST ?? '0.0.0.0';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: tcpHost, port: tcpPort },
  });
  await app.startAllMicroservices();

  // ── HTTP REST (direct access + health checks) ─────────────────────────────
  const httpPort = +(process.env.HOTEL_SERVICE_PORT ?? 3035);
  await app.listen(httpPort);
  Logger.log(`🏨 Hotel Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
