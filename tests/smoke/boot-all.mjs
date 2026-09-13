#!/usr/bin/env node
/**
 * Boot every Nest deployable from its built output and probe its health.
 *
 *   npm run build                # once — this script runs dist/, it does not compile
 *   npm run infra:up             # Postgres, Redis, Kafka, MongoDB must be reachable
 *   npm run smoke                # all 26
 *   npm run smoke -- --only=order-service,marketplace-service
 *   SMOKE_PORT_OFFSET=10000 npm run smoke    # alternate port set (see below)
 *
 * Services start in batches (SMOKE_BATCH, default 6) so a laptop is not asked
 * for 26 Node processes at once — under contention a healthy service looks
 * like a broken one. Each is given SMOKE_TIMEOUT_MS (default 90000) to answer
 * its registry `health.live` route with 200; a service with no HTTP health
 * route yet (live: null) passes when its HTTP port accepts a TCP connection,
 * which is what the Kubernetes probes do for it today. Every service's stdout
 * and stderr go to tests/smoke/logs/<name>.log.
 *
 * ── What this script had to stop doing ──────────────────────────────────────
 *
 * It used to be able to pass falsely, and it used to leave the fleet running.
 * IN5 caught both in one run: it printed `26/26 healthy` while
 * marketplace-service's own child was dying of EADDRINUSE and a foreign,
 * older process answered 3012 in 0.0 s. So a green result now needs four
 * things, not one:
 *
 *   1. PRE-FLIGHT. Every port this run will bind must be free before anything
 *      starts — proved by a real bind, not by reading `netstat`. A busy port
 *      is a hard refusal (exit 2) naming the port and the PID that holds it.
 *      The smoke never kills a process it did not start: the developer's
 *      `npm run dev` fleet is not its to stop.
 *   2. OWNERSHIP. A 200 is only accepted when the socket that answered belongs
 *      to the child this script spawned — the PID the OS reports for the
 *      listening port must be that child or one of its descendants. The
 *      liveness board carries no pid/startedAt of its own, so the socket is
 *      the only evidence available. An answer from anything else is a FAIL,
 *      and so is an answer whose owner nothing on this machine could name.
 *   3. `EADDRINUSE` in a child's log fails that service whatever the probe said.
 *   4. TEARDOWN BY PORT AND BY TREE. `stop()` kills the whole process tree, and
 *      afterwards every port of every service that ran must be free again. A
 *      leftover listener is a failure even when all 26 booted — the next run
 *      would otherwise be measuring this one.
 *
 * ── SMOKE_PORT_OFFSET — running while the dev fleet is up ───────────────────
 *
 * Default 0: the smoke uses the registry's own ports and refuses to start if
 * any of them is taken. On a machine already running `npm run dev`, that is
 * every one of them, so set an offset instead:
 *
 *   SMOKE_PORT_OFFSET=10000 npm run smoke
 *
 * 10000 is the documented value (3001 → 13001, 4002 → 14002, 5006 → 15006 —
 * clear of the registry and clear of Windows' 49152+ ephemeral range). With an
 * offset every registry port is shifted by it: each child binds its own shifted
 * ports, and — this is the part that matters — every address a child resolves a
 * PEER through is shifted the same way, so the fleet under test talks only to
 * itself and never to the developer's processes. That covers `<SVC>_SERVICE_PORT`,
 * `<SVC>_TCP_PORT`, `<SVC>_GRPC_PORT`, `<SVC>_GRPC_URL` /
 * `<SVC>_SERVICE_GRPC_URL`, and pins every `<SVC>_SERVICE_HOST` to loopback.
 * The pre-flight, the probes and the teardown assertion all follow the offset.
 *
 * The children read these from the environment they inherit, which beats the
 * `.env` files on disk: `dotenv.config()` does not overwrite an existing
 * `process.env` key, and @nestjs/config merges `{ ...envFile, ...process.env }`
 * and then only assigns keys `!(key in process.env)`. So the developer's
 * `apps/api/.env` cannot pull a child back onto the real ports.
 *
 * Exit codes: 0 all healthy and nothing left behind; 1 a service failed or a
 * port was still bound after teardown; 2 refused before booting anything.
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRegistry, repoRoot, nestEntries } from '../../scripts/registry/lib.mjs';
import {
  OWNER_TOOLS,
  namePortOwners,
  parseLsofOwners,
  probePort,
  shResult,
} from '../../scripts/lib/ports.mjs';

const root = repoRoot();
const logDir = path.join(root, 'tests/smoke/logs');

/**
 * Ports a service really binds that `services.yaml` does not declare.
 *
 * audit-log-service's `main.ts` defaults `AUDIT_LOG_TCP_PORT` to 4028 and the
 * gateway's `AUDIT_LOG_SERVICE` client dials the same variable, but the registry
 * lists only its HTTP port — and `registry:check` reads the registry's `env` map
 * into main.ts, never the other way round, so nothing notices. Left out of this
 * list the port would be invisible to the pre-flight and to the teardown sweep,
 * and under an offset the child would bind the developer's real 4028.
 *
 * The registry is still the place this belongs; adding it there regenerates the
 * compose file and the Kubernetes manifests, which is not this task's to change.
 */
