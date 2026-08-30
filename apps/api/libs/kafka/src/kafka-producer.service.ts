import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);
  private connected = false;

  constructor(@Inject('KAFKA_CLIENT') private readonly client: ClientKafka) {}

  async onModuleInit() {
    // Skip Kafka connection entirely when SKIP_KAFKA=true (local dev without Kafka)
    if (process.env.SKIP_KAFKA === 'true') {
      this.logger.warn('Kafka connection SKIPPED (SKIP_KAFKA=true). publish() will be a no-op.');
      return;
    }

    await this.connectWithRetry();
  }

  private async connectWithRetry(attempts = 5, baseDelayMs = 1000): Promise<void> {
    for (let i = 1; i <= attempts; i++) {
      try {
        await this.client.connect();
        this.connected = true;
        this.logger.log('✅ Kafka producer connected');
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

    try {
      this.client.emit(topic, {
        key: (payload['id'] ?? Date.now()).toString(),
        value: JSON.stringify({ ...payload, _publishedAt: new Date().toISOString() }),
      });
      this.logger.debug(`Published to ${topic}: ${JSON.stringify(payload).slice(0, 120)}`);
    } catch (err) {
      this.logger.error(`Failed to publish to ${topic}`, err);
      // Non-fatal — Kafka errors should not crash request handlers
    }
  }

  /** Alias for publish() — matches the NestJS ClientProxy emit() API surface */
  async emit(topic: string, payload: Record<string, unknown>): Promise<void> {
    return this.publish(topic, payload);
  }
}
