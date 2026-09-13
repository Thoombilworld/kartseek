import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boardVerdict,
  classifyLogLine,
  composeVersionAtLeast,
  driftCensus,
  expectedBoardKeys,
  expectedRole,
  imageVerdicts,
  livenessBody,
  missingEnvKeys,
  parseArgs,
  publishedPorts,
  readinessBody,
  redisConfigVerdict,
  requiredComposeVars,
  sameProcess,
  summarise,
  withTeardown,
} from './validate.mjs';

// ── classifyLogLine ─────────────────────────────────────────────────────────

test('classifyLogLine catches the boot failures that matter', () => {
  assert.equal(
    classifyLogLine('[Nest] ERROR [ExceptionHandler] UnknownDependenciesException'),
    'fatal',
  );
  assert.equal(classifyLogLine('ERROR [TypeOrmModule] Unable to connect to the database'), 'error');
  assert.equal(classifyLogLine('QueryFailedError: relation "user.users" does not exist'), 'error');
  // The words that are noise, not faults: a handled 404 and the throttler's own log line.
  assert.equal(classifyLogLine('GET /api/v1/does-not-exist 404'), null);
  assert.equal(classifyLogLine('LOG [RouterExplorer] Mapped {/health, GET} route'), null);
});

test('classifyLogLine catches the container-specific faults IN6 left behind', () => {
  // A Joi failure: the env_file trio did not carry a platform variable.
  assert.equal(
    classifyLogLine('Error: Config validation error: "JWT_SECRET" is required'),
    'fatal',
  );
  assert.equal(
    classifyLogLine('Error: listen EADDRINUSE: address already in use :::3001'),
    'fatal',
  );
  assert.equal(
    classifyLogLine('error: password authentication failed for user "grocery_user"'),
    'fatal',
  );
  // Host addressing leaked into an image: the 9092 listener advertises localhost.
  assert.equal(
    classifyLogLine('KafkaJSConnectionError: Connection error: connect to localhost:9092'),
    'fatal',
  );
  assert.equal(classifyLogLine('connect ECONNREFUSED 127.0.0.1:5432'), 'fatal');
  // A module role missing a grant, and schema drift.
  assert.equal(
    classifyLogLine('QueryFailedError: permission denied for table grocery_stores'),
    'error',
  );
  assert.equal(classifyLogLine('error: column "mrp" does not exist'), 'error');
  assert.equal(classifyLogLine('RedisUnavailableError: no connection to redis'), 'error');
});

test('classifyLogLine reads TypeORM’s unquoted identifier too', () => {
  // Postgres quotes it, TypeORM does not, and the unquoted spelling was
  // previously caught only incidentally by \bERROR\b.
  assert.equal(classifyLogLine('column Product.mrp does not exist'), 'error');
  assert.equal(classifyLogLine('relation marketplace.sellers does not exist'), 'error');
});

test('classifyLogLine does not call a BIND variable host addressing', () => {
  // IN6's hand-off: APP_BIND/DB_BIND/NGINX_BIND reach all 26 containers and
  // their values are loopback ON PURPOSE — they name the host side of a port
  // publish. A container echoing its own environment must not read as a fault.
  assert.equal(classifyLogLine('APP_BIND=127.0.0.1 DB_BIND=127.0.0.1 KAFKA=kafka:29092'), null);
  assert.equal(classifyLogLine('[Bootstrap] NGINX_BIND=127.0.0.1:9092 published'), null);
  // …but a real bootstrap against the host listener still is one.
  assert.equal(
    classifyLogLine('KafkaJSConnectionError: connect to localhost:9092 refused'),
    'fatal',
  );
});

test('classifyLogLine does not cry wolf over the lines every healthy boot prints', () => {
  for (const line of [
    'LOG [InstanceLoader] TypeOrmModule dependencies initialized',
    'LOG [NestFactory] Starting Nest application...',
    'LOG [Bootstrap] API Gateway running on: http://localhost:3001/api/v1',
    'LOG [NestApplication] Nest application successfully started',
    'LOG [KafkaProducer] Kafka producer connected to kafka:29092',
    '🥦 Grocery Service — HTTP :3018 | gRPC :5010 | TCP :4008',
    'GET /api/v1/admin/marketplace/sellers?country=QA 403',
  ])
    assert.equal(classifyLogLine(line), null, line);
});

