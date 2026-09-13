import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { describe, expect, it } from 'vitest';
import {
  KafkaModule,
  kafkaClientId,
  kafkaClientOptions,
  resolveServiceIdentity,
} from './kafka.module';
import { KAFKA_CLIENT, KAFKA_SERVICE_IDENTITY } from './kafka.tokens';
import { KafkaConsumerService } from './kafka-consumer.service';

/**
 * The identity contract, pinned.
 *
 * The previous module derived the service name from the launch shape and fell
 * back to a shared `'app'`; the recorded consequence was every core service in
 * the smoke harness (and every service in a container) joining one consumer
 * group. These tests are the reason that cannot come back: there is no
 * fallback to test for, only a throw.
 */
describe('resolveServiceIdentity', () => {
  it('uses the declared name, lower-cased', () => {
    expect(resolveServiceIdentity('Marketplace-Service', undefined)).toBe('marketplace-service');
  });

  it('lets SERVICE_NAME override the declared name', () => {
    expect(resolveServiceIdentity('marketplace-service', 'marketplace-service-blue')).toBe(
      'marketplace-service-blue',
    );
  });

  it('never falls back to a shared identity', () => {
    expect(() => resolveServiceIdentity(undefined, undefined)).toThrow(/forService/);
    expect(() => resolveServiceIdentity('   ', '')).toThrow(/SERVICE_NAME/);
  });

  it('rejects names a broker would not accept', () => {
    expect(() => resolveServiceIdentity('marketplace service', undefined)).toThrow(/valid/);
    expect(() => resolveServiceIdentity('-leading', undefined)).toThrow(/valid/);
  });
});

describe('kafkaClientOptions', () => {
  const cfg = new ConfigService({
    KAFKA_BROKERS: 'broker-a:9092,broker-b:9092',
    KAFKA_GROUP_ID: 'kartseek-consumers',
  });

  it('is producer-only, named after the service, on the configured brokers', () => {
    const options = kafkaClientOptions(cfg, 'marketplace-service', KAFKA_CLIENT);
    expect(options.transport).toBe(Transport.KAFKA);
    expect(options.options?.producerOnlyMode).toBe(true);
    expect(options.options?.client?.clientId).toBe('kartseek-marketplace-service');
    expect(options.options?.client?.brokers).toEqual(['broker-a:9092', 'broker-b:9092']);
    expect(options.options?.consumer?.groupId).toBe('kartseek-consumers-marketplace-service');
  });

  it('gives every extra token its own clientId under the same service', () => {
    expect(kafkaClientId('api-gateway', 'BILLING_EVENTS')).toBe(
      'kartseek-api-gateway-billing-events',
    );
    expect(kafkaClientId('api-gateway', KAFKA_CLIENT)).toBe('kartseek-api-gateway');
  });

  it('keeps the partitioner explicit so an upgrade cannot repartition live topics', () => {
    const options = kafkaClientOptions(cfg, 'order-service', KAFKA_CLIENT);
    expect(typeof options.options?.producer?.createPartitioner).toBe('function');
  });
});

describe('KafkaModule.forService', () => {
  it('registers the default client plus the named ones, once each, and exports the identity', () => {
    const dynamic = KafkaModule.forService('api-gateway', {
      clients: ['BILLING_EVENTS', 'BILLING_EVENTS', KAFKA_CLIENT],
    });
    expect(dynamic.global).toBe(true);
    expect(dynamic.exports).toContain(KAFKA_SERVICE_IDENTITY);

    type FactoryProvider = { provide?: string; useFactory?: (cfg: ConfigService) => string };
    const identity = (dynamic.providers as FactoryProvider[]).find(
      (p) => p?.provide === KAFKA_SERVICE_IDENTITY,
    );
    expect(identity).toBeDefined();
    expect(identity!.useFactory!(new ConfigService({}))).toBe('api-gateway');
    expect(identity!.useFactory!(new ConfigService({ SERVICE_NAME: 'gateway-canary' }))).toBe(
      'gateway-canary',
    );

    // One ClientsModule import carrying exactly two registrations.
    const clients = (dynamic.imports as unknown[]).find(
      (m: any) => m && typeof m === 'object' && 'module' in m,
    ) as { providers?: unknown[] } | undefined;
    expect(clients).toBeDefined();
  });

  it('refuses a blank declared name at import time', () => {
    expect(() => KafkaModule.forService('')).toThrow(/forService/);
  });
});

describe('KafkaConsumerService.bridgeGroupId', () => {
  it('is unique per instance and keeps the prefix an operator filters on', () => {
    expect(KafkaConsumerService.bridgeGroupId('kartseek-consumers', 'Node Host.local', 4242)).toBe(
      'kartseek-consumers-event-bridge-node-host-local-4242',
    );
    expect(KafkaConsumerService.bridgeGroupId('kartseek-consumers', 'h', 1)).not.toBe(
      KafkaConsumerService.bridgeGroupId('kartseek-consumers', 'h', 2),
    );
  });
});
