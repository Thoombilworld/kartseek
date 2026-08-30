import {
  Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy,
} from '@nestjs/common';
import { Inject, Optional } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Kafka, Consumer } from 'kafkajs';

export interface KafkaEventHandler {
  topic: string;
  handler: (payload: Record<string, unknown>) => Promise<void> | void;
}

/**
 * KARTSEEK Kafka Consumer Service
 *
 * Subscribes to Kafka topics and dispatches events to registered handlers.
 * Includes:
 *  - Automatic retry with exponential backoff
 *  - Dead Letter Queue (DLQ) publishing for permanently failed messages
 *  - Graceful shutdown
 *  - SKIP_KAFKA support for local development
 *
 * Usage:
 *   @Inject() private consumer: KafkaConsumerService;
 *
 *   onModuleInit() {
 *     this.consumer.subscribe('order.created', async (data) => { ... });
 *   }
 */
@Injectable()
export class KafkaConsumerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly handlers = new Map<string, KafkaEventHandler['handler'][]>();
  private connected = false;
  private consumer?: Consumer;

  constructor(
    @Inject('KAFKA_CLIENT') @Optional() private readonly client: ClientKafka,
  ) {}

  /**
   * Start consuming AFTER every module's `onModuleInit` has run.
   *
   * The topic list is whatever callers registered through `subscribe()`, so the
   * consumer cannot start until they have all registered — `onModuleInit`
   * ordering does not guarantee that, `onApplicationBootstrap` does.
   *
   * Until this existed, `subscribe()` pushed handlers into a Map that nothing
   * ever read: `dispatch()` had no callers anywhere in the repo, and the comment
   * claiming messages arrive "through @EventPattern handlers" described handlers
   * that were never written — the gateway is a plain HTTP app and never calls
   * `connectMicroservice`. Every Kafka → WebSocket bridge in the gateway (order
   * status, delivery tracking, payments, wallet, SOS, and the grocery,
   * pharmacy, restaurant and taxi feeds) was registered and silently inert, so
   * the platform published events that no client was ever told about.
   */
  async onApplicationBootstrap() {
    if (process.env.SKIP_KAFKA === 'true') {
      this.logger.warn('Kafka consumer SKIPPED (SKIP_KAFKA=true). subscribe() will be a no-op.');
      return;
    }

    const topics = [...this.handlers.keys()];
    if (topics.length === 0) {
      this.logger.log('No topics registered — consumer not started.');
      return;
    }

    await this.startConsumer(topics);
  }

  async onModuleDestroy() {
    try {
      await this.consumer?.disconnect();
    } catch {
      /* shutting down anyway */
    }
    if (this.connected && this.client) {
      try {
        await this.client.close();
      } catch (err) {
        this.logger.warn('Error closing Kafka client', err);
      }
    }
  }

  /**
   * Own kafkajs consumer rather than `ClientKafka`.
   *
   * `ClientKafka` is Nest's request/response client; making it consume plain
   * event topics means `subscribeToResponseOf`, which subscribes to `<topic>.reply`
   * topics that do not exist. With `KAFKA_AUTO_CREATE_TOPICS_ENABLE=false` on the
   * broker, every metadata refresh for those failed and the consumer group
   * re-joined in a loop. This is the same shape `PasswordResetConsumer` in
   * notification-service settled on for the same reasons.
   */
  private async startConsumer(topics: string[]): Promise<void> {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
    const group = `${process.env.KAFKA_GROUP_ID ?? 'kartseek-consumers'}-event-bridge`;

    try {
      const kafka = new Kafka({
        clientId: `${process.env.KAFKA_CLIENT_ID ?? 'kartseek'}-event-bridge`,
        brokers,
      });

      // Subscribing to a topic the broker does not host throws and takes the
      // whole bridge down with it, so the registered list is narrowed to topics
      // that actually exist. Missing ones are named rather than swallowed: a
      // topic nothing has ever published to is usually a producer that was never
      // wired, and that is worth seeing in the log.
      const admin = kafka.admin();
      await admin.connect();
      const existing = new Set(await admin.listTopics());
      await admin.disconnect();

      const present = topics.filter((t) => existing.has(t));
      const absent = topics.filter((t) => !existing.has(t));
      if (absent.length) {
        this.logger.warn(
          `${absent.length} registered topic(s) do not exist on the broker and are not subscribed: ${absent.join(', ')}`,
        );
      }
      if (!present.length) {
        this.logger.warn('None of the registered topics exist on the broker — consumer not started.');
        return;
      }

      this.consumer = kafka.consumer({ groupId: group });
      await this.consumer.connect();
      await this.consumer.subscribe({ topics: present, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          const raw = message.value?.toString();
          if (!raw) return;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(raw);
          } catch {
            this.logger.warn(`Non-JSON message on ${topic} — dropped.`);
            return;
          }
          // dispatch() already isolates handler errors, so one bad handler
          // cannot stall the partition.
          await this.dispatch(topic, payload);
        },
      });

      this.connected = true;
      this.logger.log(`✅ Kafka consumer running — ${present.length} topic(s), group=${group}`);
    } catch (err) {
      // A broker that is down must not stop the app booting; the HTTP surface
      // is still useful without the realtime bridge.
      this.connected = false;
      this.logger.error(`Kafka consumer failed to start: ${(err as Error)?.message}`);
    }
  }

  /**
   * Subscribe to a Kafka topic with a handler function.
   * Multiple handlers can be registered for the same topic.
   */
  subscribe(topic: string, handler: KafkaEventHandler['handler']): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler);
    this.logger.log(`Registered handler for topic: ${topic}`);
  }

  /**
   * Subscribe to multiple topics at once.
   */
  subscribeAll(subscriptions: KafkaEventHandler[]): void {
    subscriptions.forEach(({ topic, handler }) => this.subscribe(topic, handler));
  }

  /**
   * Dispatch a received message to all registered handlers for the topic.
   * Called by the Kafka-WS bridge or by microservice @MessagePattern handlers.
   */
  async dispatch(topic: string, payload: Record<string, unknown>): Promise<void> {
    const topicHandlers = this.handlers.get(topic);
    if (!topicHandlers || topicHandlers.length === 0) {
      this.logger.debug(`No handlers for topic: ${topic}`);
      return;
    }

    for (const handler of topicHandlers) {
      try {
        await handler(payload);
      } catch (err: any) {
        this.logger.error(
          `Handler error for topic "${topic}": ${err?.message}`,
          err?.stack,
        );
        // Publish to DLQ
        await this.publishToDLQ(topic, payload, err);
      }
    }
  }

  private async publishToDLQ(
    originalTopic: string,
    payload: Record<string, unknown>,
    error: Error,
  ): Promise<void> {
    try {
      if (this.connected && this.client) {
        this.client.emit(`${originalTopic}.dlq`, {
          originalTopic,
          payload,
          error: { message: error.message, stack: error.stack },
          failedAt: new Date().toISOString(),
        });
        this.logger.warn(`Message sent to DLQ: ${originalTopic}.dlq`);
      }
    } catch (dlqErr) {
      this.logger.error(`Failed to publish to DLQ for ${originalTopic}`, dlqErr);
    }
  }
}
