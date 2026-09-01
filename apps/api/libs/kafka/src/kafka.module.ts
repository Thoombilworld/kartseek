/**
 * KARTSEEK Kafka Shared Library
 *
 * Usage:
 *   KafkaModule.register(['ORDER_SERVICE', 'INVENTORY_SERVICE', 'NOTIFICATION_SERVICE'])
 *
 * Each token in the array becomes an injectable ClientKafka.
 * Inject them via @Inject('ORDER_SERVICE') private client: ClientKafka.
 */
import { DynamicModule, Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport, KafkaOptions } from '@nestjs/microservices';
import { Partitioners } from 'kafkajs';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * Which service this process is.
 *
 * Every service in this monorepo loads the same `.env`, so they all read the
 * same `KAFKA_CLIENT_ID` and the same `KAFKA_GROUP_ID`. The result was that
 * nineteen processes joined one consumer group — `kartseek-consumers-client` —
 * all identifying as `kartseek-gateway`, which produced two problems:
 *
 *   1. A rebalance storm. Every start, stop or reload of any service triggers a
 *      group-wide rebalance, and the log fills with
 *      `The group is rebalancing, so a rejoin is needed` at ERROR level. Observed
 *      rebalances took ten seconds, during which no member consumes anything.
 *
 *   2. Reply misrouting, which is the serious one. Nest's request/reply over
 *      Kafka has each client consume its own reply topic. Members of one group
 *      *share* a topic's partitions, so a reply meant for grocery-service could
 *      be handed to hotel-service instead — which holds no matching correlation
 *      id and silently drops it. The caller then waits for a reply that has
 *      already been consumed by someone else.
 *
 * Resolution order: an explicit `SERVICE_NAME` (what a container should set),
 * then the entry-point path, which under `nest start <app>` and in the bundled
 * output is `…/dist/apps/<service>/main.js`.
 */
function serviceIdentity(cfg: ConfigService): string {
  const explicit = cfg.get<string>('SERVICE_NAME');
  if (explicit) return explicit.trim().toLowerCase();

  /**
   * The npm script that started this process — `start:marketplace`,
   * `start:gateway` and so on, one per service in `dev:all`.
   *
   * First because it is the only one of these that works in the mode the team
   * actually runs. Under `nest start <app> --watch` the CLI is the main module,
   * so `require.main.filename` is the Nest CLI's own path and the derivation
   * below silently falls through to `'app'` — which is how the first attempt at
   * this fix left every service sharing one group again, just under a new name.
   */
  const script = process.env.npm_lifecycle_event ?? '';
  const fromScript = script.replace(/^(start|dev):/, '');
  if (fromScript && fromScript !== script) return fromScript.toLowerCase();

  /**
   * The workspace directory, for the extracted module backends.
   *
   * `modules/<name>/backend` has neither of the shapes the two derivations
   * above look for: its npm script is a plain `dev` (not `dev:<service>`) and
   * its path has no `apps/<service>` segment. So all eight extracted backends
   * fell through to the `'app'` fallback and joined a single consumer group,
   * `kartseek-consumers-app-client`, with eight members — the exact collision
   * this function exists to prevent, complete with the rebalance storm and the
   * reply misrouting described above.
   *
   * The working directory rather than `require.main`: these run under
   * `nest start --watch`, where `require.main` is the Nest CLI. Turbo runs each
   * workspace's script in that workspace's own directory, so `cwd` identifies
   * the module in watch mode and in the bundled output alike.
   *
   * `-service` suffix to match what the `apps/` derivation yields, so grocery
   * consumes as `kartseek-consumers-grocery-service` either way. None of the
   * eight module names collides with a directory in `apps/api/apps`.
   */
  const cwdSegments = process.cwd().split(/[\\/]+/);
  const modulesAt = cwdSegments.lastIndexOf('modules');
  if (modulesAt >= 0 && cwdSegments[modulesAt + 1]) {
    return `${cwdSegments[modulesAt + 1].toLowerCase()}-service`;
  }

  /**
   * The bundled entry point, for production where npm is not in the picture:
   * `…/apps/api/dist/apps/<service>/main.js`.
   *
   * Split rather than regex-match, and take the *last* `apps` segment — the
   * path contains `apps/api` first, so a first match would return `api` for
   * every service and reproduce the collision.
   */
  const segments = (require.main?.filename ?? '').split(/[\\/]+/);
  const lastAppsAt = segments.lastIndexOf('apps');
  if (lastAppsAt >= 0 && segments[lastAppsAt + 1]) {
    return segments[lastAppsAt + 1].toLowerCase();
  }

  // Nothing to distinguish this process by. Better to share one identity than
  // to invent a random one per boot, which would leave orphaned consumer groups
  // behind on every restart.
  return 'app';
}

