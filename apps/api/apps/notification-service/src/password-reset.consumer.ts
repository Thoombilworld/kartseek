import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { Kafka, type Consumer } from 'kafkajs';
import { KAFKA_TOPICS } from '@app/kafka';
import { NotificationService } from './notification.service';

/** What the gateway publishes when a customer asks to reset their password. */
export interface PasswordResetRequestedEvent {
  userId: string;
  email: string;
  resetUrl: string;
  expiresInSeconds?: number;
}

/**
 * Delivers the password-reset link.
 *
 * The gateway mints the single-use token and publishes it rather than sending the
 * mail itself, so a slow or unavailable mail provider can never make
 * `/auth/forgot-password` hang. Nothing consumed that event until now, which left
 * password recovery working right up to the point of actually reaching the
 * customer.
 *
 * Delivery falls back to log-only when SendGrid is unconfigured — see
 * `NotificationService.sendEmail`.
 *
 * This owns a dedicated kafkajs consumer rather than using a Nest Kafka transport
 * or `KafkaConsumerService`, for two reasons found the hard way:
 *
 *  * `KafkaConsumerService.subscribe()` never delivers anything — its
 *    `registerTopicListener` only calls `subscribeToResponseOf` and logs, so a
 *    handler registered through it is simply never invoked.
 *  * Connecting a Nest Kafka transport crashes this service on boot: ServerKafka
 *    turns every pattern in the app into a topic, and the existing
 *    `@MessagePattern({ cmd: 'send_push' })` becomes `{"cmd":"send_push"}`, which
 *    Kafka rejects as an invalid topic name.
 */
@Injectable()
export class PasswordResetConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PasswordResetConsumer.name);
  private consumer?: Consumer;

  constructor(private readonly notifications: NotificationService) {}

  async onModuleInit() {
    if (process.env.SKIP_KAFKA === 'true') {
      this.logger.warn('SKIP_KAFKA=true — password reset emails will not be delivered.');
      return;
    }

    try {
      const kafka = new Kafka({
        clientId: 'notification-password-reset',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      });
      this.consumer = kafka.consumer({ groupId: 'notification-password-reset' });
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: KAFKA_TOPICS.PASSWORD_RESET_REQUESTED,
        fromBeginning: false,
      });
      await this.consumer.run({
        eachMessage: async ({ message }) => {
          const raw = message.value?.toString();
          if (!raw) return;
          try {
            await this.handle(JSON.parse(raw) as PasswordResetRequestedEvent);
          } catch (err) {
            // Never rethrow: a poisoned message must not stall the partition.
            this.logger.error(`Failed to handle reset event: ${(err as Error).message}`);
          }
        },
      });
      this.logger.log(`Listening for ${KAFKA_TOPICS.PASSWORD_RESET_REQUESTED}`);
    } catch (err) {
      // A broker that is down must not stop the rest of the service booting.
      this.logger.error(`Kafka consumer failed to start: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer?.disconnect();
    } catch {
      /* shutting down anyway */
    }
  }

  async handle(event: PasswordResetRequestedEvent) {
    if (!event?.email || !event?.resetUrl) {
      this.logger.warn('Password reset event missing email or resetUrl — dropping.');
      return;
    }

    const minutes = Math.max(1, Math.round((event.expiresInSeconds ?? 1800) / 60));

    // The link is a bearer credential: it is never logged here, and the copy tells
    // the customer what to do if they did not ask for it.
    const result = await this.notifications.sendEmail({
      to: event.email,
      subject: 'Reset your KARTSEEK password',
      body: [
        'Hello,',
        '',
        'We received a request to reset the password for your KARTSEEK account.',
        `Use the link below within ${minutes} minutes — it can only be used once:`,
        '',
        event.resetUrl,
        '',
        "If you didn't request this, you can safely ignore this email. Your password",
        'will stay as it is.',
        '',
        '— The KARTSEEK team',
      ].join('\n'),
    });

    // "Dispatched" only when it was. Without a mail provider the message is
    // logged and nothing reaches the customer, which in production is an
    // outage of the reset flow, not a success.
    if (result?.status === 'SENT') {
      this.logger.log(`Password reset email dispatched for user ${event.userId}`);
    } else {
      this.logger.warn(
        `Password reset email NOT delivered for user ${event.userId}: provider=${result?.provider ?? 'none'} status=${result?.status ?? 'unknown'}${result?.error ? ` (${result.error})` : ''}`,
      );
    }
  }
}