// ── summarise ───────────────────────────────────────────────────────────────

test('summarise reports the first failure and an exit code', () => {
  assert.equal(
    summarise([
      { name: 'a', ok: true },
      { name: 'b', ok: true },
    ]).code,
    0,
  );
  const bad = summarise([
    { name: 'a', ok: true },
    { name: 'b', ok: false, detail: 'boom' },
  ]);
  assert.equal(bad.code, 1);
  assert.match(bad.report, /b .*boom/);
});

test('a skipped check is neither a pass nor a failure, and must carry its reason', () => {
  const s = summarise([
    { name: 'a', ok: true },
    { name: 'edge proxy', ok: false, skipped: true, detail: 'nginx upstreams the host (IN11)' },
  ]);
  assert.equal(s.code, 0, 'a skipped check does not fail the run');
  assert.equal(s.skipped, 1);
  assert.equal(s.passed, 1);
  assert.match(s.report, /~ edge proxy.*nginx upstreams the host/);
  // A silent pass is what this exists to prevent: the reason is in the report.
  assert.ok(!/✓ edge proxy/.test(s.report));
});

// ── argument parsing ────────────────────────────────────────────────────────

test('parseArgs takes the profile either way round, and every flag', () => {
  assert.deepEqual(parseArgs([]), {
    profile: 'admin',
    skipBuild: false,
    keep: false,
    json: false,
  });
  assert.equal(parseArgs(['--profile', 'full']).profile, 'full');
  assert.equal(parseArgs(['--profile=full']).profile, 'full');
  assert.equal(parseArgs(['--skip-build']).skipBuild, true);
  assert.equal(parseArgs(['--keep']).keep, true);
  assert.equal(parseArgs(['--json']).json, true);
});

test('parseArgs refuses a profile it cannot honour rather than falling back to admin', () => {
  // `--profile` with no value used to mean "admin", which is a flag that does
  // the opposite of what it says: a typo would silently validate twelve
  // containers and report on thirty-five.
  for (const argv of [['--profile'], ['--profile', 'everything'], ['--profile=']])
    assert.throws(() => parseArgs(argv), /profile/i, JSON.stringify(argv));
});

// ── the Compose floor ───────────────────────────────────────────────────────

test('composeVersionAtLeast compares numerically, not as text', () => {
  // `env_file: [{ path, required }]` is rejected by 2.20-2.23 at `config` time.
  assert.equal(composeVersionAtLeast('Docker Compose version v2.24.0', [2, 24]), true);
  assert.equal(composeVersionAtLeast('Docker Compose version v2.23.3', [2, 24]), false);
  assert.equal(composeVersionAtLeast('Docker Compose version v2.9.0', [2, 24]), false);
  // The trap a string compare falls into: '5.5.0' < '2.24' lexically for the
  // minor, and v5 is this machine's.
  assert.equal(composeVersionAtLeast('Docker Compose version v5.5.0', [2, 24]), true);
  assert.equal(composeVersionAtLeast('Docker Compose version v10.0.1', [2, 24]), true);
  // Unparseable is not evidence of a new enough Compose.
  assert.equal(composeVersionAtLeast('docker: command not found', [2, 24]), false);
});

// ── the root .env contract, read off the compose files themselves ───────────

test('requiredComposeVars takes the keys that have no default, and only those', () => {
  const yaml = [
    'image: kartseek/web:${KARTSEEK_TAG:-dev}',
    'REDIS_PASSWORD: ${REDIS_PASSWORD}',
    'JWT_SECRET: ${JWT_SECRET:?set JWT_SECRET in the root .env — run npm run env:init}',
    "ports: - '${APP_BIND:-127.0.0.1}:3001:3001'",
    'DB_NAME: ${POSTGRES_DB:-kartseek_db}',
    'MONGO_URI: mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD}@mongodb:27017/x',
  ].join('\n');
  assert.deepEqual(requiredComposeVars(yaml), [
    'JWT_SECRET',
    'MONGO_ROOT_PASSWORD',
    'REDIS_PASSWORD',
  ]);
});