/** Shared Kafka client config factory — same brokers for all named clients. */
function kafkaClientFactory(cfg: ConfigService, clientId: string): KafkaOptions {
  const service = serviceIdentity(cfg);

  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        // Scoped per process — see `serviceIdentity`. Sharing one clientId across
        // nineteen services made every Kafka log line ambiguous about its origin.
        clientId: `${clientId}-${service}`,
        brokers: cfg.get<string>('KAFKA_BROKERS', 'localhost:9092').split(','),
        ssl: cfg.get<string>('KAFKA_SSL', 'false') === 'true',
        sasl: cfg.get<string>('KAFKA_SASL_USERNAME')
          ? {
              mechanism: 'plain' as const,
              username: cfg.get<string>('KAFKA_SASL_USERNAME', ''),
              password: cfg.get<string>('KAFKA_SASL_PASSWORD', ''),
            }
          : undefined,
      },
      consumer: {
        /**
         * One consumer group per service, not one for the whole platform.
         *
         * `KAFKA_GROUP_ID` is now the *prefix*: pharmacy-service consumes as
         * `kartseek-consumers-pharmacy-service`, and a restart rebalances only
         * its own group instead of all nineteen.
         */
        groupId: `${cfg.get('KAFKA_GROUP_ID', 'kartseek-consumers')}-${service}`,
      },
      producer: {
        allowAutoTopicCreation: true,
        /**
         * Stated explicitly, rather than left to the default.
         *
         * KafkaJS v2 changed which partitioner it uses by default, and warns
         * about it on every client construction — a line in every service's boot
         * log, on every restart. More importantly the choice is not cosmetic:
         * the partitioner decides which partition a keyed message lands on, and
         * therefore what ordering guarantee consumers of that key actually get.
         *
         * `DefaultPartitioner` is the v2 behaviour, which is what these topics
         * were created under. Naming it makes the decision reviewable and stops
         * a future KafkaJS upgrade silently repartitioning live topics.
         */
        createPartitioner: Partitioners.DefaultPartitioner,
      },
    },
  };
}

// ── Static module (default KAFKA_CLIENT) ─────────────────────────────────────

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) =>
          kafkaClientFactory(cfg, cfg.get('KAFKA_CLIENT_ID', 'kartseek')),
      },
    ]),
  ],
  providers: [KafkaProducerService],
  exports: [KafkaProducerService, ClientsModule],
})
export class KafkaModule {
  /**
   * Register one or more named Kafka ClientKafka instances.
   *
   * Each string in `serviceTokens` becomes an injectable token:
   *   KafkaModule.register(['ORDER_SERVICE', 'NOTIFICATION_SERVICE'])
   *   → @Inject('ORDER_SERVICE') private orderKafka: ClientKafka
   *
   * A global `KAFKA_CLIENT` is always registered alongside the named ones.
   */
  static register(serviceTokens: string[] = []): DynamicModule {
    // Always include the base KAFKA_CLIENT plus one entry per token
    const allTokens = ['KAFKA_CLIENT', ...serviceTokens];

    // Deduplicate in case caller passes 'KAFKA_CLIENT' explicitly
    const uniqueTokens = [...new Set(allTokens)];

    const clientRegistrations = uniqueTokens.map((token) => ({
      name: token,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        kafkaClientFactory(
          cfg,
          cfg.get('KAFKA_CLIENT_ID', 'kartseek') + '-' + token.toLowerCase(),
        ),
    }));

    return {
      global: true,
      module: KafkaModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync(clientRegistrations),
      ],
      providers: [KafkaProducerService],
      // Export ClientsModule so all registered tokens are resolvable
      // in the importing module (AppModule) context.
      exports: [KafkaProducerService, ClientsModule],
    };
  }
}
