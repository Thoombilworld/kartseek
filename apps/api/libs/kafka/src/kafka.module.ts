/**
 * KARTSEEK Kafka Shared Library
 *
 * Usage — every deployable names itself, once, with the name it carries in
 * `services.yaml`:
 *
 *   KafkaModule.forService('marketplace-service')
 *   KafkaModule.forService('api-gateway', { clients: ['BILLING_EVENTS'] })
 *
 * The default `KAFKA_CLIENT` token is always registered; each extra token in
 * `clients` becomes another injectable `ClientKafka` with its own clientId.
 * Inject them via `@Inject('KAFKA_CLIENT') private client: ClientKafka`, or
 * use `KafkaProducerService`, which wraps the default one.
 *
 * ── Why the name is declared, not detected ──────────────────────────────────
 *
 * The previous version of this module *derived* the service identity from how
 * the process happened to be launched: the npm lifecycle event, the working
 * directory, then `require.main.filename`, and finally a shared fallback of
 * `'app'`. Two of those never worked in the shapes the platform actually runs:
 *
 *   • `require.main` is undefined inside an rspack bundle, which is every
 *     `dist/main.js` this repository builds — so the "production" derivation
 *     was dead code, and only the dev-only heuristics kept names apart;
 *   • the smoke harness and the container images start processes with no npm
 *     lifecycle, so every core service there fell through to `'app'`.
 *
 * The result was the recorded rebalance storm: many independent services in
 * one consumer group named `kartseek-consumers-app-client`, all identifying
 * as `kartseek-gateway-app-client`. A silent shared fallback is the one thing
 * an identity resolver must never have, so this one throws instead.
 *
 * `SERVICE_NAME` (an environment variable, read through ConfigService so a
 * `.env` value counts) still overrides the declared name — that is how one
 * image can be run under a different name — but it is an override, not a
 * fallback.
 *
 * ── Why every client is producer-only ───────────────────────────────────────
 *
 * Nest's `ClientKafka` creates a *consumer* as well as a producer on
 * `connect()`, subscribes it to the reply topics of every `send()` pattern,
 * and joins the configured consumer group. Nothing on this platform uses
 * Kafka request/reply — every `.send()` goes to a TCP `ClientProxy`, and Kafka
 * carries fire-and-forget domain events only — so those consumers subscribed
 * to nothing and existed only to join a group. Twenty-odd groups with one
 * idle member each, every one of them rebalancing on every restart, and every
 * ungraceful restart (hot reload, `taskkill /F`) leaving a dead member behind
 * that blocked the next join for the rest of its session timeout: 13–20 s
 * measured on the broker.
 *
 * With `producerOnlyMode` there is no consumer and no group membership. The
 * real consumers on the platform — search-service (`search-indexer`),
 * audit-log-service (`audit-log-consumers`), notification-service
 * (`notification-password-reset`) and the gateway's WebSocket bridge
 * (`KafkaConsumerService`, one group per instance) — each own their group
 * explicitly and are documented in docs/architecture/messaging.md.
 */
import { type DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport, type KafkaOptions } from '@nestjs/microservices';
import { Partitioners } from 'kafkajs';
import { KafkaProducerService } from './kafka-producer.service';
import { KAFKA_CLIENT, KAFKA_SERVICE_IDENTITY } from './kafka.tokens';

/** Kafka client ids and group names: lower-case, digits and dashes, as in `services.yaml`. */
const IDENTITY_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

export interface KafkaModuleOptions {
  /**
   * Extra `ClientKafka` tokens to register beside `KAFKA_CLIENT`. Each is
   * producer-only, with a clientId that names both the service and the token.
   */
  clients?: string[];
}

/**
 * The identity this process publishes under.
 *
 * `SERVICE_NAME` overrides the declared name; neither may be blank or carry
 * characters a broker would reject. Exported for the module's spec and for
 * anything else that must agree with it — it is the one function that decides.
 */
export function resolveServiceIdentity(
  declared: string | undefined,
  override: string | undefined = process.env.SERVICE_NAME,
): string {
  const name = (override?.trim() || declared?.trim() || '').toLowerCase();
  if (!name) {
    throw new Error(
      'KafkaModule needs the service name. Import it as ' +
        "KafkaModule.forService('<name from services.yaml>') or set SERVICE_NAME.",
    );
  }
  if (!IDENTITY_RE.test(name)) {
    throw new Error(
      `KafkaModule: "${name}" is not a valid service identity — use lower-case letters, digits and dashes.`,
    );
  }
  return name;
}

/** The clientId a token gets: the default client is the service itself, others append the token. */
export function kafkaClientId(service: string, token: string): string {
  return token === KAFKA_CLIENT
    ? `kartseek-${service}`
    : `kartseek-${service}-${token.toLowerCase().replace(/_/g, '-')}`;
}

/**
 * Options for one producer-only `ClientKafka`. Exported so the spec can assert
 * the shape without booting a module.
 */
export function kafkaClientOptions(
  cfg: ConfigService,
  service: string,
  token: string,
): KafkaOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: kafkaClientId(service, token),
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
      /**
       * No consumer is created in producer-only mode, so no group is joined.
       * The name is still set — Nest reads it at construction — and is
       * per-service so that if request/reply is ever enabled for one client,
       * its reply consumer cannot collide with another service's.
       */
      consumer: {
        groupId: `${cfg.get<string>('KAFKA_GROUP_ID', 'kartseek-consumers')}-${service}`,
      },
      producerOnlyMode: true,
      producer: {
        allowAutoTopicCreation: true,
        /**
         * Stated explicitly, rather than left to the default.
         *
         * KafkaJS v2 changed which partitioner it uses by default, and warns
         * about it on every client construction. More importantly the choice is
         * not cosmetic: the partitioner decides which partition a keyed message
         * lands on, and therefore what ordering guarantee consumers of that key
         * actually get. `DefaultPartitioner` is the v2 behaviour these topics
         * were created under; naming it stops a future upgrade silently
         * repartitioning live topics.
         */
        createPartitioner: Partitioners.DefaultPartitioner,
      },
    },
  };
}

@Global()
@Module({})
export class KafkaModule {
  /**
   * Register this service's Kafka clients under its declared identity.
   *
   * The identity is resolved inside the client factories, after
   * `ConfigModule.forRoot` has loaded `.env`, so a `SERVICE_NAME` set there is
   * honoured exactly like one set in the container environment.
   */
  static forService(service: string, options: KafkaModuleOptions = {}): DynamicModule {
    // Validated eagerly for the declared name so a typo fails at import, not
    // at the first publish; the override is applied per factory below.
    resolveServiceIdentity(service, undefined);

    const tokens = [
      KAFKA_CLIENT,
      ...new Set((options.clients ?? []).filter((token) => token && token !== KAFKA_CLIENT)),
    ];

    const identityFactory = {
      provide: KAFKA_SERVICE_IDENTITY,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        resolveServiceIdentity(service, cfg.get<string>('SERVICE_NAME')),
    };

    return {
      global: true,
      module: KafkaModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync(
          tokens.map((name) => ({
            name,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) =>
              kafkaClientOptions(
                cfg,
                resolveServiceIdentity(service, cfg.get<string>('SERVICE_NAME')),
                name,
              ),
          })),
        ),
      ],
      providers: [identityFactory, KafkaProducerService],
      exports: [KAFKA_SERVICE_IDENTITY, KafkaProducerService, ClientsModule],
    };
  }
}
