import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import {
  renderMicroservices,
  probePaths,
  runAsUserFor,
  credentialEnv,
  datastoreUriEnv,
  servicePorts,
  LOOPBACK_HTTP,
  tierOf,
} from './k8s.mjs';
import { generateAll, checkGenerated } from './generate.mjs';
import { loadRegistry, repoRoot, nestEntries } from './lib.mjs';

// ── A registry to render, rather than the repository's own ───────────────────
// One of each kind, so a rendering rule can be asserted in isolation and a
// change to services.yaml cannot quietly make a test vacuous.
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
};
const audit = {
  name: 'audit-log-service',
  kind: 'core-service',
  path: 'apps/api/apps/audit-log-service',
  image: 'kartseek/audit-log-service',
  build: { workspace: 'kartseek-api', nestProject: 'audit-log-service' },
  ports: { http: 3028 },
  env: { http: 'AUDIT_LOG_SERVICE_PORT' },
  health: { live: '/health', ready: '/health/ready' },
  database: null,
  dependsOn: ['mongodb', 'redis', 'kafka'],
  kafka: { groupId: 'audit-log-consumers' },
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
};
const pharmacy = {
  ...grocery,
  name: 'pharmacy-service',
  path: 'modules/pharmacy/backend',
  image: 'kartseek/pharmacy-service',
  ports: { http: 3020, tcp: 4010 },
  env: { http: 'PHARMACY_SERVICE_PORT', tcp: 'PHARMACY_TCP_PORT' },
  database: { name: 'kartseek_pharmacy', schema: 'pharmacy', envPrefix: 'PHARMACY_DB' },
};
const web = {
  name: 'web',
  kind: 'web-shell',
  path: 'apps/web',
  image: 'kartseek/web',
  build: { workspace: 'kartseek-web' },
  ports: { http: 3000 },
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
const fixture = { version: 1, services: [gateway, audit, search, grocery, pharmacy, web, zone] };

const docs = (reg) =>
  YAML.parseAllDocuments(renderMicroservices(reg))
    .map((d) => d.toJS())
    .filter(Boolean);
const find = (reg, kind, name) =>
  docs(reg).find((d) => d.kind === kind && d.metadata.name === name);
const containerOf = (dep) => dep.spec.template.spec.containers[0];
const envOf = (dep) => Object.fromEntries(containerOf(dep).env.map((e) => [e.name, e]));

test('every entry but the gateway yields one Deployment and one Service', () => {
  const rendered = docs(fixture);
  const deployments = rendered.filter((d) => d.kind === 'Deployment').map((d) => d.metadata.name);
  const services = rendered.filter((d) => d.kind === 'Service').map((d) => d.metadata.name);
  const expected = fixture.services.filter((s) => s.kind !== 'gateway').map((s) => s.name);
  assert.deepEqual(deployments.sort(), [...expected].sort());
  assert.deepEqual(services.sort(), [...expected].sort());
  // The gateway is hand-written in api-gateway.yaml; rendering it here as well
  // would mean two definitions of one Deployment in one directory.
  assert.ok(!deployments.includes('api-gateway'));
});

test('a Nest entry is probed on the health routes the registry declares', () => {
  for (const s of [audit, search, grocery]) {
    const c = containerOf(find(fixture, 'Deployment', s.name));
    assert.deepEqual(c.livenessProbe.httpGet, { path: s.health.live, port: 'http' }, s.name);
    assert.deepEqual(c.readinessProbe.httpGet, { path: s.health.ready, port: 'http' }, s.name);
    assert.deepEqual(c.startupProbe.httpGet, { path: s.health.live, port: 'http' }, s.name);
    // The container port named `http` must be the registry's ports.http, or the
    // probe resolves to a port nothing binds.
    const http = c.ports.find((p) => p.name === 'http');
    assert.equal(http.containerPort, s.ports.http, s.name);
    // ≥ 60s before liveness is allowed to kill a pod that is still booting.
    assert.ok(c.startupProbe.failureThreshold * c.startupProbe.periodSeconds >= 60, s.name);
    assert.equal(
      c.livenessProbe.initialDelaySeconds,
      undefined,
      `${s.name}: startupProbe covers it`,
    );
  }
});

test('the one service that binds HTTP to loopback is probed on its TCP port', () => {
  assert.deepEqual([...LOOPBACK_HTTP], ['pharmacy-service']);
  const c = containerOf(find(fixture, 'Deployment', 'pharmacy-service'));
  for (const p of ['livenessProbe', 'readinessProbe', 'startupProbe']) {
    assert.equal(c[p].httpGet, undefined);
    assert.deepEqual(c[p].tcpSocket, { port: 4010 });
  }
  // And its Service publishes only what is reachable: an http port would
  // resolve, connect and answer nothing.
  assert.deepEqual(
    servicePorts(pharmacy).filter((l) => l.startsWith('- name:')),
    ['- name: tcp'],
  );
});

test('a web entry is probed on a page it must be able to render', () => {
  const shell = containerOf(find(fixture, 'Deployment', 'web'));
  assert.deepEqual(shell.readinessProbe.httpGet, { path: '/admin/login', port: 'http' });
  assert.deepEqual(shell.livenessProbe.httpGet, { path: '/admin/login', port: 'http' });
  const z = containerOf(find(fixture, 'Deployment', 'hotel-frontend'));
  // `/` on a zone is a 404 — it is mounted under its basePath.
  assert.deepEqual(z.readinessProbe.httpGet, { path: '/hotel-booking/', port: 'http' });
  assert.deepEqual(probePaths(zone), { live: '/hotel-booking/', ready: '/hotel-booking/' });
});

test('a web pod is told where the gateway is, and the shell where each zone is', () => {
  const shell = envOf(find(fixture, 'Deployment', 'web'));
  assert.equal(shell.API_URL.value, 'http://api-gateway.kartseek.svc.cluster.local:3001/api/v1');
  assert.equal(
    shell.HOTEL_ZONE_ORIGIN.value,
    'http://hotel-frontend.kartseek.svc.cluster.local:3007',
  );
  // No secretRef: a Next server needs none of the platform's credentials, and a
  // Secret it never receives is one its image cannot leak.
  const from = containerOf(find(fixture, 'Deployment', 'web')).envFrom;
  assert.deepEqual(from, [{ configMapRef: { name: 'kartseek-config' } }]);
  assert.equal(tierOf(web), 'web');
  assert.equal(tierOf(grocery), 'microservice');
});

test('nothing addresses a datastore as localhost', () => {
  // Values, not prose: the pharmacy probe block's comment explains that the
  // service binds 127.0.0.1, which is the problem being described rather than
  // an address anything here dials.
  const out = renderMicroservices(fixture)
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  assert.ok(!/localhost/.test(out), 'in a pod, localhost is the pod');
  assert.ok(!/127\.0\.0\.1/.test(out));
  // 0.0.0.0 is a bind address, not an address anything dials — the one
  // legitimate loopback-adjacent value.
  assert.match(out, /GROCERY_HTTP_HOST/);
  const grocEnv = envOf(find(fixture, 'Deployment', 'grocery-service'));
  assert.equal(grocEnv.GROCERY_HTTP_HOST.value, '0.0.0.0');
});

test('no manifest carries a password, only a reference to one', () => {
  const out = renderMicroservices(fixture);
  assert.ok(!/password:\s*\S/i.test(out), 'a password literal has no place in a manifest');
  const groc = envOf(find(fixture, 'Deployment', 'grocery-service'));
  assert.deepEqual(groc.DB_PASSWORD.valueFrom.secretKeyRef, {
    name: 'kartseek-secrets',
    key: 'GROCERY_DB_PASSWORD',
  });
  // The credential in a URL is assembled by the kubelet from keys the Secret
  // already supplied, so the shape is in the manifest and the value is not.
  const [mongo] = datastoreUriEnv(audit);
  assert.equal(
    mongo.value,
    'mongodb://$(MONGO_ROOT_USER):$(MONGO_ROOT_PASSWORD)@mongodb.kartseek.svc.cluster.local:27017/$(MONGO_DB_NAME)?authSource=admin',
  );
  const [es] = datastoreUriEnv(search);
  assert.equal(
    es.value,
    'http://elastic:$(ELASTIC_PASSWORD)@elasticsearch.kartseek.svc.cluster.local:9200',
  );
  // A service that declares neither dependency is handed neither address.
  assert.deepEqual(datastoreUriEnv(grocery), []);
});

test('a module service connects as its own role, a null-database service as nobody', () => {
  const byName = Object.fromEntries(credentialEnv(grocery).map((e) => [e.name, e]));
  assert.equal(byName.DB_USER.value, 'grocery_user');
  assert.equal(byName.DB_HOST.valueFrom.configMapKeyRef, 'GROCERY_DB_HOST');
  assert.equal(byName.DB_NAME.valueFrom.configMapKeyRef, 'GROCERY_DB_NAME');
  // `unused`, not blank: @app/common's Joi schema rejects an empty DB_USER and
  // the pod crash-loops before it listens.
  const none = Object.fromEntries(credentialEnv(audit).map((e) => [e.name, e.value]));
  assert.deepEqual(none, { DB_NAME: 'unused', DB_USER: 'unused', DB_PASSWORD: '' });
  // The platform owner takes everything but the password from the ConfigMap;
  // the Secret calls that POSTGRES_PASSWORD and the service reads DB_PASSWORD.
  assert.deepEqual(credentialEnv(gateway), [
    { name: 'DB_PASSWORD', valueFrom: { secretKeyRef: 'POSTGRES_PASSWORD' } },
  ]);
});

test('a pod waits for exactly the datastores its entry depends on', () => {
  const waits = (name) =>
    find(fixture, 'Deployment', name).spec.template.spec.initContainers.map((c) => c.name);
  assert.deepEqual(waits('grocery-service'), [
    'wait-for-postgres',
    'wait-for-redis',
    'wait-for-kafka',
  ]);
  // audit-log-service opens no Postgres connection; the old generator gave it a
  // wait-for-db anyway.
  assert.deepEqual(waits('audit-log-service'), [
    'wait-for-mongodb',
    'wait-for-redis',
    'wait-for-kafka',
  ]);
  for (const c of find(fixture, 'Deployment', 'grocery-service').spec.template.spec.initContainers)
    assert.ok(c.resources.requests.cpu && c.resources.limits.cpu, `${c.name}: ResourceQuota`);
});

test('runAsUser matches the uid the image actually runs as', () => {
  // infra/docker/core-service.Dockerfile is `USER node` (1000); the gateway,
  // module and Next images all add a user at 1001.
  assert.equal(runAsUserFor(audit), 1000);
  assert.equal(runAsUserFor(grocery), 1001);
  assert.equal(runAsUserFor(web), 1001);
  assert.equal(runAsUserFor(gateway), 1001);
  const d = find(fixture, 'Deployment', 'grocery-service');
  assert.equal(d.spec.template.spec.securityContext.runAsUser, 1001);
  assert.equal(containerOf(d).securityContext.runAsUser, 1001);
});

test('every application container carries resources and pulls the local image', () => {
  for (const name of ['grocery-service', 'audit-log-service', 'web', 'hotel-frontend']) {
    const c = containerOf(find(fixture, 'Deployment', name));
    // The 2026-08-13 quota finding is about init containers, but the
    // ResourceQuota walks the application container first — and a limit-less
    // container is also what the LimitRange has to invent a default for.
    assert.ok(c.resources.requests.cpu && c.resources.requests.memory, `${name}: requests`);
    assert.ok(c.resources.limits.cpu && c.resources.limits.memory, `${name}: limits`);
    // Nothing publishes a kartseek/* image; the live probe and every local
    // deploy depend on the daemon's own copy being used.
    assert.equal(c.imagePullPolicy, 'IfNotPresent', name);
  }
});

test('the header says the zone images cannot be built yet', () => {
  // The nine Next Deployments are ready wiring for images that do not exist:
  // only apps/web sets output: 'standalone' (Task IN11). An operator reading
  // ErrImagePull deserves to find that here rather than in a task report.
  const out = renderMicroservices(fixture);
  assert.match(out, /NOT EVERY IMAGE HERE CAN BE BUILT YET/);
  assert.match(out, /output: 'standalone'/);
  assert.match(out, /IN11/);
});

test('the image tag is substituted at deploy time, never baked', () => {
  const out = renderMicroservices(fixture);
  assert.match(out, /image: kartseek\/grocery-service:\$\{KARTSEEK_TAG\}/);
  // 2.0.0 and 2.1.0 were baked here and no such image has ever been built.
  assert.ok(!/image: kartseek\/[a-z-]+:\d/.test(out));
});

test('registry:check fails when the generated manifest is stale', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-k8s-'));
  try {
    assert.ok(
      generateAll(fixture, root).written.includes('infra/k8s/microservices-generated.yaml'),
    );
    assert.deepEqual(checkGenerated(fixture, root), []);
    fs.appendFileSync(path.join(root, 'infra/k8s/microservices-generated.yaml'), '# edited\n');
    assert.ok(
      checkGenerated(fixture, root).some((f) =>
        f.includes('infra/k8s/microservices-generated.yaml'),
      ),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ── The hand-written manifests, against the registry they must agree with ────

const root = repoRoot();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('the gateway probes carry the global prefix and the version', () => {
  const gw = read('infra/k8s/api-gateway.yaml');
  const reg = loadRegistry(root);
  const entry = reg.services.find((s) => s.name === 'api-gateway');
  assert.match(gw, new RegExp(`path: ${entry.health.live}\\b`));
  assert.match(gw, new RegExp(`path: ${entry.health.ready}\\b`));
  // main.ts sets the global prefix `api` and enables URI versioning, so a bare
  // /health is a 404 — three of them was a rollout that never passed readiness
  // and crash-looped on liveness (AUD2-001).
  assert.ok(!/path: \/health\b/.test(gw), 'a bare /health probe is a 404 behind the global prefix');
  // `(?!\/)` so /api/v1/health/ready is not counted as a second /api/v1/health.
  assert.equal((gw.match(/path: \/api\/v1\/health(?!\/)/g) || []).length, 2); // liveness + startup
  assert.equal((gw.match(/path: \/api\/v1\/health\/ready\b/g) || []).length, 1);
});

test('every module database has its address keys in the ConfigMap', () => {
  const cm = read('infra/k8s/config.yaml');
  for (const s of nestEntries(loadRegistry(root))) {
    if (!s.database || s.database.envPrefix === 'DB') continue;
    for (const k of ['HOST', 'PORT', 'NAME', 'USER'])
      assert.match(
        cm,
        new RegExp(`^\\s*${s.database.envPrefix}_${k}:`, 'm'),
        `${s.database.envPrefix}_${k} missing from infra/k8s/config.yaml`,
      );
    // The password is the one key that never appears there.
    assert.ok(
      !new RegExp(`^\\s*${s.database.envPrefix}_PASSWORD:\\s*'?\\S`, 'm').test(
        cm.split('kind: Secret')[0],
      ),
      `${s.database.envPrefix}_PASSWORD must come from the Secret`,
    );
  }
});

test('every manifest in infra/k8s parses, and every document is addressable', () => {
  // Not a substitute for `kubectl apply --dry-run=server`, which runs admission
  // as well — but that needs an API server, and this runs anywhere. It is what
  // catches the class of damage an edit does to a file nobody re-parses: a
  // document that no longer loads, or one that loses its name or its namespace
  // and would land in whatever namespace the operator's context happens to be.
  const dir = path.join(root, 'infra/k8s');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'));
  assert.ok(files.length >= 9, `only ${files.length} manifests found`);
  let documents = 0;
  for (const f of files) {
    for (const doc of YAML.parseAllDocuments(read(`infra/k8s/${f}`))) {
      assert.deepEqual(
        doc.errors.map((e) => e.message),
        [],
        `infra/k8s/${f}: YAML errors`,
      );
      const js = doc.toJS();
      if (js === null) continue; // a comment-only document, of which this tree has several
      documents++;
      assert.ok(js.apiVersion, `infra/k8s/${f}: a document with no apiVersion`);
      assert.ok(js.kind, `infra/k8s/${f}: a document with no kind`);
      assert.ok(js.metadata?.name, `infra/k8s/${f}: a ${js.kind} with no name`);
      // Cluster-scoped kinds have no namespace; everything else must say
      // kartseek rather than inherit the operator's current context.
      if (!['StorageClass', 'Namespace', 'ClusterIssuer'].includes(js.kind))
        assert.equal(
          js.metadata.namespace,
          'kartseek',
          `infra/k8s/${f}: ${js.kind}/${js.metadata.name}`,
        );
    }
  }
  assert.ok(documents > 100, `only ${documents} documents parsed`);
});

test('allow-web-tier admits exactly the ports the registry gives the web tier', () => {
  // The policy is hand-written and the Deployments are generated, so this is the
  // only thing standing between the two. A zone added to services.yaml with no
  // port here is a pod default-deny drops; a port here with no zone is a grant
  // nothing needs.
  const ns = YAML.parseAllDocuments(read('infra/k8s/namespace.yaml'))
    .map((d) => d.toJS())
    .find((d) => d?.kind === 'NetworkPolicy' && d.metadata.name === 'allow-web-tier');
  const allowed = ns.spec.ingress[0].ports.map((p) => p.port).sort((a, b) => a - b);
  const declared = loadRegistry(root)
    .services.filter((s) => ['web-shell', 'web-zone'].includes(s.kind))
    .map((s) => s.ports.http)
    .sort((a, b) => a - b);
  assert.deepEqual(allowed, declared);
});

// ── deploy.sh's Secret step ─────────────────────────────────────────────────
// The names live in config.yaml and the script reads them with sed; these three
// tests are what keep the two from drifting, and what keeps `kubectl apply` out
// of a Secret this script only ever partly builds.

/** config.yaml's Secret document, as { name: 'optional' | 'required' }. */
const secretTemplate = () => {
  const doc = YAML.parseAllDocuments(read('infra/k8s/config.yaml'))
    .map((d) => d.toJS())
    .find((d) => d?.kind === 'Secret' && d.metadata.name === 'kartseek-secrets');
  const optional = new Set(
    [...read('infra/k8s/config.yaml').matchAll(/^ {2}([A-Z0-9_]+): *(?:''|"") # optional$/gm)].map(
      (m) => m[1],
    ),
  );
  return Object.fromEntries(
    Object.keys(doc.stringData).map((k) => [k, optional.has(k) ? 'optional' : 'required']),
  );
};

test('the required Secret names are the platform’s own, and pinned', () => {
  // Nothing else asserts this split, so adding `# optional` to POSTGRES_PASSWORD
  // would quietly downgrade a platform credential with every suite still green.
  const template = secretTemplate();
  const required = Object.keys(template)
    .filter((k) => template[k] === 'required')
    .sort();
  assert.deepEqual(required, [
    'DOCTOR_DB_PASSWORD',
    'ELASTIC_PASSWORD',
    'ENCRYPTION_KEY',
    'FRANCHISE_DB_PASSWORD',
    'GROCERY_DB_PASSWORD',
    'HOTEL_DB_PASSWORD',
    'JWT_SECRET',
    'MARKETPLACE_DB_PASSWORD',
    'MONGO_ROOT_PASSWORD',
    'PHARMACY_DB_PASSWORD',
    'POSTGRES_PASSWORD',
    'REDIS_PASSWORD',
    'RESTAURANT_DB_PASSWORD',
    'TAXI_DB_PASSWORD',
  ]);
  assert.equal(Object.keys(template).length, 28);
});

test('the empty shape is one rule, and deploy.sh reads the same one', () => {
  // A key written `KEY: ""` passes the no-secret-literal test below and used to
  // be invisible to deploy.sh's sed, so it would silently never be filled.
  const deploy = read('infra/k8s/deploy.sh');
  const rule = /^EMPTY=.*$/m.exec(deploy);
  assert.ok(rule, 'deploy.sh no longer defines the EMPTY shape it matches on');
  for (const shape of ['\\x27\\x27', '""'])
    assert.ok(rule[0].includes(shape), `deploy.sh's EMPTY rule misses ${shape}: ${rule[0]}`);
  // And every value in the template is one of those two shapes.
  const secretBlock = read('infra/k8s/config.yaml').split('stringData:')[1].split('\n---')[0];
  for (const line of secretBlock.split('\n')) {
    const m = /^ {2}([A-Z0-9_]+): *(\S*)/.exec(line);
    if (m) assert.match(m[2], /^(''|"")$/, `${m[1]} is not written as an empty scalar`);
  }
});

test('deploy.sh never applies a partial Secret', () => {
  // `kubectl apply` PRUNES a key that was in last-applied and is absent now —
  // and this script is the one documented way to fill the Secret, so its own
  // previous run is what puts keys there. A second run with a narrower source
  // would have deleted the credentials the warning claims to keep.
  const deploy = read('infra/k8s/deploy.sh');
  const step5 = deploy.split('# ── Step 5: The Secret')[1].split('# ── Step 6:')[0];
  // Code, not prose: the comment beside the fix names `kubectl apply` in order
  // to explain why it is not used.
  const code = step5
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  assert.ok(
    !/kubectl apply/.test(code),
    'the Secret step reaches kubectl apply, which prunes keys it did not build',
  );
  assert.match(code, /kubectl get secret kartseek-secrets .*--ignore-not-found/);
  assert.match(code, /kubectl create secret generic kartseek-secrets/);
  assert.match(step5, /kubectl patch secret kartseek-secrets[\s\S]*--type merge --patch-file/);
  // The warning has to be true: it is only printed on the path that keeps them.
  assert.match(step5, /Kept from the existing Secret/);
});

test('every command documented in infra/k8s keeps its line continuations', () => {
  // `kubectl create secret generic kartseek-secrets #     --from-env-file=…`:
  // a multi-line command in a YAML comment lost its backslashes in an edit, and
  // pasted it created an EMPTY Secret that the next deploy then left untouched.
  // The signature is a `#` appearing inside a command line rather than starting
  // one, and a continued line that continues into nothing.
  for (const rel of ['infra/k8s/config.yaml', 'infra/k8s/README.md', 'infra/k8s/databases.yaml']) {
    const lines = read(rel).split('\n');
    lines.forEach((line, i) => {
      const command = /^\s*#?\s{0,3}((?:kubectl|docker|grep|node|npm|bash)\s.*)$/.exec(line);
      if (command)
        assert.ok(
          !/\S\s+#\s/.test(command[1]),
          `${rel}:${i + 1}: a '#' inside a documented command — a lost line continuation\n  ${line}`,
        );
      if (/\\$/.test(line))
        assert.ok(
          (lines[i + 1] ?? '').trim().length > 0,
          `${rel}:${i + 1}: continues into nothing`,
        );
    });
  }
});

test('no manifest in infra/k8s holds a secret value', () => {
  for (const f of fs.readdirSync(path.join(root, 'infra/k8s')).filter((f) => f.endsWith('.yaml'))) {
    const text = read(`infra/k8s/${f}`);
    assert.ok(
      !/CHANGE_IN_PRODUCTION|change-in-production|kartseek123|change_me/.test(text),
      `${f} still holds a placeholder credential`,
    );
    for (const line of text.split('\n')) {
      // `stringData` keys in config.yaml are deliberately empty, and a comment
      // may name a variable; anything else assigning a non-empty value to a
      // *_PASSWORD / *_SECRET key is a literal in a manifest.
      const m = /^\s*([A-Z0-9_]*(?:PASSWORD|SECRET|_KEY)):\s*(.+)$/.exec(line);
      if (!m) continue;
      // A trailing `# optional` marks a third-party key deploy.sh may skip; the
      // value in front of it still has to be empty.
      assert.match(
        m[2].replace(/\s+#.*$/, '').trim(),
        /^(''|""|\|)$/,
        `${f}: ${m[1]} carries a value — fill it from the deploy pipeline instead`,
      );
    }
  }
});