export const UNREGISTERED_PORTS = [
  { service: 'audit-log-service', kind: 'tcp', env: 'AUDIT_LOG_TCP_PORT', port: 4028 },
];

/**
 * TCP client hosts that do not follow `<that service's env prefix>_SERVICE_HOST`.
 * `SELLER_SERVICE` is marketplace-service under its former name — the standalone
 * seller-service was folded into it and the token kept its own host variable.
 */
export const EXTRA_HOST_PREFIXES = ['SELLER'];

/** Bind addresses the pre-flight and the teardown assertion both try. */
export const PROBE_HOSTS = ['127.0.0.1', '0.0.0.0', '::'];

export function shiftPort(port, offset = 0) {
  const shifted = Number(port) + Number(offset);
  if (!Number.isInteger(shifted) || shifted < 1 || shifted > 65535)
    throw new Error(`SMOKE_PORT_OFFSET=${offset} puts ${port} outside 1-65535 (${shifted})`);
  return shifted;
}

/**
 * Every port the given services bind, shifted by `offset`.
 * One row per port: `{ service, kind, env, base, port }`.
 */
export function portPlan(entries, offset = 0, extras = UNREGISTERED_PORTS) {
  const rows = [];
  for (const s of entries)
    for (const [kind, base] of Object.entries(s.ports))
      rows.push({ service: s.name, kind, env: s.env[kind], base, port: shiftPort(base, offset) });
  for (const x of extras)
    if (entries.some((s) => s.name === x.service))
      rows.push({ ...x, base: x.port, port: shiftPort(x.port, offset) });
  return rows;
}

/**
 * The environment overrides that move a whole fleet onto the alternate port set.
 *
 * Computed over EVERY registry service, not just the ones being booted: a child
 * resolves its peers whether or not this run started them, and a `--only` run
 * that left the peer variables alone would quietly dial the developer's fleet.
 * Returns `{}` when the offset is 0 — then the registry's ports are the ports.
 */
export function smokeEnvOverrides(allEntries, offset = 0, extras = UNREGISTERED_PORTS) {
  const env = {};
  if (!offset) return env;
  for (const row of portPlan(allEntries, offset, extras)) env[row.env] = String(row.port);

  const hostPrefixes = new Set(EXTRA_HOST_PREFIXES);
  for (const x of extras) if (x.kind === 'tcp') hostPrefixes.add(x.env.replace(/_TCP_PORT$/, ''));
  for (const s of allEntries) {
    if (s.env.tcp) hostPrefixes.add(s.env.tcp.replace(/_TCP_PORT$/, ''));
    if (!s.ports.grpc) continue;
    // Both spellings: the client factory reads `<NAME>_GRPC_URL`, .env and the
    // gateway's health map use `<NAME>_SERVICE_GRPC_URL` for about half of them.
    const prefix = s.env.grpc.replace(/_GRPC_PORT$/, '');
    const url = `127.0.0.1:${shiftPort(s.ports.grpc, offset)}`;
    env[`${prefix}_GRPC_URL`] = url;
    env[`${prefix}_SERVICE_GRPC_URL`] = url;
  }
  for (const prefix of hostPrefixes) env[`${prefix}_SERVICE_HOST`] = '127.0.0.1';
  env.PAYMENT_TCP_HOST = '127.0.0.1';
  return env;
}