test('requiredComposeVars does not read the comments that describe the rule', () => {
  // Both real compose files carry these lines. Taken literally they demand a
  // variable called VAR, and the validator would then tell a developer with a
  // complete .env to run env:init for a key that does not exist.
  const yaml = [
    '# every credential below is a REQUIRED variable — `${VAR:?…}`,',
    '# never `${VAR:-a_default}`. Compose refuses to start.',
    '  # the datastore ports below publish on ${DB_BIND}, which defaults to loopback',
    'REDIS_PASSWORD: ${REDIS_PASSWORD}',
  ].join('\n');
  assert.deepEqual(requiredComposeVars(yaml), ['REDIS_PASSWORD']);
});

test('missingEnvKeys treats an empty value as missing, because ${VAR:?} does', () => {
  const env = { JWT_SECRET: 'abc', REDIS_PASSWORD: '', POSTGRES_PASSWORD: '   ' };
  assert.deepEqual(
    missingEnvKeys(['JWT_SECRET', 'REDIS_PASSWORD', 'POSTGRES_PASSWORD', 'X'], env),
    ['REDIS_PASSWORD', 'POSTGRES_PASSWORD', 'X'],
  );
});

// ── what a service's readiness board has to say ─────────────────────────────

const grocery = {
  name: 'grocery-service',
  kind: 'module-service',
  database: { name: 'kartseek_db', schema: 'grocery', envPrefix: 'GROCERY_DB' },
  dependsOn: ['postgres', 'redis', 'kafka'],
};
const gateway = {
  name: 'api-gateway',
  kind: 'gateway',
  database: { name: 'kartseek_db', schema: 'public', envPrefix: 'DB' },
  dependsOn: ['postgres', 'redis', 'kafka', 'mongodb'],
};
const auth = { name: 'auth-service', kind: 'core-service', database: null, dependsOn: ['redis'] };

test('expectedBoardKeys comes from the registry, and the gateway spells Postgres its own way', () => {
  assert.deepEqual(expectedBoardKeys(grocery), ['database', 'redis', 'kafka']);
  assert.deepEqual(expectedBoardKeys(gateway), ['postgresql', 'redis', 'kafka', 'mongodb']);
  // No database in the registry means no database check is owed — not that one
  // is missing.
  assert.deepEqual(expectedBoardKeys(auth), ['redis']);
});

test('boardVerdict accepts both wire shapes and fails a dependency that is not up', () => {
  // A module service answers anonymously: one word per dependency.
  const good = boardVerdict(grocery, { status: 'ready', checks: { database: 'up', redis: 'up' } });
  assert.equal(good.ok, true);
  // Kafka is declared in the registry and this board does not check it — said
  // out loud rather than counted as a pass.
  assert.deepEqual(good.unchecked, ['kafka']);

  const down = boardVerdict(grocery, { status: 'down', checks: { database: 'down', redis: 'up' } });
  assert.equal(down.ok, false);
  assert.match(down.detail, /database=down/);

  // The gateway with a staff token answers with the full objects.
  const staff = boardVerdict(gateway, {
    status: 'ready',
    checks: {
      postgresql: { status: 'up', detail: 'SELECT 1 on kartseek_db as postgres' },
      redis: { status: 'up', emulated: false },
      kafka: { status: 'up' },
      mongodb: { status: 'up' },
      'marketplace-grpc': { status: 'up' },
    },
  });
  assert.equal(staff.ok, true);
  assert.deepEqual(staff.unchecked, []);
});

