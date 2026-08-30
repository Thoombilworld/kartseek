import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { LocationServiceModule } from './location-service.module';

async function bootstrap() {
  const app = await NestFactory.create(LocationServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.LOCATION_TCP_PORT ?? 4013);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.LOCATION_SERVICE_PORT ?? 3023);
  await app.listen(httpPort);
  Logger.log(`🌍 Location Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