/**
 * Which of these ports cannot be bound, and who holds them.
 *
 * `ports` may be plain numbers or `portPlan` rows. One row out per busy port:
 * `{ port, host, reason, pid, tool, service, kind }`, in the order asked for.
 *
 * The verdict is a real `listen()` on each of PROBE_HOSTS, never a parse of
 * `netstat` — a listener the tool cannot show is still a listener, and on a
 * machine where the tool is missing a parse reads as "all free". Three
 * addresses because one is not enough on Windows: a socket bound to 127.0.0.1
 * does not stop a bind on 0.0.0.0 and vice versa, and a dual-stack `::` socket
 * shows up in `netstat` as an 0.0.0.0 row it does not actually reserve. Any
 * address that refuses is a conflict for whichever child wanted that address.
 *
 * EADDRINUSE on any of the three is busy. Another error code counts only on the
 * first (loopback) address, where every service either binds or connects: an
 * EACCES there is not "in use", but it is not "and therefore the child will
 * bind it" either. `pid`/`tool` are null when nothing could name the owner,
 * which is information and never permission to continue.
 */
export async function busyPorts(
  ports,
  { hosts = PROBE_HOSTS, probe = probePort, name = namePortOwners } = {},
) {
  const rows = [];
  for (const entry of ports ?? []) {
    const port = Number(entry?.port ?? entry);
    let hit = null;
    for (const host of hosts) {
      const verdict = await probe(port, host);
      if (!verdict.inUse) continue;
      if (verdict.reason === 'EADDRINUSE' || host === hosts[0]) {
        hit = { host, reason: verdict.reason ?? 'in use' };
        break;
      }
    }
    if (!hit) continue;
    rows.push({
      port,
      host: hit.host,
      reason: hit.reason,
      pid: null,
      tool: null,
      service: entry?.service ?? null,
      kind: entry?.kind ?? null,
    });
  }
  if (!rows.length) return [];
  const owners = name(
    rows.map((r) => r.port),
    {},
  );
  for (const row of rows) {
    const owner = owners.get(row.port);
    if (owner) {
      row.pid = owner.pid ?? null;
      row.tool = owner.tool ?? null;
    }
  }
  return rows;
}

/** Which of these ports still has a listener. The teardown assertion. */
export async function portsStillListening(ports, opts) {
  return (await busyPorts(ports, opts)).map((r) => r.port);
}

export function formatBusy(rows) {
  return rows
    .map((r) => {
      const who = r.service ? `${r.service} (${r.kind})` : '';
      const owner = r.pid ? `PID ${r.pid}${r.tool ? ` via ${r.tool}` : ''}` : 'PID unknown';
      return `  ${`${r.host}:${r.port}`.padEnd(22)} ${who.padEnd(30)} ${owner} [${r.reason}]`;
    })
    .join('\n');
}

/**
 * Every PID with a LISTENING socket on `port`, from one `netstat`/`ss`/`lsof` run.
 *
 * `scripts/lib/ports.mjs` answers a different question — one owner per port, to
 * put a name next to a bind that already failed — and stops at the first match.
 * Ownership needs all of them: on Windows two processes can hold 127.0.0.1:P
 * and [::]:P separately, which is the shape of the false pass IN5 found.
 */