test('readinessBody finds the board whether or not an interceptor wrapped it', () => {
  // The gateway runs a global response interceptor and the other 25 do not, so
  // the same route answers in two shapes. Reading `json.checks` alone reported
  // "no readiness board" for the gateway over a stack that was entirely fine.
  const board = { status: 'ready', checks: { redis: 'up' } };
  assert.deepEqual(readinessBody(board), board);
  assert.deepEqual(readinessBody({ success: true, data: board, timestamp: 'x' }), board);
  assert.equal(readinessBody({ success: true, data: { total: 0 } }), null);
  assert.equal(readinessBody(null), null);
  assert.equal(readinessBody('<!doctype html>'), null);
});

test('boardVerdict unwraps the envelope before judging the gateway', () => {
  const v = boardVerdict(gateway, {
    success: true,
    data: {
      status: 'ready',
      checks: {
        postgresql: { status: 'up', detail: 'SELECT 1 on kartseek_db as postgres' },
        redis: { status: 'up' },
        kafka: { status: 'up' },
        mongodb: { status: 'up' },
      },
    },
  });
  assert.equal(v.ok, true);
  assert.deepEqual(v.unchecked, []);
});

test('boardVerdict refuses a board that never arrived', () => {
  const none = boardVerdict(grocery, null);
  assert.equal(none.ok, false);
  assert.match(none.detail, /no readiness board/i);
});

test('boardVerdict fails an emulated Redis even though it answers up', () => {
  // `degraded` is the honest verdict, but the emulator has reported `up` before
  // now — the flag is the thing that cannot be faked by a PONG.
  const v = boardVerdict(gateway, {
    status: 'ready',
    checks: {
      postgresql: { status: 'up' },
      redis: { status: 'up', emulated: true },
      kafka: { status: 'up' },
      mongodb: { status: 'up' },
    },
  });
  assert.equal(v.ok, false);
  assert.match(v.detail, /emulator/i);
});

// ── which role a service is supposed to be connecting as ────────────────────

test('expectedRole is the module role for a module and the platform owner otherwise', () => {
  const env = { POSTGRES_USER: 'postgres', GROCERY_DB_USER: 'grocery_user' };
  assert.equal(expectedRole(grocery, env), 'grocery_user');
  assert.equal(expectedRole(gateway, env), 'postgres');
  assert.equal(expectedRole(auth, env), null, 'no database, no connection to attribute');
  // The root .env is the authority; the convention is only the fallback.
  assert.equal(expectedRole(grocery, {}), 'grocery_user');
  assert.equal(expectedRole(gateway, {}), 'postgres');
});

// ── the drift census line ───────────────────────────────────────────────────

// ── teardown runs whatever happens ──────────────────────────────────────────

test('withTeardown removes the application tier on every path, including a throw', async () => {
  const calls = [];
  const teardown = () => {
    calls.push('down');
    return { ok: true, detail: '18 left up' };
  };

  const green = await withTeardown({ phases: async () => 0, teardown });
  assert.equal(green.code, 0);
  assert.equal(green.teardown.ran, true);

  const red = await withTeardown({ phases: async () => 1, teardown });
  assert.equal(red.code, 1);
  assert.equal(red.teardown.ran, true);

  // The finding: `up` throws, and the twelve containers used to stay running.
  const boom = new Error('docker inspect hung');
  const thrown = await withTeardown({
    phases: async () => {
      throw boom;
    },
    teardown,
  });
  assert.equal(thrown.code, 2, 'a thrown run is a setup failure');
  assert.equal(thrown.error, boom);
  assert.equal(thrown.teardown.ran, true, 'and it is still torn down');

  assert.deepEqual(calls, ['down', 'down', 'down']);
});

test('withTeardown reports a teardown failure but never masks the run’s verdict', async () => {
  const failing = () => {
    throw new Error('no such container');
  };
  // A green run whose teardown failed is not green — containers were left behind.
  const afterPass = await withTeardown({ phases: async () => 0, teardown: failing });
  assert.equal(afterPass.runCode, 0);
  assert.equal(afterPass.code, 1);
  assert.equal(afterPass.teardown.ok, false);
  assert.match(afterPass.teardown.detail, /no such container/);
  // …and it can never turn a 1 or a 2 into anything softer.
  assert.equal((await withTeardown({ phases: async () => 1, teardown: failing })).code, 1);
  assert.equal(
    (
      await withTeardown({
        phases: async () => {
          throw new Error('x');
        },
        teardown: failing,
      })
    ).code,
    2,
  );
});

