import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { CartServiceModule } from './cart-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CartServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.CART_TCP_PORT ?? 4003);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.CART_SERVICE_PORT ?? 3013);
  await app.listen(httpPort);
  Logger.log(`🛒 Cart Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
