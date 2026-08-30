import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
// `WalletModule`, not `WalletServiceModule`. Two modules of the same shape exist
// here; only this one registers the database. Booting the other one threw
// `Nest can't resolve dependencies of the WalletService (…, ?)` for
// `WalletTransactionRepository` and the process died on startup, so nothing ever
// listened on TCP 4014 — which is why every wallet, payout and transaction
// screen in the seller portal had no data behind it.
import { WalletModule } from './wallet.module';

async function bootstrap() {
  const app = await NestFactory.create(WalletModule);
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