test('withTeardown leaves the containers alone under --keep', async () => {
  let called = false;
  const out = await withTeardown({
    phases: async () => 0,
    teardown: () => {
      called = true;
    },
    keep: true,
  });
  assert.equal(called, false);
  assert.equal(out.code, 0);
  assert.equal(out.teardown.ran, false);
});

// ── nothing else may hold a published port ──────────────────────────────────

test('publishedPorts takes every port the registry declares, not just http', () => {
  // The renderer publishes each of http/tcp/grpc, so each must be free before
  // `up` can bind it.
  const entries = [
    { name: 'grocery-service', ports: { http: 3018, tcp: 4008, grpc: 5010 } },
    { name: 'web', ports: { http: 3000 } },
  ];
  assert.deepEqual(publishedPorts(entries), [
    { port: 3000, service: 'web' },
    { port: 3018, service: 'grocery-service' },
    { port: 4008, service: 'grocery-service' },
    { port: 5010, service: 'grocery-service' },
  ]);
});

// The bind-based probe and the PID-naming parsers now live in
// scripts/lib/ports.mjs, with their own suite — a netstat grep read
// "command not found" as "every port free" on any machine without
// net-tools. publishedPorts stays here because it is registry-derived.

// ── the listener on the host port is the container ──────────────────────────

const CONTAINER = {
  status: 'ok',
  service: 'grocery-service',
  uptime: 40,
  nodeVersion: 'v26.8.2',
  environment: 'production',
};

test('sameProcess prefers pid, then startedAt, then hostname when a board carries one', () => {
  assert.deepEqual(sameProcess({ ...CONTAINER, pid: 7 }, { ...CONTAINER, pid: 7 }).basis, 'pid');
  assert.equal(sameProcess({ ...CONTAINER, pid: 7 }, { ...CONTAINER, pid: 9 }).ok, false);
  const started = '2026-09-13T04:00:00.000Z';
  const byStart = sameProcess(
    { ...CONTAINER, startedAt: started },
    { ...CONTAINER, startedAt: started },
  );
  assert.equal(byStart.basis, 'startedAt');
  assert.equal(byStart.ok, true);
  const byHost = sameProcess({ ...CONTAINER, hostname: 'abc' }, { ...CONTAINER, hostname: 'def' });
  assert.equal(byHost.basis, 'hostname');
  assert.equal(byHost.ok, false);
});

test('sameProcess catches the host dev fleet answering on the container’s port', () => {
  // The exact misattribution the review describes: `npm run dev:all` holds 3001,
  // compose could not bind it, and the host gateway answers every probe.
  const hostFleet = {
    status: 'ok',
    service: 'grocery-service',
    uptime: 10800,
    nodeVersion: 'v26.8.2',
    environment: 'development',
  };
  const v = sameProcess(hostFleet, CONTAINER, { containerAgeSeconds: 45 });
  assert.equal(v.ok, false);
  assert.match(v.detail, /environment/);
  // Even with a matching environment, three hours of uptime cannot come out of a
  // container 45 seconds old.
  const olderStillProduction = { ...hostFleet, environment: 'production' };
  const w = sameProcess(olderStillProduction, CONTAINER, { containerAgeSeconds: 45 });
  assert.equal(w.ok, false);
  assert.equal(w.basis, 'uptime vs container age');
});

test('sameProcess accepts the container itself, boot time included', () => {
  const v = sameProcess({ ...CONTAINER, uptime: 40 }, CONTAINER, { containerAgeSeconds: 55 });
  assert.equal(v.ok, true, 'fifteen seconds of Nest boot is inside the grace');
  assert.equal(sameProcess(CONTAINER, CONTAINER, { containerAgeSeconds: 41 }).ok, true);
});

