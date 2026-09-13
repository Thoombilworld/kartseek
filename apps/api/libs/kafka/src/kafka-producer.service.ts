import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import type { Admin, Kafka } from 'kafkajs';
import { KAFKA_CLIENT, KAFKA_SERVICE_IDENTITY } from './kafka.tokens';

/** What {@link KafkaProducerService.health} reports. Never thrown, always answered. */
export interface KafkaHealth {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private connected = false;
  /** Lazily created for {@link health}; one per process, not one per probe. */
  private admin?: Admin;

  constructor(
    @Inject(KAFKA_CLIENT) private readonly client: ClientKafka,
    @Inject(KAFKA_SERVICE_IDENTITY) private readonly service: string,
  ) {}

  async onModuleInit() {
    // Skip Kafka connection entirely when SKIP_KAFKA=true (local dev without Kafka)
    if (process.env.SKIP_KAFKA === 'true') {
      this.logger.warn('Kafka connection SKIPPED (SKIP_KAFKA=true). publish() will be a no-op.');
      return;
    }

    await this.connectWithRetry();
  }

  /**
   * Release the producer (and the health probe's admin client) on shutdown.
   *
   * Reached only when `app.enableShutdownHooks()` is on and the process is
   * stopped with a signal it can catch. A `taskkill /F` still cannot be caught,
   * but a producer-only client holds no group membership, so an abrupt exit
   * leaves nothing behind for the broker to time out.
   */
  async onModuleDestroy() {
    try {
      await this.admin?.disconnect();
    } catch {
      /* shutting down anyway */
    }
    this.admin = undefined;
    if (!this.connected) return;
    this.connected = false;
    try {
      await this.client.close();
    } catch (err) {
      this.logger.warn(`Error closing Kafka producer: ${(err as Error)?.message}`);
    }
  }

  /** True once the producer connected and until the module is destroyed. */
  get isConnected(): boolean {
    return this.connected;
  }

  /** The identity this process publishes under — `kartseek-<identity>` is its clientId. */
  get identity(): string {
    return this.service;
  }

  /**
   * A bounded, non-throwing probe for readiness checks.
   *
   * `isConnected` is the cheap pre-check; this asks the cluster to describe
   * itself, so it also catches a broker that vanished after the producer
   * connected. Bounded by `timeoutMs` because a readiness route that hangs on
   * a dead broker is worse than one that answers `down`.
   */
  async health(timeoutMs = 2000): Promise<KafkaHealth> {
    const started = Date.now();
    if (process.env.SKIP_KAFKA === 'true') {
      return { ok: false, latencyMs: 0, error: 'skipped (SKIP_KAFKA=true)' };
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const probe = (async () => {
        if (!this.admin) {
          const kafka = await this.client.createClient<Kafka>();
          const admin = kafka.admin();
          await admin.connect();
          this.admin = admin;
        }
        await this.admin.describeCluster();
      })();
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`describeCluster exceeded ${timeoutMs}ms`)),
          Math.max(1, timeoutMs),
        );
      });
      await Promise.race([probe, deadline]);
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      // A failed admin client is not reused: the next probe reconnects.
      const admin = this.admin;
      this.admin = undefined;
      void admin?.disconnect().catch(() => undefined);
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: (err as Error)?.message ?? String(err),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async connectWithRetry(attempts = 5, baseDelayMs = 1000): Promise<void> {
    for (let i = 1; i <= attempts; i++) {
      try {
        await this.client.connect();
        this.connected = true;
        this.logger.log(`✅ Kafka producer connected as kartseek-${this.service}`);
        return;
      } catch (err: any) {
        const isLast = i === attempts;
        const delay = Math.min(baseDelayMs * Math.pow(2, i - 1), 30000); // exponential backoff, max 30s
        this.logger.warn({
          message: `Kafka connection attempt ${i}/${attempts} failed`,
          error: err?.message ?? 'ECONNREFUSED',
          nextRetryIn: isLast ? null : `${delay}ms`,
          fatal: false,
        });
        if (!isLast) await new Promise((r) => setTimeout(r, delay));
      }
    }
    // After all retries failed — continue without crashing the app
    this.connected = false;
    this.logger.error('Kafka producer exhausted all retry attempts — running without Kafka.');
  }

  /**
   * Publish a domain event to a Kafka topic.
   * No-op when Kafka is unreachable (logs a warning instead of throwing).
   *
   * @param topic   Kafka topic name (e.g. 'order.created')
   * @param payload Any serializable object
   */
  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.connected) {
      this.logger.warn(`Kafka not connected — skipped publish to "${topic}"`);
      return;
    }

    // Fire-and-forget on purpose: a write path must not wait for a broker
    // round-trip, let alone kafkajs's retry ladder. But the outcome is
    // observed: "Published" used to be logged the moment emit() was called,
    // so an event the broker refused — every topic missing from the registry
    // failed its metadata lookup and was dropped after the retries — read as
    // delivered. Now the debug line follows completion and a refusal is an
    // ERROR naming the topic and the reason. Non-fatal either way: Kafka
    // errors must not crash request handlers.
    try {
      this.client
        .emit(topic, {
          key: (payload['id'] ?? Date.now()).toString(),
          value: JSON.stringify({ ...payload, _publishedAt: new Date().toISOString() }),
        })
        .subscribe({
          complete: () =>
            this.logger.debug(`Published to ${topic}: ${JSON.stringify(payload).slice(0, 120)}`),
          error: (err: unknown) =>
            this.logger.error(
              `Failed to publish to ${topic}: ${KafkaProducerService.describe(err)}`,
            ),
        });
    } catch (err) {
      this.logger.error(`Failed to publish to ${topic}: ${KafkaProducerService.describe(err)}`);
    }
  }

  /**
   * The broker's reason, with the one case an operator can act on spelled
   * out: kafkajs reports a topic the broker does not know as "This server
   * does not host this topic-partition", which reads like a partition or
   * leader fault and is not one — with auto-create off, the topic simply
   * does not exist until the registry declares it and the provisioner runs.
   */
  static describe(err: unknown): string {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
    if (/does not host this topic-partition|UNKNOWN_TOPIC_OR_PARTITION/i.test(message)) {
      return `${message} (the topic does not exist on the broker: declare it in KAFKA_TOPICS / PUBLISHED_TOPICS and run npm run kafka:topics)`;
    }
    return message;
  }

  /** Alias for publish() — matches the NestJS ClientProxy emit() API surface */
  async emit(topic: string, payload: Record<string, unknown>): Promise<void> {
    return this.publish(topic, payload);
  }
}
