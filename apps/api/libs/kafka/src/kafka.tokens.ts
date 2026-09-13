/**
 * Injection tokens shared by the Kafka module and its services.
 *
 * In their own file so `kafka.module.ts` and `kafka-producer.service.ts` can
 * both import them without importing each other: a circular import between
 * those two evaluates one of them with the other's exports still undefined,
 * and a parameter decorator such as `@Inject(undefined)` is not a compile
 * error — it is a provider Nest cannot resolve at boot.
 */

/** The default `ClientKafka` token, always registered by `KafkaModule.forService`. */
export const KAFKA_CLIENT = 'KAFKA_CLIENT';

/**
 * The resolved service identity (`'marketplace-service'`), provided globally so
 * anything that names a Kafka client, group or log line after the service reads
 * the same value the clients were built with.
 */
export const KAFKA_SERVICE_IDENTITY = 'KAFKA_SERVICE_IDENTITY';
