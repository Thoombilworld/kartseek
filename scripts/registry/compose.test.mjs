import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderComposeServices,
  ADMIN_PROFILE,
  dockerfileFor,
  envFilesFor,
  healthPathFor,
  stem,
} from './compose.mjs';
import { loadRegistry, repoRoot, webEntries } from './lib.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const gateway = {
  name: 'api-gateway',
  kind: 'gateway',
  path: 'apps/api/apps/api-gateway',
  image: 'kartseek/api-gateway',
  build: { workspace: 'kartseek-api', nestProject: 'api-gateway' },
  ports: { http: 3001 },
  env: { http: 'API_GATEWAY_PORT' },
  health: { live: '/api/v1/health', ready: '/api/v1/health/ready' },
  database: { name: 'kartseek_db', schema: 'public', envPrefix: 'DB' },
  dependsOn: ['postgres', 'redis', 'kafka', 'mongodb'],
  profiles: ['admin'],
};
const search = {
  name: 'search-service',
  kind: 'core-service',
  path: 'apps/api/apps/search-service',
  image: 'kartseek/search-service',
  build: { workspace: 'kartseek-api', nestProject: 'search-service' },
  ports: { http: 3033, tcp: 4023 },
  env: { http: 'SEARCH_SERVICE_PORT', tcp: 'SEARCH_TCP_PORT' },
  health: { live: '/health', ready: '/health/ready' },
  database: null,
  dependsOn: ['redis', 'kafka', 'elasticsearch'],
  kafka: { groupId: 'search-indexer' },
};
const grocery = {
  name: 'grocery-service',
  kind: 'module-service',
  path: 'modules/grocery/backend',
  image: 'kartseek/grocery-service',
  build: { workspace: '@kartseek/grocery-backend' },
  ports: { http: 3018, tcp: 4008, grpc: 5010 },
  env: { http: 'GROCERY_SERVICE_PORT', tcp: 'GROCERY_TCP_PORT', grpc: 'GROCERY_GRPC_PORT' },
  health: { live: '/health', ready: '/health/ready' },
  database: { name: 'kartseek_grocery', schema: 'grocery', envPrefix: 'GROCERY_DB' },
  dependsOn: ['postgres', 'redis', 'kafka'],
  profiles: ['admin'],
};
const web = {
  name: 'web',
  kind: 'web-shell',
  path: 'apps/web',
  image: 'kartseek/web',
  build: { workspace: 'kartseek-web' },
  ports: { http: 3000 },
  profiles: ['admin'],
};
const zone = {
  name: 'hotel-frontend',
  kind: 'web-zone',
  path: 'modules/hotel/frontend',
  image: 'kartseek/hotel-frontend',
  build: { workspace: '@kartseek/hotel-frontend' },
  ports: { http: 3007 },
  basePath: '/hotel-booking',
};
const reg = { services: [gateway, search, grocery, web, zone] };

test('each kind builds from its own Dockerfile', () => {
  assert.equal(dockerfileFor(gateway), 'infra/docker/api-gateway.Dockerfile');
  assert.equal(
    dockerfileFor({ ...gateway, kind: 'core-service' }),
    'infra/docker/core-service.Dockerfile',
  );
  assert.equal(dockerfileFor(grocery), 'infra/docker/module-service.Dockerfile');
  assert.equal(dockerfileFor(web), 'infra/docker/nextjs.Dockerfile');
  assert.equal(dockerfileFor(zone), 'infra/docker/nextjs.Dockerfile');
});

test('services address infrastructure by container name, never localhost', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /DB_HOST: postgres/);
  assert.match(out, /REDIS_HOST: redis/);
  // kafka:29092, not 9092: 9092 is the listener the broker advertises back as
  // `localhost:9092`, which from a container means the container itself.
  assert.match(out, /KAFKA_BROKERS: kafka:29092/);
  assert.ok(!/KAFKA_BROKERS: kafka:9092/.test(out), 'the host listener is not the network one');
  assert.match(out, /MONGO_URI: mongodb:\/\/.*@mongodb:27017/);
  assert.match(out, /ELASTICSEARCH_NODE: http:\/\/.*elasticsearch:9200/);
});

