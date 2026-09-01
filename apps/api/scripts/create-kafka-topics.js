#!/usr/bin/env node
/**
 * Provision every Kafka topic the platform publishes to.
 *
 * The broker runs with `KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'`, so a topic
 * that was never created does not spring into existence on first publish — the
 * send fails with "This server does not host this topic-partition". Nothing in
 * the repo created them, so the broker held only `__consumer_offsets`: every
 * domain event the platform emits (orders, payments, wallet, KYC, notifications)
 * was being dropped at the broker whenever Kafka was enabled.
 *
 * Idempotent: existing topics are left alone, so this is safe to re-run and safe
 * to wire into service startup or CI.
 *
 *   node apps/api/scripts/create-kafka-topics.js
 *   KAFKA_BROKERS=host:9092 PARTITIONS=3 REPLICATION=1 node .../create-kafka-topics.js
 */
const path = require('path');
const { Kafka } = require(path.join(__dirname, '../../../node_modules/kafkajs'));

const BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const PARTITIONS = Number(process.env.PARTITIONS ?? 1);
const REPLICATION = Number(process.env.REPLICATION ?? 1);

/** Read the topic names straight from the constants file — one source of truth. */
function declaredTopics() {
  const fs = require('fs');
  const src = fs.readFileSync(
    path.join(__dirname, '../libs/kafka/src/kafka-topics.constants.ts'),
    'utf8',
  );
  const names = new Set();
  for (const m of src.matchAll(/:\s*'([a-z0-9][a-z0-9._-]*)'/g)) names.add(m[1]);
  return [...names].sort();
}

(async () => {
  const topics = declaredTopics();
  if (topics.length === 0) {
    console.error('No topics found in kafka-topics.constants.ts — refusing to continue.');
    process.exit(1);
  }

  // Retry hard. This runs straight after `docker compose up -d`, when the
  // broker is usually still electing a controller — the default 5 retries give
  // up well before Kafka is ready, and a provisioner that quietly fails is what
  // leaves consumers crash-looping on a missing topic.
  const kafka = new Kafka({
    clientId: 'kartseek-topic-provisioner',
    brokers: BROKERS,
    retry: { retries: 12, initialRetryTime: 1000, maxRetryTime: 8000 },
    logLevel: 1, // ERROR — connection retries are expected here, not news
  });
  const admin = kafka.admin();
  await admin.connect();

  const existing = new Set(await admin.listTopics());
  const missing = topics.filter((t) => !existing.has(t));

  if (missing.length === 0) {
    console.log(`All ${topics.length} topics already exist.`);
  } else {
    await admin.createTopics({
      waitForLeaders: true,
      topics: missing.map((topic) => ({
        topic,
        numPartitions: PARTITIONS,
        replicationFactor: REPLICATION,
      })),
    });
    console.log(`Created ${missing.length} topic(s); ${topics.length - missing.length} already existed.`);
  }

  const after = new Set(await admin.listTopics());
  const stillMissing = topics.filter((t) => !after.has(t));
  await admin.disconnect();

  if (stillMissing.length) {
    console.error(`Still missing after creation: ${stillMissing.join(', ')}`);
    process.exit(1);
  }
  console.log(`Verified ${topics.length} topics present on ${BROKERS.join(',')}.`);
})().catch((err) => {
  console.error('Topic provisioning failed:', err.message);
  process.exit(1);
});
