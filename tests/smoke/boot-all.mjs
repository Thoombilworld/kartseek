#!/usr/bin/env node
/**
 * Boot every Nest deployable from its built output and probe its health.
 *
 *   npm run build                # once — this script runs dist/, it does not compile
 *   npm run infra:up             # Postgres, Redis, Kafka, MongoDB must be reachable
 *   npm run smoke                # all 26
 *   npm run smoke -- --only=order-service,marketplace-service
 *
 * Services start in batches (SMOKE_BATCH, default 6) so a laptop is not asked
 * for 26 Node processes at once — under contention a healthy service looks
 * like a broken one. Each is given SMOKE_TIMEOUT_MS (default 90000) to answer
 * its registry `health.live` route with 200; a service with no HTTP health
 * route yet (live: null) passes when its HTTP port accepts a TCP connection,
 * which is what the Kubernetes probes do for it today. Every service's stdout
 * and stderr go to tests/smoke/logs/<name>.log. Exit 1 if any service fails.
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { loadRegistry, repoRoot, nestEntries } from '../../scripts/registry/lib.mjs';

const root = repoRoot();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 90_000);
const BATCH = Number(process.env.SMOKE_BATCH ?? 6);
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').filter(Boolean) : null;
const logDir = path.join(root, 'tests/smoke/logs');
fs.mkdirSync(logDir, { recursive: true });

const running = new Set();

function launchSpec(s) {
  const core = s.kind !== 'module-service';
  const cwd = path.join(root, core ? 'apps/api' : s.path);
  const script = core
    ? path.join('dist', 'apps', s.build.nestProject, 'main.js')
    : path.join('dist', 'main.js');
  return { cwd, script };
}

function launch(s) {
  const { cwd, script } = launchSpec(s);
  if (!fs.existsSync(path.join(cwd, script))) {
    throw new Error(
      `${s.name}: ${path.join(cwd, script)} is missing — run \`npm run build\` first`,
    );
  }
  const log = fs.openSync(path.join(logDir, `${s.name}.log`), 'w');
  const child = spawn(process.execPath, [script], {
    cwd,
    env: process.env,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  child.on('exit', () => fs.closeSync(log));
  running.add(child);
  return child;
}

async function probeOnce(s) {
  if (s.health.live) {
    try {
      const res = await fetch(`http://127.0.0.1:${s.ports.http}${s.health.live}`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.status === 200 ? 'ok' : `HTTP ${res.status}`;
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    const sock = net.connect(s.ports.http, '127.0.0.1');
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

async function waitHealthy(s, child) {
  const t0 = Date.now();
  while (Date.now() - t0 < TIMEOUT_MS) {
    if (child.exitCode !== null) return { status: `exited ${child.exitCode}`, ms: Date.now() - t0 };
    // Any answer ends the wait: `ok`, `ok (tcp)`, or a non-200 status. Nest mounts
    // every route before it listens, so a 404 here is a wrong path, not "not yet".
    const r = await probeOnce(s);
    if (r) return { status: r, ms: Date.now() - t0 };
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { status: 'timeout', ms: TIMEOUT_MS };
}

function stop(child) {
  running.delete(child);
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch { /* the process tree is already gone */ }
  } else {
    try {
      child.kill('SIGTERM');
    } catch { /* the process is already gone */ }
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const c of running) stop(c);
    process.exit(130);
  });
}

const entries = nestEntries(loadRegistry(root)).filter((s) => !only || only.includes(s.name));
if (only && entries.length !== only.length) {
  console.error(
    `unknown service in --only: ${only.filter((n) => !entries.some((e) => e.name === n)).join(', ')}`,
  );
  process.exit(2);
}

const results = [];
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  const children = [];
  try {
    for (const s of batch) children.push([s, launch(s)]);
  } catch (err) {
    for (const [, c] of children) stop(c);
    console.error(`\n${err.message}`);
    process.exit(1);
  }
  const settled = await Promise.all(children.map(async ([s, c]) => [s, await waitHealthy(s, c)]));
  for (const [, c] of children) stop(c);
  results.push(...settled);
  await new Promise((r) => setTimeout(r, 500));
}

const pad = (v, n) => String(v).padEnd(n);
console.log(
  `\n${pad('service', 24)} ${pad('port', 6)} ${pad('probe', 26)} ${pad('result', 14)} time`,
);
let failed = 0;
for (const [s, r] of results) {
  const ok = r.status.startsWith('ok');
  if (!ok) failed++;
  console.log(
    `${pad(s.name, 24)} ${pad(s.ports.http, 6)} ${pad(s.health.live ?? '(tcp connect)', 26)} ${pad(ok ? r.status : `FAIL ${r.status}`, 14)} ${(r.ms / 1000).toFixed(1)}s${ok ? '' : `   → tests/smoke/logs/${s.name}.log`}`,
  );
}
console.log(`\n${results.length - failed}/${results.length} healthy`);
process.exit(failed ? 1 : 0);
