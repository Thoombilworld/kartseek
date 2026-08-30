import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { FranchiseModule } from './franchise.module';

async function bootstrap() {
  const app = await NestFactory.create(FranchiseModule);
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