export function listenerPidsFrom(text, port, { lsof = false } = {}) {
  const pids = new Set();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (lsof ? !/\(LISTEN\)/.test(line) : !/\bLISTEN(?:ING)?\b/.test(line)) continue;
    const cols = line.trim().split(/\s+/);
    const local = lsof
      ? cols.find((c, i) => i > 1 && /:\d+$/.test(c))
      : cols.find((c) => /:\d+$/.test(c));
    if (!local || Number(/:(\d+)$/.exec(local)[1]) !== Number(port)) continue;
    const pid = lsof
      ? /^\d+$/.test(cols[1])
        ? cols[1]
        : null
      : (/\bpid=(\d+)/.exec(line)?.[1] ??
        /(?:^|\s)(\d+)\/\S+\s*$/.exec(line)?.[1] ??
        /(?:^|\s)(\d+)\s*$/.exec(line)?.[1] ??
        null);
    if (pid) pids.add(Number(pid));
  }
  return [...pids];
}

function listenerPids(port, { platform = process.platform, run = shResult } = {}) {
  for (const tool of OWNER_TOOLS[platform] ?? OWNER_TOOLS.linux) {
    const r = run(tool.command);
    if (r.code !== 0 || !String(r.stdout ?? '').trim()) continue;
    const pids = listenerPidsFrom(r.stdout, port, { lsof: tool.parse === parseLsofOwners });
    if (pids.length) return { pids, tool: tool.command };
  }
  return { pids: [], tool: null };
}

/**
 * Did the child this script spawned bind the socket that answered?
 *
 * `listenerPids` must be non-empty and every one of them must be the child or
 * one of its descendants. Empty means nothing could name the owner of a port
 * something is plainly answering on — which the addendum rules a failure, never
 * a pass: a naming tool that is missing must not read as "the child did it".
 */
export function ownedByChild(listenerPids, childPid, parents = new Map()) {
  if (!listenerPids?.length) return { ok: false, why: 'listening socket has no nameable owner' };
  const inTree = (pid) => {
    const seen = new Set();
    let cur = Number(pid);
    while (cur && !seen.has(cur)) {
      if (cur === Number(childPid)) return true;
      seen.add(cur);
      cur = parents.get(cur) ?? 0;
    }
    return false;
  };
  const foreign = listenerPids.filter((p) => !inTree(p));
  if (!foreign.length) return { ok: true, why: null };
  return {
    ok: false,
    why: `PID ${foreign.join('/')} holds the port, not the child (PID ${childPid}) or a descendant`,
  };
}

/** `pid → ppid` for every process on the box, so descendants can be resolved. */
export function processParents({ platform = process.platform, run = shResult } = {}) {
  const parents = new Map();
  const cmd =
    platform === 'win32'
      ? 'powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | ForEach-Object { \\"$($_.ProcessId),$($_.ParentProcessId)\\" }"'
      : 'ps -eo pid=,ppid=';
  const r = run(cmd);
  if (r.code !== 0) return parents;
  for (const line of String(r.stdout ?? '').split(/\r?\n/)) {
    const m = /^\s*(\d+)[,\s]+(\d+)\s*$/.exec(line);
    if (m) parents.set(Number(m[1]), Number(m[2]));
  }
  return parents;
}

export function hasAddrInUse(text) {
  return /EADDRINUSE|address already in use/i.test(String(text ?? ''));
}

// ── The run ──────────────────────────────────────────────────────────────────

const running = new Set();

function launchSpec(s) {
  const core = s.kind !== 'module-service';
  const cwd = path.join(root, core ? 'apps/api' : s.path);
  const script = core
    ? path.join('dist', 'apps', s.build.nestProject, 'main.js')
    : path.join('dist', 'main.js');
  return { cwd, script };
}

function launch(s, env) {
  const { cwd, script } = launchSpec(s);
  if (!fs.existsSync(path.join(cwd, script))) {
    throw new Error(
      `${s.name}: ${path.join(cwd, script)} is missing — run \`npm run build\` first`,
    );
  }
  const log = fs.openSync(path.join(logDir, `${s.name}.log`), 'w');
  const child = spawn(process.execPath, [script], {
    cwd,
    env,
    stdio: ['ignore', log, log],
    windowsHide: true,
    // Own process group so the non-Windows branch of stop() can take the tree.
    detached: process.platform !== 'win32',
  });
  child.on('exit', () => fs.closeSync(log));
  running.add(child);
  return child;
}

function readLog(name) {
  try {
    return fs.readFileSync(path.join(logDir, `${name}.log`), 'utf8');
  } catch {
    return '';
  }
}

