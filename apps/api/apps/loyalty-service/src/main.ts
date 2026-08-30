import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { LoyaltyModule } from './loyalty.module';

async function bootstrap() {
  const app = await NestFactory.create(LoyaltyModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.LOYALTY_TCP_PORT ?? 4005);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.LOYALTY_SERVICE_PORT ?? 3015);
  await app.listen(httpPort);
  Logger.log(`⭐ Loyalty Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
