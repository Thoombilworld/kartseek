import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateShape, loadRegistry, nestEntries, webEntries } from './lib.mjs';

const nest = {
  name: 'order-service', kind: 'core-service', path: 'apps/api/apps/order-service',
  build: { workspace: 'kartseek-api', nestProject: 'order-service' }, image: 'kartseek/order-service',
  ports: { http: 3014, tcp: 4004 }, env: { http: 'ORDER_SERVICE_PORT', tcp: 'ORDER_TCP_PORT' },
  health: { live: '/health', ready: null }, database: { name: 'kartseek_db', schema: 'order', envPrefix: 'DB' },
  dependsOn: ['postgres'],
};
const zone = {
  name: 'grocery-frontend', kind: 'web-zone', path: 'modules/grocery/frontend',
  build: { workspace: '@kartseek/grocery-frontend' }, image: 'kartseek/grocery-frontend',
  ports: { http: 3003 }, basePath: '/grocery',
};
const valid = { version: 1, services: [nest, zone] };

test('a valid document has no problems', () => {
  assert.deepEqual(validateShape(valid), []);
});

test('wrong version, unknown kind and duplicate names are reported', () => {
  const doc = { version: 2, services: [nest, { ...zone, name: 'order-service', kind: 'lambda' }] };
  const problems = validateShape(doc);
  assert.ok(problems.some((p) => p.includes('version')));
  assert.ok(problems.some((p) => p.includes('kind')));
  assert.ok(problems.some((p) => p.includes('duplicate name')));
});

test('a nest entry must name an env var for every port it binds', () => {
  const bad = { ...nest, env: { http: 'ORDER_SERVICE_PORT' } };
  assert.ok(validateShape({ version: 1, services: [bad] }).some((p) => p.includes('env.tcp')));
});

test('a zone must have a basePath and a shell must not', () => {
  assert.ok(validateShape({ version: 1, services: [{ ...zone, basePath: undefined }] }).some((p) => p.includes('basePath')));
  assert.ok(validateShape({ version: 1, services: [{ ...zone, kind: 'web-shell', name: 'web' }] }).some((p) => p.includes('basePath')));
});

test('the real registry loads and splits into 26 nest and 9 web entries', () => {
  const reg = loadRegistry();
  assert.equal(nestEntries(reg).length, 26);
  assert.equal(webEntries(reg).length, 9);
});