test('the only host addressing is the published port and the in-container probe', () => {
  const out = renderComposeServices(reg);
  // Both exceptions are legitimate and both are asserted elsewhere: the HOST
  // side of a port mapping, where loopback is the safe default, and the
  // healthcheck, which runs inside the container it is checking. Everything
  // else naming the host would be the AUD2-067 bug this file exists to prevent.
  const rest = out
    .split('\n')
    .filter((l) => !l.includes('${APP_BIND:-127.0.0.1}') && !/wget -qO-|nc -z/.test(l))
    .join('\n');
  assert.ok(
    !/localhost|127\.0\.0\.1|host\.docker\.internal/.test(rest),
    'no host addressing outside the port publish and the healthcheck',
  );
});

test('container names, network and profiles follow the registry', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /container_name: kartseek-grocery-service/);
  assert.match(out, /name: kartseek-network/);
  assert.match(out, /profiles: \[admin, full\]/);
  assert.match(out, /profiles: \[full\]/);
  // `external: true` would apply to compose.infra.yml too once Compose merges
  // the two files, and then `npm run infra:up` could not create the network.
  assert.ok(!/external: true/.test(out), 'the network is not declared external');
});

test('healthchecks come from the registry health.live', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /http:\/\/127\.0\.0\.1:3018\/health/);
  assert.match(out, /http:\/\/127\.0\.0\.1:3001\/api\/v1\/health/);
  // A zone is mounted under its base path, so `/` on it is a 404.
  assert.equal(healthPathFor(zone), '/hotel-booking/');
  assert.equal(healthPathFor(web), '/admin/login');
  assert.match(out, /http:\/\/127\.0\.0\.1:3007\/hotel-booking\//);
});

test('infrastructure dependencies wait for health, and peers do not', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /postgres:\s*\n\s*condition: service_healthy/);
  assert.ok(
    !/grocery-service:\s*\n\s*condition:/.test(out),
    'a peer is not a compose dependency: the services retry, and a cycle would deadlock',
  );
});

test('every service points at its peers by container name', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /GROCERY_SERVICE_HOST: grocery-service/);
  assert.match(out, /SEARCH_SERVICE_HOST: search-service/);
  // The stem is the name the code already reads: svcHost('AUDIT_LOG') in
  // api-gateway.module.ts, MARKETPLACE_ZONE_ORIGIN in apps/web/next.config.mjs.
  assert.equal(stem('audit-log-service'), 'AUDIT_LOG');
  assert.equal(stem('api-gateway'), 'API_GATEWAY');
  assert.equal(stem('marketplace-frontend'), 'MARKETPLACE');
});

test('a module service connects as its own role, against the shared database', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /GROCERY_DB_USER: \$\{GROCERY_DB_USER:-grocery_user\}/);
  assert.match(out, /GROCERY_DB_PASSWORD: \$\{GROCERY_DB_PASSWORD\}/);
  assert.match(out, /GROCERY_DB_NAME: \$\{POSTGRES_DB:-kartseek_db\}/);
  // The unprefixed copy exists because databaseCredentials() reads DB_USER and
  // DB_NAME unprefixed however it was called; without it the fallback path
  // would connect as the superuser from apps/api/.env.
  assert.match(out, /DB_USER: \$\{GROCERY_DB_USER:-grocery_user\}/);
  // A core service is the platform owner.
  assert.match(out, /DB_USER: \$\{POSTGRES_USER:-postgres\}/);
  // Production defaults SSL on and this Postgres speaks plaintext.
  assert.equal((out.match(/DB_SSL: 'false'/g) ?? []).length, 3, 'every nest service, web neither');
});