async function probeOnce(s, port) {
  if (s.health.live) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${s.health.live}`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.status === 200 ? 'ok' : `HTTP ${res.status}`;
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1');
    sock.once('connect', () => {
      sock.destroy();
      resolve('ok (tcp)');
    });
    sock.setTimeout(2000, () => {
      sock.destroy();
      resolve(null);
    });
    sock.once('error', () => {
      sock.destroy();
      resolve(null);
    });
  });
}

let parentsCache = null;
function refreshParents() {
  parentsCache = processParents();
  return parentsCache;
}

/** Verify the answer came from our child, refreshing the process table once. */
function verifyOwnership(port, child) {
  const { pids, tool } = listenerPids(port);
  let verdict = ownedByChild(pids, child.pid, parentsCache ?? refreshParents());
  // A child that forked after the map was built looks foreign; rebuild once.
  if (!verdict.ok && pids.length) verdict = ownedByChild(pids, child.pid, refreshParents());
  return { ...verdict, pids, tool };
}

async function waitHealthy(s, child, port, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const ms = () => Date.now() - t0;
    if (hasAddrInUse(readLog(s.name)))
      return { status: 'EADDRINUSE in log', ms: ms(), owner: null };
    if (child.exitCode !== null)
      return { status: `exited ${child.exitCode}`, ms: ms(), owner: null };
    // Any answer ends the wait: `ok`, `ok (tcp)`, or a non-200 status. Nest mounts
    // every route before it listens, so a 404 here is a wrong path, not "not yet".
    const r = await probeOnce(s, port);
    if (r) {
      const elapsed = ms();
      if (!r.startsWith('ok')) return { status: r, ms: elapsed, owner: null };
      const own = verifyOwnership(port, child);
      return {
        status: own.ok ? r : `foreign listener`,
        ms: elapsed,
        owner: own.pids.join('/') || '?',
        why: own.why,
        // A cold boot that answers instantly is the signature of something that
        // was already there. Ownership decides; this only says where to look.
        suspicious: elapsed < 5,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { status: 'timeout', ms: timeoutMs, owner: null };
}

/** Kill the child and everything it spawned. Synchronous, so `exit` can use it. */
function stop(child) {
  running.delete(child);
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    try {
      // /T because a Nest process spawns workers; /F because SIGTERM is not a
      // thing on Windows and `child.kill()` leaves the tree behind.
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* the tree is already gone */
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {
        /* the process is already gone */
      }
    }
  }
}

/** Kill, then wait for Node to reap it, so teardown is not racing the sweep. */
async function stopAndReap(child, ms = 8000) {
  stop(child);
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(sig, () => {
    for (const c of running) stop(c);
    process.exit(130);
  });
}
process.on('exit', () => {
  for (const c of running) stop(c);
});
process.on('uncaughtException', (err) => {
  for (const c of running) stop(c);
  console.error(err);
  process.exit(2);
});
process.on('unhandledRejection', (err) => {
  for (const c of running) stop(c);
  console.error(err);
  process.exit(2);
});

async function main() {
  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 90_000);
  const batchSize = Number(process.env.SMOKE_BATCH ?? 6);
  const offset = Number(process.env.SMOKE_PORT_OFFSET ?? 0);
  if (!Number.isInteger(offset) || offset < 0) {
    console.error(`SMOKE_PORT_OFFSET must be a non-negative integer, got ${offset}`);
    return 2;
  }
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',').filter(Boolean) : null;
  fs.mkdirSync(logDir, { recursive: true });

  const all = nestEntries(loadRegistry(root));
  const entries = all.filter((s) => !only || only.includes(s.name));
  if (only && entries.length !== only.length) {
    console.error(
      `unknown service in --only: ${only.filter((n) => !entries.some((e) => e.name === n)).join(', ')}`,
    );
    return 2;
  }

  let plan;
  let overrides;
  try {
    plan = portPlan(entries, offset);
    overrides = smokeEnvOverrides(all, offset);
  } catch (err) {
    console.error(err.message);
    return 2;
  }
  const childEnv = { ...process.env, ...overrides };
  const httpPortOf = new Map(plan.filter((r) => r.kind === 'http').map((r) => [r.service, r.port]));

  console.log(
    `smoke: ${entries.length} service(s), ${plan.length} port(s), offset ${offset}` +
      (offset ? ` (registry port + ${offset})` : ' (registry ports)'),
  );

  // ── Pre-flight: nothing may be holding a port this run will bind ───────────
  const busy = await busyPorts(plan);
  if (busy.length) {
    const advice = offset
      ? `  Stop whatever holds them, or pick a different offset:\n\n` +
        `      SMOKE_PORT_OFFSET=${offset + 1000} npm run smoke\n`
      : `  Stop whatever holds them (a running \`npm run dev\` fleet holds all of them),\n` +
        `  or run the smoke on an alternate port set:\n\n` +
        `      SMOKE_PORT_OFFSET=10000 npm run smoke\n`;
    console.error(
      `\n✗ ${busy.length} of ${plan.length} port(s) are already in use — refusing to start.\n` +
        `  The smoke does not kill processes it did not start.\n\n${formatBusy(busy)}\n\n${advice}`,
    );
    return 2;
  }
  console.log('pre-flight: every port is free');

  const results = [];
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const children = [];
    try {
      for (const s of batch) children.push([s, launch(s, childEnv)]);
    } catch (err) {
      for (const [, c] of children) await stopAndReap(c);
      console.error(`\n${err.message}`);
      return 1;
    }
    console.log(`booting ${batch.map((s, n) => `${s.name}(pid ${children[n][1].pid})`).join(' ')}`);
    const settled = await Promise.all(
      children.map(async ([s, c]) => {
        const r = await waitHealthy(s, c, httpPortOf.get(s.name), timeoutMs);
        return [s, { ...r, pid: c.pid }];
      }),
    );
    for (const [s, c] of children) {
      if (!(await stopAndReap(c))) console.error(`  ! ${s.name} (pid ${c.pid}) did not exit`);
    }
    results.push(...settled);
    await new Promise((r) => setTimeout(r, 500));
  }

  const pad = (v, n) => String(v).padEnd(n);
  console.log(
    `\n${pad('service', 24)} ${pad('port', 6)} ${pad('pid', 7)} ${pad('probe', 26)} ${pad('result', 18)} time`,
  );
  let failed = 0;
  for (const [s, r] of results) {
    const ok = r.status.startsWith('ok');
    if (!ok) failed++;
    const note = ok
      ? r.suspicious
        ? '   (answered in <5ms — owner verified)'
        : ''
      : `   → tests/smoke/logs/${s.name}.log${r.why ? ` — ${r.why}` : ''}`;
    console.log(
      `${pad(s.name, 24)} ${pad(httpPortOf.get(s.name), 6)} ${pad(r.pid ?? '-', 7)} ` +
        `${pad(s.health.live ?? '(tcp connect)', 26)} ${pad(ok ? r.status : `FAIL ${r.status}`, 18)} ` +
        `${(r.ms / 1000).toFixed(1)}s${note}`,
    );
  }
  console.log(`\n${results.length - failed}/${results.length} healthy`);

  // ── Teardown assertion ────────────────────────────────────────────────────
  // Leftover listeners are the failure mode this script has had all along: a run
  // that reports 26/26 and leaves 26 Node processes bound means the next run
  // measures the previous one. Give the OS a moment to release the sockets, then
  // assert over every port of every service that ran — http, tcp and gRPC, not
  // just http — and name the PID so it can be dealt with.
  await new Promise((r) => setTimeout(r, 1500));
  const leftover = await busyPorts(plan);
  if (leftover.length) {
    console.error(
      `\n✗ ${leftover.length} port(s) still listening after teardown:\n\n${formatBusy(leftover)}\n\n` +
        `  Windows: taskkill /PID <pid> /T /F      elsewhere: kill -9 <pid>`,
    );
    return 1;
  }
  console.log('no leftover listeners');
  return failed ? 1 : 0;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) process.exit(await main());
