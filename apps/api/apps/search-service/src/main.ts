import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { SearchServiceModule } from './search-service.module';

async function bootstrap() {
  const app = await NestFactory.create(SearchServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.SEARCH_TCP_PORT ?? 4023);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  // ── Kafka transport ─────────────────────────────────────────────────────────
  //
  // The index is only as fresh as the events it hears. marketplace-service has
  // always published product.approved / product.rejected / product.updated, and
  // nothing subscribed — so a product approved by an admin never entered the
  // search index and could not be found by name until something else happened
  // to reindex it.
  //
  // Its own consumer group, not the shared KAFKA_GROUP_ID: services sharing one
  // group id split the partitions between them and each sees only a fraction of
  // the events.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'search-service',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      },
      consumer: { groupId: 'search-indexer' },
    },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.SEARCH_SERVICE_PORT ?? 3033);
  await app.listen(httpPort);
  Logger.log(`🔍 Search Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
