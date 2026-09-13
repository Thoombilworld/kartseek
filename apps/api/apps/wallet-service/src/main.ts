import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
// WalletServiceModule is the only root module and the one that registers the
// database. A stub of the same shape used to shadow it; booting the stub threw
// `Nest can't resolve dependencies of the WalletService` for
// `WalletTransactionRepository`, nothing listened on TCP 4014, and every wallet
// screen in the seller portal was empty. The stub is gone.
import { WalletServiceModule } from './wallet-service.module';

async function bootstrap() {
  const app = await NestFactory.create(WalletServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.WALLET_TCP_PORT ?? 4014);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.WALLET_SERVICE_PORT ?? 3024);
  await app.listen(httpPort);
  Logger.log(`👛 Wallet Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
