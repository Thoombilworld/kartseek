import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downArgs } from './down.mjs';
import { loadRegistry, INFRA } from '../registry/lib.mjs';

test('the command names every deployable in the registry and nothing else', () => {
  const reg = loadRegistry();
  const args = downArgs(reg);
  const names = args.slice(args.indexOf('--force') + 1);
  assert.deepEqual(
    names,
    reg.services.map((s) => s.name),
  );
  assert.equal(names.length, 35);
});

test('it never names an infrastructure service', () => {
  // The whole point: `docker compose down` would take these with it, and
  // `npm run infra:up` has to run first because it creates the network and the
  // 166 Kafka topics.
  const args = downArgs(loadRegistry());
  for (const infra of [...INFRA, 'nginx', 'kafka-ui', 'pgadmin', 'kibana', 'redis-insight'])
    assert.ok(!args.includes(infra), `${infra} belongs to infra:down, not stack:down`);
});

test('it is `rm --stop --force`, not `down`, and enables both profiles', () => {
  const args = downArgs({ services: [{ name: 'api-gateway' }] });
  assert.deepEqual(args, [
    'compose',
    '--profile',
    'admin',
    '--profile',
    'full',
    'rm',
    '--stop',
    '--force',
    'api-gateway',
  ]);
  assert.ok(!args.includes('down'), 'down is project-wide and would remove the datastores');
  assert.ok(!args.includes('--remove-orphans'), 'orphans here are the infrastructure containers');
});