test('sameProcess never passes a row it could not evaluate', () => {
  assert.equal(sameProcess(null, CONTAINER, { containerAgeSeconds: 40 }).ok, false);
  assert.equal(sameProcess(CONTAINER, null, { containerAgeSeconds: 40 }).ok, false);
  assert.equal(sameProcess(CONTAINER, CONTAINER, {}).basis, 'unverifiable');
  assert.equal(sameProcess(CONTAINER, CONTAINER, {}).ok, false);
});

test('livenessBody unwraps the gateway envelope the same way readinessBody does', () => {
  assert.deepEqual(livenessBody({ success: true, data: CONTAINER }), CONTAINER);
  assert.deepEqual(livenessBody(CONTAINER), CONTAINER);
  assert.equal(livenessBody({ success: true, data: { nothing: 1 } }), null);
});

// ── redis, by allow-list rather than by blacklist ───────────────────────────

test('redisConfigVerdict accepts only a policy on the list', () => {
  const raw = (v) => `maxmemory-policy\n${v}\n`;
  const allowed = ['volatile-lru', 'volatile-ttl', 'noeviction'];
  assert.equal(redisConfigVerdict('maxmemory-policy', raw('volatile-lru'), allowed).ok, true);
  assert.equal(redisConfigVerdict('maxmemory-policy', raw('noeviction'), allowed).ok, true);
  // The gap the old `!/allkeys-lru/` left wide open: both of these evict a
  // TTL-less loyalty balance exactly as allkeys-lru does.
  assert.equal(redisConfigVerdict('maxmemory-policy', raw('allkeys-lfu'), allowed).ok, false);
  assert.equal(redisConfigVerdict('maxmemory-policy', raw('allkeys-random'), allowed).ok, false);
  assert.equal(redisConfigVerdict('maxmemory-policy', raw('allkeys-lru'), allowed).ok, false);
  assert.equal(
    redisConfigVerdict('maxmemory-policy', raw('allkeys-lfu'), allowed).value,
    'allkeys-lfu',
  );
  // No answer at all is not a pass.
  assert.equal(redisConfigVerdict('maxmemory-policy', '', allowed).ok, false);
  assert.equal(redisConfigVerdict('appendonly', 'appendonly\nyes\n', ['yes']).ok, true);
  assert.equal(redisConfigVerdict('appendonly', 'appendonly\nno\n', ['yes']).ok, false);
});

// ── the image column is measured, not inferred ──────────────────────────────

test('imageVerdicts reads what compose said it did with each image', () => {
  const log = [
    ' Image kartseek/api-gateway:dev  Built ',
    ' Image kartseek/web:dev  Reused ',
    ' Container kartseek-web  Started ',
  ].join('\n');
  const out = imageVerdicts(log);
  assert.equal(out.get('api-gateway'), 'built');
  assert.equal(out.get('web'), 'reused');
  assert.equal(out.get('taxi-service'), undefined, 'unmeasured stays unmeasured');
  assert.equal(imageVerdicts('').size, 0);
});

test('driftCensus counts tables and findings, and never hides an unreachable module', () => {
  const good = driftCensus({
    reports: [
      {
        module: 'grocery',
        tables: 14,
        findings: [],
        target: 'grocery_user@127.0.0.1:5432/kartseek_db',
      },
      { module: 'taxi', tables: 9, findings: [], target: 'taxi_user@127.0.0.1:5432/kartseek_db' },
    ],
  });
  assert.equal(good.line, '2 module(s), 23 table(s), 0 finding(s), 0 unreachable');
  // The targets are carried so the run can tie the census to its own Postgres
  // container rather than to whatever answered on 5432.
  assert.deepEqual(good.targets, [
    'grocery_user@127.0.0.1:5432/kartseek_db',
    'taxi_user@127.0.0.1:5432/kartseek_db',
  ]);
  const bad = driftCensus({
    reports: [
      { module: 'grocery', tables: 14, findings: [{ kind: 'missing-column' }] },
      { module: 'taxi', tables: 0, findings: [], error: 'password authentication failed' },
    ],
  });
  assert.equal(bad.ok, false);
  assert.match(bad.line, /1 finding\(s\), 1 unreachable/);
});