test('a service with database: null gets the address but no credential', () => {
  // search-service is `database: null`: it opens no Postgres connection, so
  // handing it DB_NAME/DB_USER/DB_PASSWORD would put the superuser password in
  // a container for nothing (addendum item 6).
  const only = renderComposeServices({ services: [search] });
  assert.match(only, /DB_HOST: postgres/, 'the address still overrides apps/api/.env');
  assert.match(only, /DB_PORT: '5432'/);
  // OVERRIDDEN, not absent: omitting them hands the keys back to env_file, and
  // apps/api/.env declares DB_USER=postgres with the superuser password. The
  // first attempt at this finding only dropped them from the YAML, which left
  // the credential in the resolved container (review finding 14).
  //
  // The password is blank; the other two are not, and must not be. A Joi
  // string rejects '' unless it says `.allow('')`, which in
  // env-schema.builder.ts only DB_PASSWORD does — so blanking all three
  // crash-looped auth-service, audit-log-service and notification-service on
  // `Config validation error: DB_USER: "DB_USER" is not allowed to be empty`.
  // `unused` is fail-closed: the secret is still gone, and a DataSource that
  // ever did appear here would fail on `role "unused" does not exist` rather
  // than connect as the superuser.
  assert.match(only, /^\s+DB_NAME: 'unused'$/m);
  assert.match(only, /^\s+DB_USER: 'unused'$/m);
  assert.match(only, /^\s+DB_PASSWORD: ''$/m);
  assert.ok(!/DB_USER: \$\{/.test(only), 'no role interpolation');
  assert.ok(!/DB_PASSWORD: \$\{/.test(only), 'no password interpolation');
  assert.ok(!/DB_USER: ''/.test(only), 'an empty DB_USER is a Joi failure, not a safety measure');
  assert.ok(!/DB_NAME: ''/.test(only), 'an empty DB_NAME is a Joi failure, not a safety measure');
  // And the ones that DO own a database still get all three.
  const withDb = renderComposeServices({ services: [gateway] });
  assert.match(withDb, /DB_NAME: \$\{POSTGRES_DB:-kartseek_db\}/);
  assert.match(withDb, /DB_PASSWORD: \$\{POSTGRES_PASSWORD\}/);
});

test('the two platform secrets come from the root .env, and refuse to default', () => {
  const out = renderComposeServices(reg);
  // NODE_ENV=production arms env.validation.ts's weak-secret refusal, and
  // apps/api/.env's JWT_SECRET matches two of its five patterns. `:?` so
  // Compose names the variable instead of the gateway throwing at boot.
  assert.match(out, /JWT_SECRET: \$\{JWT_SECRET:\?[^}]*env:init\}/);
  assert.match(out, /ENCRYPTION_KEY: \$\{ENCRYPTION_KEY:\?[^}]*env:init\}/);
  // Every nest service, so a token signed by one verifies in the next.
  assert.equal((out.match(/JWT_SECRET: /g) ?? []).length, 3);
  // The console signs nothing and decrypts nothing.
  const onlyWeb = renderComposeServices({ services: [web] });
  assert.ok(!/JWT_SECRET|ENCRYPTION_KEY/.test(onlyWeb), 'not in the console image');
});

test('DEV_AUTH_BYPASS is pinned off rather than left to a second gate', () => {
  const out = renderComposeServices(reg);
  assert.equal((out.match(/DEV_AUTH_BYPASS: 'false'/g) ?? []).length, 3);
});

test('every nest service is told to bind its HTTP port on all interfaces', () => {
  // marketplace-service defaults MARKETPLACE_HTTP_HOST to 127.0.0.1. Inside a
  // container that makes the published port answer nothing while the container
  // still reports `healthy` — its HEALTHCHECK runs on the same loopback. Found
  // by `npm run stack:validate`, which could not reach 127.0.0.1:3012 at all.
  const out = renderComposeServices(reg);
  assert.match(out, /API_GATEWAY_HTTP_HOST: '0\.0\.0\.0'/);
  assert.match(out, /SEARCH_HTTP_HOST: '0\.0\.0\.0'/);
  assert.match(out, /GROCERY_HTTP_HOST: '0\.0\.0\.0'/);
  assert.equal((out.match(/_HTTP_HOST: '0\.0\.0\.0'/g) ?? []).length, 3, 'one per nest service');
  // The console is a Next server; it has no such variable to read.
  assert.ok(!/_HTTP_HOST/.test(renderComposeServices({ services: [web] })));
});

test('the real registry gives marketplace-service the variable its main.ts reads', () => {
  const out = renderComposeServices(loadRegistry());
  assert.match(out, /MARKETPLACE_HTTP_HOST: '0\.0\.0\.0'/);
});

test('env_file is the root .env plus the untracked workspace files', () => {
  assert.deepEqual(envFilesFor(gateway), [
    ['.env', true],
    ['apps/api/.env', false],
  ]);
  assert.deepEqual(envFilesFor(grocery), [
    ['.env', true],
    ['apps/api/.env', false],
    ['modules/grocery/backend/.env', false],
  ]);
  assert.deepEqual(envFilesFor(web), [], 'the console carries no datastore credential');
  assert.deepEqual(envFilesFor(zone), [], 'and neither does a zone');
  const out = renderComposeServices(reg);
  assert.match(out, /- path: modules\/grocery\/backend\/\.env\n\s*required: false/);
  assert.match(out, /- path: \.env\n\s*required: true/);
});

