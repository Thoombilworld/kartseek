import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { Kafka, type Consumer } from 'kafkajs';
import { KAFKA_TOPICS } from '@app/kafka';
import { NotificationService } from './notification.service';

/** What a publisher puts on `notification.email` — NotificationService's EmailPayload. */
export interface EmailEvent {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

/** What a publisher puts on `notification.sms` — NotificationService's SmsPayload. */
export interface SmsEvent {
  phone: string;
  message: string;
  templateId?: string;
  variables?: Record<string, string>;
}

/**
 * Delivers the generic `notification.email` and `notification.sms` events.
 *
 * Both topics have existed in `KAFKA_TOPICS` and been published to from across
 * the platform for as long as the gateway has, and nothing has ever read either
 * one: this service listened only for `send_push` over TCP and for the
 * password-reset topic. Every other "we emailed you" in the product therefore
 * ended at a Kafka partition. The staff sign-in code is the first event that
 * cannot quietly go missing, which is what brings this consumer into existence.
 *
 * Payloads are forwarded to `NotificationService` as published rather than
 * rebuilt, because the topics carry exactly its `EmailPayload` / `SmsPayload`
 * shapes; a translation layer here would be a second place for the field names
 * to drift apart.
 *
 * A dedicated kafkajs consumer with its **own** group id, for the reasons
 * written up on `PasswordResetConsumer`: `KafkaConsumerService.subscribe()`
 * never delivers anything, and a Nest Kafka transport turns `{cmd:'send_push'}`
 * into an invalid topic name and crashes the service on boot. Sharing the
 * password-reset consumer's group id would be worse still — two consumers in
 * one group split the partitions between them, so each topic would be delivered
 * to whichever consumer cannot handle it.
 *
 * Without a SendGrid key `sendEmail` logs instead of sending, which is the
 * expected behaviour in development.
 */
@Injectable()
export class NotificationEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationEventsConsumer.name);
  private consumer?: Consumer;

  constructor(private readonly notifications: NotificationService) {}

  async onModuleInit() {
    if (process.env.SKIP_KAFKA === 'true') {
      this.logger.warn('SKIP_KAFKA=true — email and SMS events will not be delivered.');
      return;
    }

    try {
      const kafka = new Kafka({
        clientId: 'notification-events',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      });
      this.consumer = kafka.consumer({ groupId: 'notification-service.events' });
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: [KAFKA_TOPICS.NOTIFICATION_EMAIL, KAFKA_TOPICS.NOTIFICATION_SMS],
        fromBeginning: false,
      });
      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          const raw = message.value?.toString();
          if (!raw) return;
          try {
            await this.handle(topic, JSON.parse(raw));
          } catch (err) {
            // Never rethrow: a poisoned message must not stall the partition.
            this.logger.error(`Failed to handle ${topic}: ${(err as Error).message}`);
          }
        },
      });
      this.logger.log(
        `Listening for ${KAFKA_TOPICS.NOTIFICATION_EMAIL} and ${KAFKA_TOPICS.NOTIFICATION_SMS}`,
      );
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

  async handle(topic: string, event: EmailEvent | SmsEvent) {
    if (topic === KAFKA_TOPICS.NOTIFICATION_EMAIL) {
      const email = event as EmailEvent;
      if (!email?.to || !email?.body) {
        this.logger.warn('Email event missing a recipient or a body — dropping.');
        return;
      }
      await this.notifications.sendEmail(email);
      // The subject is safe to log; the body may carry a one-time code.
      this.logger.log(`Email dispatched: "${email.subject}"`);
      return;
    }

    if (topic === KAFKA_TOPICS.NOTIFICATION_SMS) {
      const sms = event as SmsEvent;
      if (!sms?.phone || !sms?.message) {
        this.logger.warn('SMS event missing a number or a message — dropping.');
        return;
      }
      await this.notifications.sendSms(sms);
      this.logger.log('SMS dispatched.');
      return;
    }

    this.logger.warn(`Ignoring unexpected topic ${topic}.`);
  }
}
