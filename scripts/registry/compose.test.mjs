import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderComposeServices,
  ADMIN_PROFILE,
  dockerfileFor,
  envFilesFor,
  healthPathFor,
  stem,
  APP_NETWORK_SUBNET,
} from './compose.mjs';
import { loadRegistry, repoRoot, webEntries } from './lib.mjs';
import fs from 'node:fs';
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
  //
  // Directives only. A comment may NAME a host address — the web branch has to
  // explain that next.config.mjs's baked-in `http://localhost:3001` is what a
  // standalone image actually uses — and a rule that forbids saying so is a
  // rule against documenting the trap.
  //
  // DDOS_TRUSTED_PROXIES is the third exception, and the same kind: loopback
  // appears there as a *membership test* for the peer that sent a request, not
  // as somewhere to send one. A container probing itself arrives from 127.0.0.1
  // and still has to be recognised.
  const rest = out
    .split('\n')
    .filter(
      (l) =>
        !l.trim().startsWith('#') &&
        !l.includes('${APP_BIND:-127.0.0.1}') &&
        !/^\s*DDOS_TRUSTED_PROXIES:/.test(l) &&
        !/wget -qO-|nc -z/.test(l),
    )
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
  // EVERY password spelling, not only the first one anybody thinks of. This
  // block blanked `DB_PASSWORD` alone while `databaseCredentials()` fell
  // through it to `DB_PASS`, which the developer's untracked apps/api/.env
  // carries and `env_file` mounts into all 26 containers — so on that machine
  // the superuser password was in every credential-free container anyway
  // (whole-branch review N2). No resolver reads `DB_PASS` any more; it is
  // blanked regardless, because a fix that depends on nobody reintroducing an
  // alias is not one.
  assert.match(only, /^\s+DB_PASS: ''$/m);
  assert.ok(!/DB_USER: \$\{/.test(only), 'no role interpolation');
  assert.ok(!/DB_PASSWORD: \$\{/.test(only), 'no password interpolation');
  assert.ok(!/DB_PASS: \$\{/.test(only), 'no alias interpolation either');
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

test('every app-tier service is told to trust the private network, by CIDR', () => {
  // Behind the containerised nginx the only peer a request has is the nginx
  // container, so `X-Forwarded-For` is the only thing that separates one client
  // from another. ws-ddos.guard.ts believed it only from a peer in
  // DDOS_TRUSTED_PROXIES, which defaulted to `127.0.0.1,::1` and was emitted by
  // nobody — so every socket through the edge shared one ban, one strike
  // counter and one MAX_CONNECTIONS_PER_IP (whole-branch review N1).
  const out = renderComposeServices(reg);
  const emitted = out.match(/DDOS_TRUSTED_PROXIES: '[^']*'/g) ?? [];
  assert.equal(emitted.length, 3, 'one per nest service, none for a Next server');
  for (const line of emitted) {
    assert.ok(line.includes(APP_NETWORK_SUBNET), `${line} does not carry the compose subnet`);
    // Loopback stays: a container probing itself still has to count.
    assert.ok(line.includes('127.0.0.1'), line);
    assert.ok(line.includes('::1'), line);
  }
  assert.ok(!/DDOS_TRUSTED_PROXIES/.test(renderComposeServices({ services: [web] })));
});

test('the emitted trust list is the subnet compose.infra.yml actually pins', () => {
  // The security decision is made against an address range, so the range has to
  // be fixed — and the two statements of it must not drift. Docker assigns a
  // range per network at creation time; without the pin, `trust the edge` names
  // a subnet nothing is on.
  const infra = fs.readFileSync(path.join(repoRoot(), 'infra/docker/compose.infra.yml'), 'utf8');
  const m = infra.match(/^\s*-\s*subnet:\s*(\S+)\s*$/m);
  assert.ok(m, 'compose.infra.yml no longer pins networks.default.ipam.config.subnet');
  assert.equal(m[1], APP_NETWORK_SUBNET, 'the renderer and the network disagree');
  // And it is a CIDR, not a bare address: a /32 would trust one container and
  // silently stop working the moment Docker re-addressed it.
  assert.match(APP_NETWORK_SUBNET, /^\d+\.\d+\.\d+\.\d+\/(?:[89]|1\d|2[0-4])$/);
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

/**
 * Splits the rendered file into `service name -> its block`, so a per-service
 * assertion cannot be satisfied by some OTHER service's line further down.
 */
function serviceBlocks(out) {
  const blocks = new Map();
  let name = null;
  let lines = [];
  for (const line of out.split('\n')) {
    const m = /^ {2}([a-z][a-z0-9-]*):$/.exec(line);
    if (m) {
      if (name) blocks.set(name, lines.join('\n'));
      [name, lines] = [m[1], []];
    } else if (name) lines.push(line);
  }
  if (name) blocks.set(name, lines.join('\n'));
  return blocks;
}

test('every Next deployable gets all three URL build args, not just the console', () => {
  const real = loadRegistry();
  const blocks = serviceBlocks(renderComposeServices(real));
  const webs = webEntries(real);
  assert.equal(webs.length, 9);
  for (const s of webs) {
    const block = blocks.get(s.name);
    assert.ok(block, `${s.name} is not in the rendered file`);
    // All three, every time. api-base.ts falls back from the first to the
    // second at run time, but the BUILD evaluates that module while collecting
    // page data and NODE_ENV=production makes a missing one a thrown error —
    // reported against a route ("Failed to collect configuration for
    // /api/loyalty"), not against the variable. A zone that inherited only two
    // would fail that way after building the whole application.
    for (const arg of ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL', 'API_URL']) {
      assert.match(block, new RegExp(`^\\s+${arg}: \\S`, 'm'), `${s.name} is missing ${arg}`);
    }
    // The browser-facing pair is overridable, because through nginx from a HOST
    // browser the origin is http://localhost/… and not http://nginx/… .
    assert.match(block, /NEXT_PUBLIC_API_URL: \$\{COMPOSE_API_URL:-http:\/\/nginx\/api\/v1\}/);
    assert.match(block, /NEXT_PUBLIC_WS_URL: \$\{COMPOSE_WS_URL:-ws:\/\/nginx\}/);
    // The server-side one is not: a Next server talks to the gateway container
    // directly, never back out through the edge.
    assert.match(block, /API_URL: http:\/\/api-gateway:3001\/api\/v1/);
    assert.match(block, new RegExp(`HEALTH_PATH: ${healthPathFor(s)}$`, 'm'));
  }
});

test('the nginx main config is selected by NGINX_CONF, defaulting to the host one', () => {
  const infra = fs.readFileSync(path.join(repoRoot(), 'infra/docker/compose.infra.yml'), 'utf8');
  // The default is the host-process config, so `npm run dev` + `npm run
  // infra:up` behave exactly as before this existed.
  assert.match(infra, /- \.\.\/nginx\/\$\{NGINX_CONF:-nginx\.conf\}:\/etc\/nginx\/nginx\.conf:ro/);
  assert.ok(
    !/- \.\.\/nginx\/nginx\.conf:\/etc\/nginx/.test(infra),
    'the fixed mount is what the selector replaces',
  );
});

test('nginx.compose.conf routes the whole app tier by compose service name', () => {
  const real = loadRegistry();
  // Directives only. The file's header explains what it does NOT do by naming
  // `host.docker.internal` and the conf.d include, so asserting their absence
  // over the raw text would fail on the explanation rather than on a route.
  const conf = fs
    .readFileSync(path.join(repoRoot(), 'infra/nginx/nginx.compose.conf'), 'utf8')
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');
  const gw = real.services.find((s) => s.kind === 'gateway');
  const shell = real.services.find((s) => s.kind === 'web-shell');
  assert.match(conf, new RegExp(`"${gw.name}:${gw.ports.http}"`), 'the gateway, by service name');
  assert.match(conf, new RegExp(`"${shell.name}:${shell.ports.http}"`), 'the console');
  for (const z of real.services.filter((s) => s.kind === 'web-zone')) {
    assert.match(conf, new RegExp(`"${z.name}:${z.ports.http}"`), `${z.name} upstream`);
    // Two locations per zone, the same pair the shell's rewrites use: the bare
    // base path, and everything under it (the zone's own /_next/* assets
    // included — it emits them under its assetPrefix).
    assert.match(conf, new RegExp(`location = ${z.basePath}\\s`), `${z.basePath} exact`);
    assert.match(conf, new RegExp(`location\\s+${z.basePath}/\\s`), `${z.basePath}/ prefix`);
  }
  // The routes the host config serves, served here too.
  for (const route of ['/api/', '/socket.io/', '/docs', '/graphql', '/nginx-health']) {
    assert.match(conf, new RegExp(`location[^\\n]*${route}`), route);
  }
  // The two things that would put the developer's own fleet back in the path.
  assert.ok(!/host\.docker\.internal/.test(conf), 'no host upstream in the container config');
  assert.ok(
    !/include\s+\/etc\/nginx\/conf\.d/.test(conf),
    "conf.d/default.conf is the host config's server blocks — including it would 301 port 80 to https and proxy to host.docker.internal",
  );
  // A static `upstream` block is resolved once at startup and nginx EXITS when
  // a name does not resolve; the `admin` profile has no zone containers, so the
  // whole edge would be down whenever the smaller profile is up.
  assert.ok(!/^\s*upstream\s/m.test(conf), 'upstreams are per-request variables, not blocks');
  assert.match(conf, /resolver\s+127\.0\.0\.11/, 'which needs Docker’s embedded DNS');
});

test('the host nginx config still fronts the dev fleet through host.docker.internal', () => {
  const host = fs.readFileSync(path.join(repoRoot(), 'infra/nginx/nginx.conf'), 'utf8');
  assert.match(host, /server host\.docker\.internal:3001/);
  assert.match(host, /server host\.docker\.internal:3000/);
  assert.match(host, /include \/etc\/nginx\/conf\.d\/\*\.conf/);
});

/**
 * Every `location { … }` in an nginx file, as `{ header, body }`, with comment
 * lines dropped. Brace-counted rather than regex-matched so a one-line location
 * (`location = /taxi { proxy_pass …; }`) and a nested block are both handled.
 */
function locationBlocks(conf) {
  const lines = conf.split('\n').filter((l) => !l.trim().startsWith('#'));
  const blocks = [];
  let current = null;
  let depth = 0;
  for (const line of lines) {
    if (!current && /^\s*location\s/.test(line)) {
      current = { header: line.trim(), body: [] };
      depth = 0;
    }
    if (!current) continue;
    current.body.push(line);
    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    if (depth <= 0 && current.body.length && /\}/.test(line)) {
      blocks.push({ header: current.header, body: current.body.join('\n') });
      current = null;
    }
  }
  return blocks;
}

/**
 * nginx inherits `proxy_set_header` from the enclosing level ONLY while the
 * current level declares none of its own: it replaces, it does not merge, and
 * there is no "inherit and add". So a location that sets `Upgrade` for a
 * WebSocket and nothing else silently drops all seven server-level headers.
 *
 * That is a live defect, not a style point. ws-ddos.guard.ts identifies a socket
 * by `handshake.headers['x-forwarded-for']` and falls back to the peer address
 * — which through a proxy is the proxy — so every client behind the edge lands
 * in one bucket: one MAX_CONNECTIONS_PER_IP for the whole platform, and one
 * strike banning all of them. It cost both nginx configs their forwarded
 * headers on /socket.io/ (and the host config's `/` as well), and `nginx -t`
 * does not warn: the file is perfectly valid.
 *
 * NECESSARY, NOT SUFFICIENT — and this comment used to claim otherwise.
 * Sending the header is half of it; the guard has to believe it. It matched
 * `DDOS_TRUSTED_PROXIES` as exact strings against a default of `127.0.0.1,::1`,
 * and the nginx container's address on kartseek-network is neither — so the
 * header arrived and was thrown away, and the single bucket above survived the
 * fix that was supposed to remove it (whole-branch review N1). The other half
 * is `libs/security/src/trusted-proxies.util.ts` (CIDR membership) plus the
 * `DDOS_TRUSTED_PROXIES` this renderer now emits from the pinned subnet.
 */
test('a location that sets any proxy header re-sends the forwarding set', () => {
  const required = ['X-Forwarded-For', 'X-Real-IP', 'Host'];
  for (const rel of [
    'infra/nginx/nginx.conf',
    'infra/nginx/nginx.compose.conf',
    'infra/nginx/conf.d/default.conf',
  ]) {
    const conf = fs.readFileSync(path.join(repoRoot(), rel), 'utf8');
    const declaring = locationBlocks(conf).filter((b) => /proxy_set_header/.test(b.body));
    for (const block of declaring) {
      for (const header of required) {
        assert.match(
          block.body,
          new RegExp(`proxy_set_header\\s+${header}\\s`, 'i'),
          `${rel} — \`${block.header}\` declares a proxy_set_header of its own, so it inherits ` +
            `NONE of the server-level ones. Repeat all seven inside it; ${header} is missing.`,
        );
      }
    }
  }
  // The parser has to find something, or the assertions above are vacuous.
  const compose = fs.readFileSync(path.join(repoRoot(), 'infra/nginx/nginx.compose.conf'), 'utf8');
  const blocks = locationBlocks(compose);
  assert.equal(blocks.length, 25, 'every location in the compose config is parsed');
  assert.equal(
    blocks.filter((b) => /proxy_set_header/.test(b.body)).length,
    1,
    'only /socket.io/ needs its own headers there',
  );
});
