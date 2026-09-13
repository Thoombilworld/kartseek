/**
 * Unit tests for the parts of the smoke that decide whether a run is honest:
 * the port sweep, the alternate port set, and socket ownership.
 *
 *   node --test tests/smoke/boot-all.test.mjs      (or `npm run smoke:test`)
 *
 * Importing `boot-all.mjs` must not boot anything — the module only runs when it
 * is the process entry point — so these tests are cheap and need no build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {
  UNREGISTERED_PORTS,
  busyPorts,
  formatBusy,
  hasAddrInUse,
  listenerPidsFrom,
  ownedByChild,
  portPlan,
  portsStillListening,
  processParents,
  shiftPort,
  smokeEnvOverrides,
  staleUnregistered,
} from './boot-all.mjs';
import { loadRegistry, nestEntries } from '../../scripts/registry/lib.mjs';

const listen = (port, host) =>
  new Promise((resolve) => {
    const server = net.createServer().listen(port, host);
    server.once('listening', () => resolve(server));
  });
const close = (server) => new Promise((r) => server.close(r));

// ── The port sweep ───────────────────────────────────────────────────────────

test('portsStillListening reports a port that is bound and nothing when it is free', async () => {
  const server = await listen(45999, '127.0.0.1');
  assert.deepEqual(await portsStillListening([45999, 45998]), [45999]);
  await close(server);
  assert.deepEqual(await portsStillListening([45999]), []);
});

test('a 0.0.0.0-only listener is still found — one probe address is not enough', async () => {
  // The failure this guards: on Windows a bind to 127.0.0.1 succeeds alongside a
  // listener on 0.0.0.0, so a loopback-only sweep calls an occupied TCP
  // microservice port free and the child then dies of EADDRINUSE.
  const server = await listen(45997, '0.0.0.0');
  assert.deepEqual(await portsStillListening([45997]), [45997]);
  await close(server);
  assert.deepEqual(await portsStillListening([45997]), []);
});

test('busyPorts carries the service that wanted the port and the owning pid', async () => {
  const probe = async (port) => ({ inUse: port === 4002, reason: 'EADDRINUSE' });
  const name = () => new Map([[4002, { pid: '37472', tool: 'netstat -ano' }]]);
  const rows = await busyPorts(
    [
      { port: 4002, service: 'marketplace-service', kind: 'tcp' },
      { port: 4003, service: 'cart-service', kind: 'tcp' },
    ],
    { probe, name },
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(
    { ...rows[0], host: undefined },
    {
      port: 4002,
      host: undefined,
      reason: 'EADDRINUSE',
      pid: '37472',
      tool: 'netstat -ano',
      service: 'marketplace-service',
      kind: 'tcp',
    },
  );
  assert.match(formatBusy(rows), /marketplace-service \(tcp\)/);
});

test('a port whose owner cannot be named is still busy, and says so', async () => {
  const probe = async () => ({ inUse: true, reason: 'EADDRINUSE' });
  const rows = await busyPorts([3001], { probe, name: () => new Map() });
  assert.equal(rows[0].pid, null);
  assert.match(formatBusy(rows), /PID unknown/);
});

test('a non-EADDRINUSE error counts only on the loopback address', async () => {
  const probe = async (port, host) =>
    host === '127.0.0.1' ? { inUse: false, reason: null } : { inUse: true, reason: 'EAFNOSUPPORT' };
  assert.deepEqual(await portsStillListening([3001], { probe, name: () => new Map() }), []);
  const onLoopback = async () => ({ inUse: true, reason: 'EACCES' });
  assert.deepEqual(
    await portsStillListening([80], { probe: onLoopback, name: () => new Map() }),
    [80],
  );
});

// ── The alternate port set ───────────────────────────────────────────────────

const entries = [
  {
    name: 'api-gateway',
    ports: { http: 3001 },
    env: { http: 'API_GATEWAY_PORT' },
  },
  {
    name: 'marketplace-service',
    ports: { http: 3012, tcp: 4002, grpc: 5006 },
    env: {
      http: 'MARKETPLACE_SERVICE_PORT',
      tcp: 'MARKETPLACE_TCP_PORT',
      grpc: 'MARKETPLACE_GRPC_PORT',
    },
  },
  {
    name: 'audit-log-service',
    ports: { http: 3028, tcp: 4028 },
    env: { http: 'AUDIT_LOG_SERVICE_PORT', tcp: 'AUDIT_LOG_TCP_PORT' },
  },
];

test('shiftPort refuses an offset that leaves the port range', () => {
  assert.equal(shiftPort(3001, 0), 3001);
  assert.equal(shiftPort(3001, 10_000), 13_001);
  assert.throws(() => shiftPort(3001, 70_000), /outside 1-65535/);
});

test('portPlan covers every port the registry declares', () => {
  const plan = portPlan(entries, 10_000);
  assert.deepEqual(
    plan.map((r) => `${r.service}:${r.kind}:${r.base}->${r.port}`),
    [
      'api-gateway:http:3001->13001',
      'marketplace-service:http:3012->13012',
      'marketplace-service:tcp:4002->14002',
      'marketplace-service:grpc:5006->15006',
      'audit-log-service:http:3028->13028',
      'audit-log-service:tcp:4028->14028',
    ],
  );
  // 4028 comes from the registry now — IN8 added `tcp: 4028` to
  // audit-log-service after this list flagged it — so the workaround is empty
  // and `portPlan` must not count a port twice.
  assert.deepEqual(UNREGISTERED_PORTS, []);
  assert.equal(plan.filter((r) => r.base === 4028).length, 1);
});

test('an UNREGISTERED_PORTS row the registry has caught up with is refused', () => {
  // The workaround's whole risk: services.yaml gains the port, nobody deletes
  // the hand-written row, and portPlan quietly emits it twice — 58 rows under a
  // header that says 57. The fixtures above cannot see that, because they are
  // fixtures; this is what the run checks before it boots anything.
  const extras = [
    { service: 'audit-log-service', kind: 'tcp', env: 'AUDIT_LOG_TCP_PORT', port: 4028 },
  ];
  assert.deepEqual(staleUnregistered(entries, extras), extras, 'the registry declares tcp 4028');
  assert.equal(portPlan(entries, 0, extras).filter((r) => r.base === 4028).length, 2);

  const registryWithout = entries.map((s) =>
    s.name === 'audit-log-service' ? { ...s, ports: { http: 3028 }, env: { http: s.env.http } } : s,
  );
  assert.deepEqual(
    staleUnregistered(registryWithout, extras),
    [],
    'still the only way to see 4028',
  );
  assert.equal(portPlan(registryWithout, 0, extras).filter((r) => r.base === 4028).length, 1);
});

test('the real registry leaves no stale UNREGISTERED_PORTS row behind', () => {
  // Against services.yaml itself, not a fixture — the check the report promised
  // and the previous round did not have.
  assert.deepEqual(staleUnregistered(nestEntries(loadRegistry()), UNREGISTERED_PORTS), []);
});

test('offset 0 changes no environment at all', () => {
  assert.deepEqual(smokeEnvOverrides(entries, 0), {});
});

test('an offset moves a child’s own ports and every peer address it resolves', () => {
  const env = smokeEnvOverrides(entries, 10_000);
  // Its own bind ports.
  assert.equal(env.API_GATEWAY_PORT, '13001');
  assert.equal(env.MARKETPLACE_SERVICE_PORT, '13012');
  assert.equal(env.MARKETPLACE_TCP_PORT, '14002');
  assert.equal(env.MARKETPLACE_GRPC_PORT, '15006');
  assert.equal(env.AUDIT_LOG_TCP_PORT, '14028');
  // Peer addresses: both spellings of the gRPC URL, pinned to loopback.
  assert.equal(env.MARKETPLACE_GRPC_URL, '127.0.0.1:15006');
  assert.equal(env.MARKETPLACE_SERVICE_GRPC_URL, '127.0.0.1:15006');
  assert.equal(env.MARKETPLACE_SERVICE_HOST, '127.0.0.1');
  assert.equal(env.AUDIT_LOG_SERVICE_HOST, '127.0.0.1');
  // SELLER_SERVICE is marketplace under its former token and has its own host var.
  assert.equal(env.SELLER_SERVICE_HOST, '127.0.0.1');
  // Nothing that is not a platform port may be rewritten.
  assert.equal('DB_PORT' in env, false);
  assert.equal('REDIS_PORT' in env, false);
});

// ── Ownership ────────────────────────────────────────────────────────────────

test('listenerPidsFrom returns every pid on the port, not just the first', () => {
  const netstat = [
    '  TCP    127.0.0.1:3012         0.0.0.0:0              LISTENING       37472',
    '  TCP    [::]:3012              [::]:0                 LISTENING       991',
    '  TCP    0.0.0.0:3013           0.0.0.0:0              LISTENING       26460',
    '  TCP    127.0.0.1:3012         127.0.0.1:51234        TIME_WAIT       0',
  ].join('\r\n');
  assert.deepEqual(listenerPidsFrom(netstat, 3012), [37472, 991]);
  assert.deepEqual(listenerPidsFrom(netstat, 3013), [26460]);
  assert.deepEqual(listenerPidsFrom(netstat, 3099), []);
});

test('listenerPidsFrom reads lsof, where the pid is the second column', () => {
  const lsof = 'node    1234 me   20u  IPv4 0x1 0t0  TCP 127.0.0.1:3001 (LISTEN)';
  assert.deepEqual(listenerPidsFrom(lsof, 3001, { format: 'lsof' }), [1234]);
  assert.deepEqual(listenerPidsFrom(lsof, 3002, { format: 'lsof' }), []);
});

test('ownedByChild accepts the child and its descendants, and nothing else', () => {
  const parents = new Map([
    [200, 100],
    [300, 200],
  ]);
  assert.equal(ownedByChild([100], 100, parents).ok, true);
  assert.equal(ownedByChild([300], 100, parents).ok, true, 'grandchild binds the socket');
  const foreign = ownedByChild([999], 100, parents);
  assert.equal(foreign.ok, false);
  assert.match(foreign.why, /PID 999 holds the port, not the child \(PID 100\)/);
  // The IN5 shape: our child bound one address, something older bound another.
  assert.equal(ownedByChild([300, 999], 100, parents).ok, false);
});

test('ownedByChild never passes a socket it could not attribute', () => {
  const verdict = ownedByChild([], 100, new Map());
  assert.equal(verdict.ok, false);
  assert.match(verdict.why, /no nameable owner/);
});

test('ownedByChild cannot loop on a cyclic parent table', () => {
  const parents = new Map([
    [1, 2],
    [2, 1],
  ]);
  assert.equal(ownedByChild([1], 100, parents).ok, false);
});

test('processParents reads the platform command it was given', () => {
  const win = processParents({
    platform: 'win32',
    run: () => ({ code: 0, stdout: '4,0\r\n1234,4\r\n5678,1234\r\n', stderr: '', error: null }),
  });
  assert.equal(win.get(5678), 1234);
  const posix = processParents({
    platform: 'linux',
    run: () => ({ code: 0, stdout: ' 1234     1\n 5678  1234\n', stderr: '', error: null }),
  });
  assert.equal(posix.get(5678), 1234);
  // A missing or failing tool yields an empty map — which makes every foreign
  // pid look foreign, so ownership fails closed rather than open.
  assert.equal(processParents({ run: () => ({ code: null, stdout: '', stderr: '' }) }).size, 0);
});

test('hasAddrInUse finds the error however the child phrased it', () => {
  assert.equal(hasAddrInUse('Error: listen EADDRINUSE: address already in use :::3012'), true);
  assert.equal(hasAddrInUse('bind: Address already in use'), true);
  assert.equal(hasAddrInUse('Nest application successfully started'), false);
  assert.equal(hasAddrInUse(undefined), false);
});

test('the real process table names this very process’ parent', () => {
  const parents = processParents();
  assert.equal(parents.get(process.pid), process.ppid);
});