test('a Next image gets all three URL build args and its workspace', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /WORKSPACE_DIR: apps\/web/);
  assert.match(out, /NEXT_PUBLIC_API_URL: \$\{COMPOSE_API_URL:-http:\/\/nginx\/api\/v1\}/);
  assert.match(out, /NEXT_PUBLIC_WS_URL: \$\{COMPOSE_WS_URL:-ws:\/\/nginx\}/);
  assert.match(out, /API_URL: http:\/\/api-gateway:3001\/api\/v1/);
  // next.config.mjs rewrites /api/* to API_GATEWAY_ORIGIN, which defaults to
  // http://localhost:3001 — inside the container, the container itself.
  assert.match(out, /API_GATEWAY_ORIGIN: http:\/\/api-gateway:3001$/m);
  // The shell rewrites each vertical path to its zone container.
  assert.match(out, /HOTEL_ZONE_ORIGIN: http:\/\/hotel-frontend:3007/);
});

test('the gateway image takes no build args', () => {
  const only = renderComposeServices({ services: [gateway] });
  assert.match(only, /dockerfile: infra\/docker\/api-gateway\.Dockerfile/);
  assert.ok(!/\n\s+args:/.test(only), 'api-gateway.Dockerfile declares no ARG to receive them');
});

test('ADMIN_PROFILE is exactly the twelve admin-critical deployables', () => {
  assert.equal(ADMIN_PROFILE.length, 12);
  assert.deepEqual(ADMIN_PROFILE, [
    'api-gateway',
    'auth-service',
    'user-service',
    'admin-service',
    'audit-log-service',
    'notification-service',
    'order-service',
    'payment-service',
    'marketplace-service',
    'grocery-service',
    'taxi-service',
    'web',
  ]);
});

test('ADMIN_PROFILE and the registry name the same twelve', () => {
  const real = loadRegistry();
  const flagged = real.services
    .filter((s) => (s.profiles ?? []).includes('admin'))
    .map((s) => s.name);
  assert.deepEqual([...flagged].sort(), [...ADMIN_PROFILE].sort());
  for (const name of ADMIN_PROFILE)
    assert.ok(
      real.services.some((s) => s.name === name),
      `${name} is in ADMIN_PROFILE but not in services.yaml`,
    );
});

test('the real registry renders all 35 deployables once each', () => {
  const out = renderComposeServices(loadRegistry());
  assert.equal((out.match(/^\s{4}container_name: kartseek-/gm) ?? []).length, 35);
  assert.equal((out.match(/profiles: \[admin, full\]/g) ?? []).length, 12);
  assert.equal((out.match(/profiles: \[full\]/g) ?? []).length, 23);
});

/**
 * The precondition infra/docker/nextjs.Dockerfile states in its header, checked
 * against the config Next itself would load rather than against the source
 * text: the runtime stage copies `.next/standalone`, which Next only emits when
 * that workspace's own next.config sets `output: 'standalone'`. A Next
 * deployable that does not set it builds — the whole application, in full —
 * and then fails on the COPY, so this is worth catching in a test that runs in
 * a second rather than at the end of a 40-minute image build.
 *
 * The tracing root is checked too, and it has to be the monorepo root. Every
 * one of these workspaces imports from packages/shared-core, and the shell also
 * imports from modules/*\/frontend; with the default root (the nearest
 * lockfile's directory, resolved per file) those files are traced from outside
 * the workspace and silently left out. That failure survives the build, the
 * image starts, and the first page that needs one 500s.
 *
 * The list comes from the registry, so a zone added to services.yaml without
 * the key fails here.
 */
test('every Next deployable emits standalone output, traced from the monorepo root', async () => {
  const root = repoRoot();
  const webs = webEntries(loadRegistry());
  assert.equal(webs.length, 9, 'the console and the eight zones');
  for (const s of webs) {
    const file = path.join(root, s.path, 'next.config.mjs');
    const loaded = await import(pathToFileURL(file).href);
    // next-intl's plugin returns the config object today; a Next config may
    // also be a (phase, { defaultConfig }) function, so handle both.
    const cfg =
      typeof loaded.default === 'function'
        ? await loaded.default('phase-production-build', { defaultConfig: {} })
        : loaded.default;
    assert.equal(cfg.output, 'standalone', `${s.path} must set output: 'standalone'`);
    assert.equal(
      cfg.outputFileTracingRoot,
      root,
      `${s.path} must trace from the monorepo root, not its own directory`,
    );
    // A zone is mounted under its base path and the healthcheck probes it.
    if (s.kind === 'web-zone') assert.equal(cfg.basePath, s.basePath, `${s.path} basePath`);
  }
});
