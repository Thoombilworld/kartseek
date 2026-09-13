#!/usr/bin/env node
/**
 * Clean-start validation for the containerised stack.
 *
 *   npm run stack:validate                    # the admin profile (12 containers)
 *   npm run stack:validate -- --profile full  # all 35
 *   npm run stack:validate -- --skip-build    # reuse the images already built
 *   npm run stack:validate -- --keep          # leave the application tier up
 *   npm run stack:validate -- --json          # the results array instead of the table
 *
 * Exit 0 when every check passed, 1 when one failed, 2 when the run could not
 * be set up at all (no root .env, a Compose too old, `up` refused).
 *
 * ── What it refuses to accept as evidence, deliberately ─────────────────────
 *
 *   - a container marked (healthy): `pg_isready` proves a listener, not a
 *     usable database, and a Next container answering `/` proves nothing about
 *     `/admin`;
 *   - an HTTP 200 from a liveness route: that is a constant;
 *   - a PONG that came from the in-process Redis emulator;
 *   - a readiness board that simply omits a dependency: the registry says what
 *     each service owns, and a key that is missing from the board is reported
 *     as UNCHECKED, never as a pass;
 *   - an answer on `127.0.0.1:<port>` that nothing ties to the container the row
 *     is named after. Every published port must be FREE before `up` (a host dev
 *     fleet on 3001 would otherwise answer every probe in this file), and every
 *     host probe is cross-checked against the same route run INSIDE the
 *     container.
 *
 * Every check below either runs a query, reads a body, reads a log, or says in
 * the table that it did not. A row can be `~ skipped` with a reason; it can
 * never be a silent pass.
 *
 * The application tier is removed in a `finally`, so a throw anywhere after
 * `up` cannot leave twelve containers behind for the next run to inherit.
 *
 * ── What it does NOT check, and why ─────────────────────────────────────────
 *
 * The edge. `infra/nginx/nginx.conf` still upstreams `host.docker.internal`,
 * so a request through nginx reaches the developer's own dev fleet rather than
 * `api-gateway`. That is Task IN11's to change; until then this validator
 * probes the gateway on 127.0.0.1:3001 and the console on 127.0.0.1:3000
 * directly, and prints a skipped row saying so.
 *
 * ── It never edits the developer's environment ──────────────────────────────
 *
 * A missing key in the root `.env` is exit 2 naming `npm run env:init`. The
 * one thing this script writes is `.build-logs/stack-up-<profile>.log`.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, repoRoot, NEST_KINDS } from '../registry/lib.mjs';
import { portsInUse } from '../lib/ports.mjs';
import { downArgs } from './down.mjs';

// ════════════════════════════════════════════════════════════════════════════
// The pure parts — everything below this block is I/O around them.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Host addressing baked into an image. The 9092 listener advertises
 * `localhost:9092`, so a container that bootstraps there is answered with
 * metadata naming its own loopback — `kafka:29092` is the only right answer
 * inside the network (IN6 scope addition 1).
 */
const HOST_ADDRESSING = /(?:localhost|127\.0\.0\.1|::1):9092/;

/**
 * A line that means this process will not serve, whatever else the log says.
 *
 * `Unable to connect to the database` is deliberately NOT here: TypeORM logs it
 * once per retry and the module recovers, so it is an error to report, not a
 * verdict on the process. The fatal form of the same fault is the
 * `UnknownDependenciesException` Nest throws when the retries run out.
 */
const FATAL = [
  /UnknownDependenciesException/,
  /Nest can't resolve dependencies/,
  /EADDRINUSE/,
  /ECONNREFUSED/,
  /Config validation error/,
  /ValidationError:.*is required/,
  /password authentication failed/,
  HOST_ADDRESSING,
];

/**
 * A line that means something is broken, even though the process is up.
 * Schema drift, a missing grant, a cache that is not there.
 */
const ERROR = [
  /\bERROR\b/,
  /\bFATAL\b/,
  /QueryFailedError/,
  /Unhandled(?:PromiseRejection)?/,
  /Unable to connect to the database/,
  /permission denied for/,
  // Postgres quotes the identifier; TypeORM's own message does not
  // (`column Product.mrp does not exist`), so both spellings are matched.
  /(?:relation|column|table|type|function) (?:"[^"]+"|[A-Za-z_][\w.$]*) does not exist/,
  /RedisUnavailableError|REDIS_UNAVAILABLE/,
];

/**
 * The lines every healthy boot prints. Checked AFTER `FATAL` on purpose: a
 * fatal line that happens to carry a 404 must not be dismissed as traffic.
 */
const NOISE = [/RouterExplorer/, /InstanceLoader/, /NestFactory/, /ThrottlerGuard/, /\b40[34]\b/];

/**
 * The three variables whose *value* is legitimately a loopback address.
 *
 * IN6's hand-off: `APP_BIND`, `DB_BIND` and `NGINX_BIND` reach all 26 Nest
 * containers from `apps/api/.env` and are harmless — they name the HOST side of
 * a port publish, where loopback is the safe default. A container that prints
 * its own environment at boot would otherwise be reported as host addressing
 * leaked into an image, which is the opposite of what those variables mean.
 */
const BIND_VARS = /\b(?:APP_BIND|DB_BIND|NGINX_BIND)\b/;

export function classifyLogLine(line) {
  for (const r of FATAL) {
    if (!r.test(line)) continue;
    // The host-addressing rule is the only FATAL entry a BIND variable can trip.
    if (r === HOST_ADDRESSING && BIND_VARS.test(line)) continue;
    return 'fatal';
  }
  if (NOISE.some((r) => r.test(line))) return null;
  if (ERROR.some((r) => r.test(line))) return 'error';
  return null;
}

/**
 * The table, the counts and the exit code.
 *
 * Three outcomes, not two. `skipped` is for a check this run could not make —
 * the edge proxy, a dependency the service's own board does not carry — and it
 * must arrive with a reason. Counting one as a pass is exactly the silence this
 * validator exists to remove; counting it as a failure would make the honest
 * answer indistinguishable from a broken stack.
 */
export function summarise(results) {
  const failed = results.filter((r) => !r.ok && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  const passed = results.filter((r) => r.ok && !r.skipped);
  const mark = (r) => (r.skipped ? '~' : r.ok ? '✓' : '✗');
  const report = results
    .map((r) => `  ${mark(r)} ${r.name}${r.detail ? `   ${r.detail}` : ''}`)
    .join('\n');
  return {
    code: failed.length ? 1 : 0,
    report,
    failed: failed.length,
    skipped: skipped.length,
    passed: passed.length,
    total: results.length,
  };
}

const PROFILES = ['admin', 'full'];

/**
 * `--profile admin|full`, `--profile=full`, `--skip-build`, `--keep`, `--json`.
 *
 * A `--profile` with no value, or one this stack does not have, throws rather
 * than falling back to `admin`: a narrowing flag that quietly widens is how a
 * run reports on twelve containers and claims thirty-five.
 */
export function parseArgs(argv) {
  const out = { profile: 'admin', skipBuild: false, keep: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--skip-build') out.skipBuild = true;
    else if (a === '--keep') out.keep = true;
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--profile=')) out.profile = a.slice('--profile='.length);
    else if (a === '--profile') {
      out.profile = argv[i + 1] ?? '';
      i += 1;
    } else throw new Error(`unknown argument ${a}`);
  }
  if (!PROFILES.includes(out.profile))
    throw new Error(
      `--profile needs one of ${PROFILES.join(', ')} (got ${out.profile || '<none>'})`,
    );
  return out;
}

/**
 * Is this Compose new enough for `env_file: [{ path, required }]`?
 *
 * Compared as numbers. This machine runs v5.5.0, and `'5.5.0' >= '2.24'` is
 * false as text — a string compare would have refused to run on the only
 * version anybody here has.
 */
export function composeVersionAtLeast(text, [wantMajor, wantMinor]) {
  const m = /v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(text ?? ''));
  if (!m) return false;
  const [major, minor] = [Number(m[1]), Number(m[2])];
  return major > wantMajor || (major === wantMajor && minor >= wantMinor);
}

/**
 * Every `${VAR}` in a Compose file that has no default — the keys the root
 * `.env` must carry for `up` to be possible at all.
 *
 * `${VAR:-fallback}` is excluded because Compose supplies the fallback;
 * `${VAR}` and `${VAR:?message}` are not, and an empty value counts as absent
 * for both (`:?` fires on unset OR empty).
 *
 * Full-line comments are dropped first. Both compose files document the rule
 * they follow — "every credential below is `${VAR:?…}`, never `${VAR:-a
 * default}`" — and reading those literally added `VAR` and `DB_BIND` to the
 * required set, so a developer with a perfectly good `.env` would have been
 * told to run `env:init` for a variable that does not exist.
 */
export function requiredComposeVars(text) {
  const found = new Set();
  const body = String(text ?? '')
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
  const re = /\$\{([A-Z_][A-Z0-9_]*)(:-|:\?|-|\?)?[^}]*\}/g;
  let m;
  while ((m = re.exec(body))) if (!m[2] || m[2] === ':?' || m[2] === '?') found.add(m[1]);
  return [...found].sort();
}

/** Which of `keys` the environment does not actually supply. Blank is absent. */
export function missingEnvKeys(keys, env) {
  return keys.filter((k) => !String(env[k] ?? '').trim());
}

/**
 * How a registry dependency is spelled on a readiness board.
 *
 * The gateway has its own health controller and calls Postgres `postgresql`;
 * the other 25 share `@app/common`'s, which calls it `database`.
 */
const DEPENDENCY_KEY = {
  postgres: 'database',
  redis: 'redis',
  mongodb: 'mongodb',
  elasticsearch: 'elasticsearch',
  kafka: 'kafka',
};

export function expectedBoardKeys(entry) {
  const dbKey = entry.kind === 'gateway' ? 'postgresql' : 'database';
  const keys = [];
  if (entry.database) keys.push(dbKey);
  for (const d of entry.dependsOn ?? []) {
    const k = d === 'postgres' ? dbKey : DEPENDENCY_KEY[d];
    // A service that lists `postgres` but owns no database in the registry is
    // not owed a database check — `dependsOn` is start ordering, `database` is
    // ownership.
    if (!k || keys.includes(k)) continue;
    if (k === dbKey && !entry.database) continue;
    keys.push(k);
  }
  return keys;
}

/** One dependency's verdict, whichever of the two wire shapes carried it. */
const stateOf = (v) => (typeof v === 'string' ? v : (v?.status ?? null));

/**
 * The readiness board itself, out of whatever the service wrapped it in.
 *
 * The gateway runs a global response interceptor, so its `/health/ready` comes
 * back as `{ success, data: { status, checks }, timestamp }`; the other 25 use
 * `@app/common`'s controller with no interceptor and answer the board directly.
 * Reading `json.checks` without this saw an absent board on the one service
 * whose board is the most detailed — and called it a failure while the stack
 * was fine.
 */
export function unwrapEnvelope(json, key) {
  if (!json || typeof json !== 'object') return null;
  if (json[key] !== undefined) return json;
  if (json.data && typeof json.data === 'object' && json.data[key] !== undefined) return json.data;
  return null;
}

export const readinessBody = (json) => unwrapEnvelope(json, 'checks');
/** The liveness board, which every deployable answers with `service` on it. */
export const livenessBody = (json) => unwrapEnvelope(json, 'service');

/**
 * Every port the selected profile publishes on the host, from the registry.
 *
 * The renderer publishes every entry in `ports` (`http`, `tcp`, `grpc`) as
 * `${APP_BIND:-127.0.0.1}:<p>:<p>`, so this is the exact set that must be free
 * before `docker compose up` can bind them.
 */
export function publishedPorts(entries) {
  const rows = [];
  for (const s of entries)
    for (const p of Object.values(s.ports ?? {})) rows.push({ port: p, service: s.name });
  return rows.sort((a, b) => a.port - b.port);
}

/**
 * Is the process answering on the host port the one inside the container?
 *
 * The review's finding: nothing tied a `127.0.0.1:<port>` answer to the
 * container the row was named after. So every host probe is now paired with
 * `docker exec <container> wget -qO- http://127.0.0.1:<port><health.live>` and
 * the two bodies compared.
 *
 * The ruling's preferred discriminators are `pid` then `startedAt` then the
 * container hostname. **This platform's liveness board carries none of them**,
 * and adding one is an application change to a deliberately anonymous route
 * (`health.types.ts` reasons explicitly about what an unauthenticated caller may
 * see — AUD2-072), so it is not this task's to make. The fallback used instead
 * is stronger than a hostname would be, not weaker:
 *
 *   • `service`, `nodeVersion` and `environment` must match between the two
 *     bodies — `environment` alone separates a container (`production`, pinned
 *     by the renderer) from a host dev fleet (`development`), which is the exact
 *     misattribution the finding describes;
 *   • the host body's `uptime` must be consistent with the CONTAINER's own
 *     `State.StartedAt`. A process cannot have been running longer than the
 *     container that holds it, and a host fleet started at any other time fails
 *     this outright.
 *
 * A row that cannot be evaluated at all is `unverifiable` and FAILS. It never
 * passes by default.
 */
export function sameProcess(
  hostBody,
  containerBody,
  { containerAgeSeconds, bootGrace = 180 } = {},
) {
  if (!hostBody) return { ok: false, basis: 'unverifiable', detail: 'no body from the host port' };
  if (!containerBody)
    return { ok: false, basis: 'unverifiable', detail: 'no body from inside the container' };
  for (const field of ['pid', 'startedAt', 'hostname']) {
    if (hostBody[field] === undefined || containerBody[field] === undefined) continue;
    return {
      ok: String(hostBody[field]) === String(containerBody[field]),
      basis: field,
      detail: `host ${field}=${hostBody[field]} container ${field}=${containerBody[field]}`,
    };
  }
  const mismatched = ['service', 'nodeVersion', 'environment'].filter(
    (f) => String(hostBody[f] ?? '') !== String(containerBody[f] ?? ''),
  );
  if (mismatched.length)
    return {
      ok: false,
      basis: 'identity fields',
      detail: mismatched
        .map((f) => `${f}: host "${hostBody[f] ?? ''}" vs container "${containerBody[f] ?? ''}"`)
        .join('; '),
    };
  const uptime = Number(hostBody.uptime);
  if (!Number.isFinite(uptime) || !Number.isFinite(Number(containerAgeSeconds)))
    return {
      ok: false,
      basis: 'unverifiable',
      detail: 'the board carries no uptime and no pid/startedAt/hostname to compare',
    };
  const age = Number(containerAgeSeconds);
  const slack = age - uptime;
  return {
    ok: slack >= -5 && slack <= bootGrace,
    basis: 'uptime vs container age',
    detail: `uptime ${uptime}s against a container ${age}s old`,
  };
}

/**
 * `CONFIG GET <name>` answers two lines — the name, then the value. Accepts
 * only a value in `allowed`, so a policy nobody thought of (`allkeys-lfu`,
 * `allkeys-random`) fails instead of slipping past a one-string blacklist.
 */
export function redisConfigVerdict(name, raw, allowed) {
  const lines = String(raw ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const at = lines.indexOf(name);
  const value = at >= 0 ? (lines[at + 1] ?? '') : '';
  return { ok: allowed.includes(value), value, detail: value || 'no value returned' };
}

/**
 * What Compose said it did with each image, read from the `up` log rather than
 * inferred from the flag. `skipBuild ? 'reused' : 'built'` printed "built" for
 * twelve images on a run that rebuilt one.
 */
export function imageVerdicts(logText) {
  const out = new Map();
  const re = /Image\s+kartseek\/([a-z0-9-]+):\S+\s+(\w+)/g;
  let m;
  while ((m = re.exec(String(logText ?? '')))) out.set(m[1], m[2].toLowerCase());
  return out;
}

/**
 * Run the whole stack sequence and tear the application tier down afterwards,
 * on every path — a returned exit code, a thrown exception, anything.
 *
 * The review's finding 1: the teardown sat at the end of a linear `main()`, so
 * any throw after `up` left twelve containers running and the next run inherited
 * them.
 *
 * A teardown failure is reported and can FAIL a run that otherwise passed, but
 * it can never overwrite a 1 or a 2 with a 0 — "reported, never masks".
 */
export async function withTeardown({ phases, teardown, keep = false }) {
  const outcome = {
    runCode: 2,
    code: 2,
    error: null,
    teardown: { ran: false, ok: null, detail: '' },
  };
  try {
    outcome.runCode = await phases();
  } catch (err) {
    outcome.error = err;
    outcome.runCode = 2;
  } finally {
    if (keep) {
      outcome.teardown.detail = '--keep was given';
    } else {
      outcome.teardown.ran = true;
      try {
        const r = await teardown();
        outcome.teardown.ok = r?.ok !== false;
        outcome.teardown.detail = r?.detail ?? '';
      } catch (err) {
        outcome.teardown.ok = false;
        outcome.teardown.detail = err?.message ?? String(err);
      }
    }
  }
  outcome.code = outcome.runCode !== 0 ? outcome.runCode : outcome.teardown.ok === false ? 1 : 0;
  return outcome;
}

/**
 * Does this service's own readiness board prove what the registry says it owns?
 *
 * A key the board does not carry is `unchecked`, reported by name. Kafka is the
 * usual one: `@app/common`'s health module has no broker check, so a Kafka
 * dependency is proved by the service's log ("Consumer has joined the group")
 * and by the gateway's own board, not here.
 */
export function boardVerdict(entry, json) {
  const expected = expectedBoardKeys(entry);
  const body = readinessBody(json);
  if (!body)
    return { ok: false, unchecked: expected, detail: 'no readiness board in the response' };
  const checks = body.checks;
  const unchecked = expected.filter((k) => !(k in checks));
  const bad = expected
    .filter((k) => k in checks && stateOf(checks[k]) !== 'up')
    .map((k) => `${k}=${stateOf(checks[k])}`);
  // The emulator has answered `up` before now. `emulated` is the one field a
  // PONG cannot fake, and it only appears on a staff board.
  const emulated = Object.entries(checks)
    .filter(([, v]) => v && typeof v === 'object' && v.emulated === true)
    .map(([k]) => k);
  const detail = [
    bad.length ? bad.join(' ') : '',
    emulated.length ? `${emulated.join(',')} answered from the in-process emulator` : '',
    body.status && body.status !== 'ready' ? `status=${body.status}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  return { ok: bad.length === 0 && emulated.length === 0, unchecked, detail };
}

/**
 * The Postgres role this service is supposed to be holding.
 *
 * A module connects as its own login (IN4's `init-roles.sh`); the gateway and
 * the core services are the platform owner. `null` means the registry gives it
 * no database, so there should be no connection to attribute at all.
 */
export function expectedRole(entry, env) {
  if (!entry.database) return null;
  if (entry.kind === 'module-service') {
    const prefix = entry.database.envPrefix;
    return env[`${prefix}_USER`] || `${prefix.replace(/_DB$/, '').toLowerCase()}_user`;
  }
  return env.POSTGRES_USER || 'postgres';
}

/** One line from `verify:schema-drift --json`, and whether it is a pass. */
export function driftCensus(parsed) {
  const reports = parsed?.reports ?? [];
  const tables = reports.reduce((n, r) => n + (r.tables ?? 0), 0);
  const findings = reports.reduce((n, r) => n + (r.findings?.length ?? 0), 0);
  const unreachable = reports.filter((r) => r.error).length;
  return {
    ok: reports.length > 0 && findings === 0 && unreachable === 0,
    line:
      `${reports.length} module(s), ${tables} table(s), ` +
      `${findings} finding(s), ${unreachable} unreachable`,
    findings,
    unreachable,
    /** `<role>@<host>:<port>/<database>`, one per module — who it actually asked. */
    targets: reports.map((r) => String(r.target ?? '')),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// The run.
// ════════════════════════════════════════════════════════════════════════════

const root = repoRoot();
const MIN_COMPOSE = [2, 24];
/** Kafka alone can take 60s from cold, and six images build before it matters. */
const HEALTH_DEADLINE_MS = 12 * 60 * 1000;
const BUILD_TIMEOUT_MS = 90 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `docker …`, never through a shell.
 *
 * `execFileSync` with an argv array is what keeps a Redis password and a psql
 * statement out of a command line Git Bash would rewrite — MSYS turns a
 * `/opt/kafka/bin/...` argument into a Windows path when a shell is involved.
 */
function docker(args, opts = {}) {
  return execFileSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 128 * 1024 * 1024,
    ...opts,
  });
}

function tryDocker(args, opts = {}) {
  try {
    return { ok: true, out: docker(args, opts) };
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    return { ok: false, out: out || err.message };
  }
}

/** `npm run …`. Needs a shell on Windows: npm is a .cmd, which spawn refuses. */
function npm(args, opts = {}) {
  const r = spawnSync(`npm ${args.join(' ')}`, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 128 * 1024 * 1024,
    ...opts,
  });
  return { status: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** The root `.env` as Compose reads it: this file and no other. */
function readRootEnv() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return null;
  const env = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function composePs() {
  const r = tryDocker([
    'compose',
    '--profile',
    'admin',
    '--profile',
    'full',
    'ps',
    '--format',
    'json',
  ]);
  if (!r.ok) return [];
  const text = r.out.trim();
  if (!text) return [];
  try {
    const asArray = JSON.parse(text);
    if (Array.isArray(asArray)) return asArray;
  } catch {
    /* NDJSON, one object per line — which is what Compose v2+ emits */
  }
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
}

const containerName = (service) => `kartseek-${service}`;

function healthOf(name) {
  const r = tryDocker([
    'inspect',
    '-f',
    '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',
    name,
  ]);
  return r.ok ? r.out.trim() : 'absent';
}

async function get(url, { timeout = 15000, headers = {} } = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON — the body text is what we wanted */
    }
    return { status: res.status, text, json };
  } catch (err) {
    return { status: 0, text: '', json: null, error: err.message };
  }
}

async function postJson(url, body, headers = {}) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* keep the text */
    }
    return { status: res.status, text, json };
  } catch (err) {
    return { status: 0, text: '', json: null, error: err.message };
  }
}

const GATEWAY = 'http://127.0.0.1:3001/api/v1';

/**
 * Sign in as staff, through the containerised gateway, completing the second
 * factor the way an operator would.
 *
 * The images run `NODE_ENV=production`, and `StaffMfaService.echoAllowed()`
 * vetoes `devCode` there — correctly. So the six-digit code is read out of
 * Redis (`mfa:<userId>`, where the service just wrote it) rather than weakening
 * the veto to make a test convenient.
 */
async function staffLogin(email, password, redisPassword) {
  const login = await postJson(`${GATEWAY}/auth/login`, { email, password });
  if (login.status !== 200)
    return { error: `login HTTP ${login.status} ${login.text.slice(0, 160)}` };
  const body = login.json ?? {};
  if (body.accessToken) return { token: body.accessToken, user: body.user };
  if (!body.requires2FA || !body.challengeToken)
    return { error: `no token and no challenge: ${JSON.stringify(body).slice(0, 160)}` };
  const userId = body.user?.id;
  if (!userId) return { error: 'the challenge response carried no user id to key Redis on' };
  let code = body.devCode;
  if (!code) {
    const r = tryDocker([
      'exec',
      'kartseek-redis',
      'redis-cli',
      '-a',
      redisPassword,
      '--no-auth-warning',
      'get',
      `mfa:${userId}`,
    ]);
    if (!r.ok) return { error: `could not read mfa:${userId} from redis — ${r.out.slice(0, 160)}` };
    try {
      code = JSON.parse(r.out.trim()).code;
    } catch {
      return { error: `mfa:${userId} is not the JSON the service writes` };
    }
  }
  const verify = await postJson(`${GATEWAY}/auth/mfa/verify`, {
    challengeToken: body.challengeToken,
    code,
  });
  if (verify.status !== 200 || !verify.json?.accessToken)
    return { error: `mfa/verify HTTP ${verify.status} ${verify.text.slice(0, 160)}` };
  return { token: verify.json.accessToken, user: verify.json.user };
}

async function main() {
  const started = Date.now();
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(2);
  }
  const { profile, skipBuild, keep, json } = args;

  const results = [];
  /**
   * `failDetail` is what went wrong; `passDetail` is what was measured. Kept
   * apart because one detail for both reads as a lie when the check passes —
   * the first run printed "✓ the console rendered the sign-in form   59941
   * bytes and no password field" over a page that had one.
   */
  const ok = (name, cond, failDetail = '', passDetail = '') =>
    results.push({ name, ok: !!cond, detail: cond ? passDetail : failDetail });
  /**
   * `ok: null`, not `false`. `summarise()` already tells the three apart, but a
   * `--json` consumer filtering on `ok === false` counted the nine honest skips
   * as nine failures.
   */
  const skip = (name, reason) => results.push({ name, ok: null, skipped: true, detail: reason });
  const fatal = (message) => {
    console.error(`✗ ${message}`);
    process.exit(2);
  };
  /** Progress goes to stderr under `--json`, so `… --json | jq` is parseable. */
  const say = (message) => (json ? console.error(message) : console.log(message));

  // ── 0. Setup. Nothing here is a check; all of it is exit 2. ───────────────
  const version = tryDocker(['compose', 'version']);
  if (!composeVersionAtLeast(version.out, MIN_COMPOSE))
    fatal(
      `docker compose ${MIN_COMPOSE.join('.')} or newer is required for the env_file long ` +
        `syntax — this is "${version.out.trim() || 'not installed'}"`,
    );

  const env = readRootEnv();
  if (!env)
    fatal('no root .env — run `npm run env:init`; it is the only .env docker compose reads');

  const composeText = ['compose.services.yml', 'compose.infra.yml']
    .map((f) => fs.readFileSync(path.join(root, 'infra', 'docker', f), 'utf8'))
    .join('\n');
  const missing = missingEnvKeys(requiredComposeVars(composeText), env);
  if (missing.length)
    fatal(
      `the root .env is missing ${missing.length} key(s) the compose files have no default ` +
        `for: ${missing.join(', ')} — run \`npm run env:init\`, which fills them without ` +
        `touching anything you have already set`,
    );

  const reg = loadRegistry(root);
  const inProfile = reg.services.filter(
    (s) => profile === 'full' || (s.profiles ?? []).includes('admin'),
  );
  const nest = inProfile.filter((s) => NEST_KINDS.includes(s.kind));

  say(
    `validate: ${profile} profile — ${inProfile.length} application containers, ` +
      `${version.out.trim()}`,
  );
  say(
    'validate: the gateway is probed on 127.0.0.1:3001 and the console on 127.0.0.1:3000, ' +
      'NOT through nginx — infra/nginx/nginx.conf still upstreams host.docker.internal (IN11).',
  );

  const config = tryDocker(['compose', '--profile', profile, 'config', '--quiet']);
  if (!config.ok) fatal(`docker compose config failed:\n${config.out.slice(0, 2000)}`);
  ok('compose configuration resolves', true, '', `${profile} profile`);

  // ── 0b. Nothing of ours may already hold a published port ─────────────────
  //
  // Remove any application tier left by a previous run FIRST (this only ever
  // names the 35 registry services — `down.mjs` refuses an infra name), then
  // check the ports. Anything still listening after that is foreign: a host dev
  // fleet, most often. It is not killed and it is not worked around — the run
  // stops, because `compose up` could not have bound the port and every later
  // probe to `127.0.0.1:<port>` would have been answered by that process while
  // the row said the name of a container.
  //
  // The verdict is a real bind on the address compose publishes on, from
  // `scripts/lib/ports.mjs` — not a `netstat` grep. The first version of this
  // check shelled out, threw the exit status away, and read "no LISTENING rows"
  // as "every port free"; on Debian 12, Ubuntu 22.04+, Fedora (no net-tools) and
  // macOS (BSD netstat rejects -tlnp) that was a silent pass in the check added
  // to remove silent passes, invisible from Windows where netstat is built in.
  // The shell tools now only put a PID next to a port the bind already refused,
  // and a missing tool costs a name, never the refusal.
  say('validate: removing any application tier left from a previous run…');
  tryDocker(downArgs(reg));
  const wantPorts = publishedPorts(inProfile);
  const bindHost = env.APP_BIND || '127.0.0.1';
  let busy = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    busy = await portsInUse(wantPorts, { host: bindHost });
    if (!busy.length) break;
    // docker-proxy can hold a port for a moment after `rm`; a real foreign
    // listener will still be there on the third look.
    await sleep(2000);
  }
  if (busy.length)
    fatal(
      `${busy.length} of the ${wantPorts.length} port(s) this profile publishes are already in ` +
        `use, so compose could not bind them and every probe would answer from the wrong ` +
        `process:\n` +
        busy
          .map(
            (b) =>
              `    ${bindHost}:${b.port} (${b.service ?? 'unknown service'}) held by PID ` +
              `${b.pid ?? 'unknown'}${b.tool ? ` — per ${b.tool}` : ' — no tool on this machine could name it'}` +
              `${b.reason && b.reason !== 'EADDRINUSE' ? ` [${b.reason}]` : ''}`,
          )
          .join('\n') +
        `\n  Stop that process yourself — this script will not kill it.` +
        (process.platform === 'win32' && busy[0].pid
          ? ` On Windows: tasklist /FI "PID eq ${busy[0].pid}".`
          : ''),
    );
  ok(
    'every published port of the profile is free on the host',
    true,
    '',
    `${wantPorts.length} port(s) bind-tested on ${bindHost}`,
  );

  const logDir = path.join(root, '.build-logs');
  const upLog = path.join(logDir, `stack-up-${profile}.log`);
  const boards = new Map();
  const state = new Map();
  const roleOf = new Map();
  const logVerdict = new Map();
  let images = new Map();
  let census = { ok: false, line: 'verify:schema-drift did not run', findings: 0 };
  let nameOf = (s) => containerName(s.name);

  /**
   * Everything from `infra:up` to the log scan. Returns the exit code the run
   * itself earned; `withTeardown` removes the application tier afterwards on
   * every path, including a throw.
   */
  const phases = async () => {
    // ── 1. Order of operations: infra first, because it makes the topics ──────
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(upLog, `# ${new Date().toISOString()} validate --profile ${profile}\n`);

    say('validate: infra:up (creates kartseek-network and the 166 Kafka topics)…');
    const infra = npm(['run', 'infra:up']);
    fs.appendFileSync(upLog, `\n$ npm run infra:up\n${infra.out}\n`);
    ok('infra:up succeeded', infra.status === 0, infra.status === 0 ? '' : `exit ${infra.status}`);
    if (/Recreated|Recreate/.test(infra.out))
      say(
        'validate: compose recreated one or more datastores (the config-files label changed in ' +
          '316367c). Volumes and the topics survive; waiting for health again.',
      );

    const infraNames = ['postgres', 'redis', 'kafka', 'mongo', 'elasticsearch'].map(
      (n) => `kartseek-${n}`,
    );
    const infraDeadline = Date.now() + 5 * 60 * 1000;
    let infraPending = infraNames.filter((n) => healthOf(n) !== 'healthy');
    while (infraPending.length && Date.now() < infraDeadline) {
      await sleep(3000);
      infraPending = infraPending.filter((n) => healthOf(n) !== 'healthy');
    }
    ok(
      'the five datastores are healthy',
      infraPending.length === 0,
      infraPending.length ? `still not healthy: ${infraPending.join(', ')}` : '',
    );

    const topics = tryDocker([
      'exec',
      'kartseek-kafka',
      '/opt/kafka/bin/kafka-topics.sh',
      '--bootstrap-server',
      'localhost:9092',
      '--list',
    ]);
    const topicCount = topics.ok ? topics.out.split(/\r?\n/).filter(Boolean).length : 0;
    ok(
      'kafka lists its topics',
      topicCount > 100,
      `${topicCount} topic(s)`,
      `${topicCount} topic(s)`,
    );

    // ── 2. The application tier ───────────────────────────────────────────────
    say(
      `validate: ${skipBuild ? 'starting' : 'building and starting'} the ${profile} profile — ` +
        `output goes to ${path.relative(root, upLog)}`,
    );
    const upStarted = Date.now();
    const upArgs = ['compose', '--profile', profile, 'up', '-d'];
    if (!skipBuild) upArgs.push('--build');
    const fd = fs.openSync(upLog, 'a');
    let upStatus = 0;
    try {
      execFileSync('docker', upArgs, {
        cwd: root,
        stdio: ['ignore', fd, fd],
        timeout: BUILD_TIMEOUT_MS,
      });
    } catch (err) {
      upStatus = err.status ?? 1;
    } finally {
      fs.closeSync(fd);
    }
    const upSeconds = Math.round((Date.now() - upStarted) / 1000);
    ok(
      `compose up finished (${upSeconds}s)`,
      upStatus === 0,
      upStatus === 0 ? '' : `exit ${upStatus} — see ${path.relative(root, upLog)}`,
    );
    images = imageVerdicts(fs.readFileSync(upLog, 'utf8'));
    // A failed `up` ENDS the run. Carrying on meant probing 127.0.0.1:<port> with
    // no container behind it and attributing whatever answered to a service name.
    if (upStatus !== 0) {
      say(`validate: compose up failed — stopping here. See ${path.relative(root, upLog)}.`);
      return summarise(results).code || 1;
    }

    // ── 3. Every container reaches healthy ────────────────────────────────────
    const ps = composePs();
    nameOf = (s) => ps.find((p) => p.Service === s.name)?.Name ?? containerName(s.name);
    const pending = new Set(inProfile.map((s) => s.name));
    const healthDeadline = Date.now() + HEALTH_DEADLINE_MS;
    while (pending.size && Date.now() < healthDeadline) {
      for (const s of inProfile) {
        if (!pending.has(s.name)) continue;
        const h = healthOf(nameOf(s));
        if (h === 'healthy') {
          state.set(s.name, 'healthy');
          pending.delete(s.name);
        } else if (h === 'exited' || h === 'dead' || h === 'absent') {
          state.set(s.name, h);
          pending.delete(s.name);
        }
      }
      if (pending.size) await sleep(4000);
    }
    for (const n of pending) state.set(n, healthOf(nameOf({ name: n })));
    for (const s of inProfile) {
      const h = state.get(s.name) ?? 'unknown';
      ok(`container ${s.name} healthy`, h === 'healthy', h === 'healthy' ? '' : h);
    }

    // ── 3b. The listener on the host port IS the container ────────────────────
    //
    // Everything after this point probes 127.0.0.1. Nothing so far ties what
    // answers there to the container the row is named after, and the port
    // pre-flight only proves nothing held the port BEFORE `up`. So each service's
    // liveness route is fetched twice — once from the host, once from inside its
    // own container — and the two bodies compared. `sameProcess` explains what it
    // compares and why; a row it cannot evaluate fails as `unverifiable`.
    for (const s of nest) {
      const route = s.health?.live;
      if (!route) {
        skip(
          `${s.name} is the listener on :${s.ports.http}`,
          'the registry gives it no live route',
        );
        continue;
      }
      const hostProbe = await get(`http://127.0.0.1:${s.ports.http}${route}`);
      const inside = tryDocker([
        'exec',
        nameOf(s),
        'wget',
        '-qO-',
        `http://127.0.0.1:${s.ports.http}${route}`,
      ]);
      let insideBody = null;
      try {
        insideBody = livenessBody(JSON.parse(inside.out.trim()));
      } catch {
        /* left null — sameProcess fails the row as unverifiable */
      }
      const startedAt = tryDocker(['inspect', '-f', '{{.State.StartedAt}}', nameOf(s)]);
      const ageSeconds = startedAt.ok
        ? Math.round((Date.now() - Date.parse(startedAt.out.trim())) / 1000)
        : NaN;
      const verdict = sameProcess(livenessBody(hostProbe.json), insideBody, {
        containerAgeSeconds: ageSeconds,
      });
      ok(
        `${s.name} is the listener on :${s.ports.http}`,
        verdict.ok,
        `${verdict.basis} — ${verdict.detail}; host ${JSON.stringify(hostProbe.json ?? hostProbe.text).slice(0, 120)} vs container ${inside.out.trim().slice(0, 120)}`,
        `${verdict.basis} — ${verdict.detail}`,
      );
    }

    // ── 4. A staff token, so the gateway returns the full board ───────────────
    const superadmin = await staffLogin(
      'superadmin@kartseek.com',
      'AdminPass123!',
      env.REDIS_PASSWORD ?? '',
    );
    ok(
      'superadmin signed in through the container (login → mfa/verify)',
      !!superadmin.token,
      superadmin.error ?? `role=${superadmin.user?.role ?? '?'}`,
    );
    const auth = superadmin.token ? { Authorization: `Bearer ${superadmin.token}` } : {};

    // ── 4b. The bypass is off, measured rather than assumed ───────────────────
    //
    // It holds by construction — the renderer pins DEV_AUTH_BYPASS: 'false' and
    // NODE_ENV: production, and jwt-auth.guard.ts needs both — but "by
    // construction" is the kind of claim this validator exists not to make. If it
    // were on, an anonymous request would be SUPER_ADMIN and the whole regional
    // proof below would be meaningless.
    const gatewayEntry = inProfile.find((s) => s.kind === 'gateway');
    if (gatewayEntry) {
      const bypass = tryDocker(['exec', nameOf(gatewayEntry), 'printenv', 'DEV_AUTH_BYPASS']);
      ok(
        'DEV_AUTH_BYPASS is off inside the gateway container',
        bypass.ok && bypass.out.trim() === 'false',
        `printenv says "${bypass.out.trim()}"`,
        'false',
      );
      const anon = await get(`${GATEWAY}${'/admin/marketplace/sellers?limit=1'}`);
      ok(
        'an anonymous staff route is refused, not served',
        anon.status === 401 || anon.status === 403,
        `HTTP ${anon.status} — an anonymous caller reached a staff route`,
        `HTTP ${anon.status}`,
      );
    }

    // ── 5. Each service's own readiness board, against the registry ───────────
    for (const s of nest) {
      const route = s.health?.ready;
      if (!route) {
        skip(`${s.name} readiness`, 'the registry gives this service no ready route');
        continue;
      }
      const r = await get(`http://127.0.0.1:${s.ports.http}${route}`, { headers: auth });
      boards.set(s.name, r);
      const verdict = boardVerdict(s, r.json);
      ok(
        `${s.name} ${route}`,
        r.status === 200 && verdict.ok,
        verdict.ok && r.status === 200 ? '' : `HTTP ${r.status} ${verdict.detail}`.trim(),
      );
      if (verdict.unchecked.length)
        skip(
          `${s.name} ${verdict.unchecked.join('/')} dependency`,
          `declared in services.yaml, not on this service's readiness board`,
        );
    }

    // ── 6. The role each service is actually holding, from pg_stat_activity ───
    //
    // The board says a query ran; it does not say WHO ran it. A module service
    // that quietly fell back to the superuser — `databaseCredentials()` reads
    // DB_USER unprefixed, so one missing variable does exactly that — answers
    // `database: up` and looks identical above.
    //
    // Timing is the whole trick. node-postgres closes an idle client after ten
    // seconds (`idleTimeoutMillis`, TypeORM does not raise it), so a minute after
    // boot `pg_stat_activity` holds nothing at all and a first attempt at this
    // check reported "no open connection" for all eight. So every readiness route
    // is fired FIRST, in parallel, and the catalogue read immediately after: each
    // SELECT 1 leaves its connection in the pool, idle, inside that window.
    const addrOf = new Map();
    for (const s of nest) {
      const ipOut = tryDocker([
        'inspect',
        '-f',
        '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}',
        nameOf(s),
      ]);
      addrOf.set(s.name, ipOut.ok ? ipOut.out.trim().split(/\s+/).filter(Boolean) : []);
    }
    await Promise.all(
      nest
        .filter((s) => s.database && s.health?.ready)
        .map((s) => get(`http://127.0.0.1:${s.ports.http}${s.health.ready}`, { headers: auth })),
    );
    const roleRows = tryDocker([
      'exec',
      'kartseek-postgres',
      'psql',
      '-U',
      env.POSTGRES_USER || 'postgres',
      '-d',
      env.POSTGRES_DB || 'kartseek_db',
      '-At',
      '-F',
      '|',
      '-c',
      // `host()`, not `client_addr::text`: the cast keeps the netmask, so the rows
      // read `172.18.0.24/32` and never matched what `docker inspect` reports.
      `select host(client_addr), usename, count(*) from pg_stat_activity ` +
        `where datname = current_database() and client_addr is not null group by 1,2`,
    ]);
    const byAddr = new Map();
    if (roleRows.ok)
      for (const line of roleRows.out.split(/\r?\n/).filter(Boolean)) {
        const [addr, role] = line.split('|');
        if (!byAddr.has(addr)) byAddr.set(addr, new Set());
        byAddr.get(addr).add(role);
      }
    ok(
      'pg_stat_activity names the connections',
      roleRows.ok && byAddr.size > 0,
      roleRows.ok ? 'readable, but no client connection was open' : roleRows.out.slice(0, 160),
      `${byAddr.size} client address(es)`,
    );
    for (const s of nest) {
      const want = expectedRole(s, env);
      if (!want) {
        roleOf.set(s.name, 'n/a');
        continue;
      }
      const ips = addrOf.get(s.name) ?? [];
      const held = new Set();
      for (const ip of ips) for (const r of byAddr.get(ip) ?? []) held.add(r);
      roleOf.set(s.name, held.size ? [...held].join(',') : 'no connection');
      ok(
        `${s.name} connects as ${want}`,
        held.size > 0 && [...held].every((r) => r === want),
        held.size === 0
          ? `nothing open from ${ips.join(',') || 'an unknown address'} right after SELECT 1`
          : `holding ${[...held].join(', ')}`,
        `from ${ips.join(',')}`,
      );
    }

    // ── 7. The gateway's aggregate, which only staff see in full ──────────────
    // The anonymous board is one word per dependency (AUD2-072). These three
    // checks read fields that exist ONLY on the staff branch, so they are also
    // the proof that the token above is being honoured rather than ignored.
    const gwBoard = readinessBody(boards.get('api-gateway')?.json);
    ok(
      'gateway readiness is ready, not degraded',
      gwBoard?.status === 'ready',
      JSON.stringify(gwBoard?.checks ?? {}).slice(0, 240),
      JSON.stringify(gwBoard?.checks ?? {}).slice(0, 160),
    );
    const gwRedis = gwBoard?.checks?.redis;
    ok(
      'the gateway is on the real Redis, not the in-process emulator',
      gwRedis &&
        typeof gwRedis === 'object' &&
        gwRedis.emulated !== true &&
        gwRedis.status === 'up',
      typeof gwRedis === 'object'
        ? (gwRedis?.detail ?? gwRedis?.reason ?? 'not up')
        : 'the anonymous board cannot answer this — the staff token did not take',
      'emulated=false',
    );
    const gwPg = gwBoard?.checks?.postgresql;
    ok(
      'the gateway ran SELECT 1 as a named role on a named database',
      typeof gwPg === 'object' && /SELECT 1 on \S+ as \S+/.test(String(gwPg?.detail ?? '')),
      typeof gwPg === 'object' ? String(gwPg?.detail ?? 'no detail') : 'no detail on the board',
      String(gwPg?.detail ?? ''),
    );

    // ── 8. Redis and Kafka, from inside the network ───────────────────────────
    const redisPing = tryDocker([
      'exec',
      'kartseek-redis',
      'redis-cli',
      '-a',
      env.REDIS_PASSWORD ?? '',
      '--no-auth-warning',
      'ping',
    ]);
    ok(
      'redis answers PING',
      redisPing.ok && redisPing.out.trim() === 'PONG',
      redisPing.out.trim() || 'no answer',
    );
    // Read the LIVE value and accept only a policy from an allow-list. The first
    // version was `!/allkeys-lru/`, which `allkeys-lfu` and `allkeys-random` — both
    // of which evict TTL-less keys just as happily — walked straight past.
    const redisConfig = (name) =>
      tryDocker([
        'exec',
        'kartseek-redis',
        'redis-cli',
        '-a',
        env.REDIS_PASSWORD ?? '',
        '--no-auth-warning',
        'config',
        'get',
        name,
      ]);
    const policy = redisConfigVerdict('maxmemory-policy', redisConfig('maxmemory-policy').out, [
      'volatile-lru',
      'volatile-ttl',
      'noeviction',
    ]);
    ok(
      'redis does not evict keys that have no expiry',
      policy.ok,
      `maxmemory-policy is "${policy.value}" — loyalty balances, the KYC counter and a ride in ` +
        `dispatch carry no TTL, so only volatile-lru / volatile-ttl / noeviction are safe`,
      policy.value,
    );
    const aof = redisConfigVerdict('appendonly', redisConfig('appendonly').out, ['yes']);
    ok(
      'redis persists writes with an append-only file',
      aof.ok,
      `appendonly is "${aof.value}" — --save 60 1 alone loses up to a minute of the very keys ` +
        `the eviction policy protects (AUD2-031)`,
      aof.value,
    );

    // ── 9. The console, through its own container ─────────────────────────────
    const web = inProfile.find((s) => s.kind === 'web-shell');
    if (web) {
      const login = await get(`http://127.0.0.1:${web.ports.http}/admin/login`, { timeout: 30000 });
      ok('console GET /admin/login is 200', login.status === 200, `HTTP ${login.status}`);
      // Next answers 200 for notFound(); assert the page is the page.
      ok(
        'the console rendered the sign-in form',
        /name="email"|type="password"/i.test(login.text),
        `${login.text.length} bytes and no password field`,
      );
    }
    skip(
      'the nginx edge',
      'infra/nginx/nginx.conf upstreams host.docker.internal:3001/:3000 — a browser through ' +
        'nginx reaches the HOST fleet, not these containers. IN11 owns it; probed directly instead.',
    );

    // ── 10. The ledgers: migrations, then real schema drift ───────────────────
    const show = npm(['run', '--silent', 'migration:show:main'], {
      cwd: path.join(root, 'apps/api'),
    });
    ok(
      'the main migration ledger is level',
      show.status === 0 && !show.out.includes('[ ]'),
      show.status === 0
        ? show.out
            .split(/\r?\n/)
            .filter((l) => l.includes('[ ]'))
            .join(' ')
            .slice(0, 200)
        : `exit ${show.status}`,
    );

    const drift = npm(['run', '--silent', 'verify:schema-drift', '--', '--json'], {
      cwd: path.join(root, 'apps/api'),
    });
    let census = { ok: false, line: 'verify:schema-drift produced no JSON', findings: 0 };
    const braceAt = drift.out.indexOf('{');
    if (braceAt >= 0) {
      try {
        census = driftCensus(JSON.parse(drift.out.slice(braceAt)));
      } catch {
        /* left as the failure above */
      }
    }
    ok('no schema drift in the module databases', census.ok, census.line, census.line);
    // The drift check runs on the HOST, against whatever answers on 5432, and the
    // memory's two-Postgres-on-one-port trap applies. Tie its evidence to this
    // run's container: every module's target must be the address `kartseek-postgres`
    // publishes, and that publish must exist.
    const pgPublish = tryDocker(['port', 'kartseek-postgres', '5432/tcp']);
    const pgHostPort = (pgPublish.ok ? pgPublish.out.trim().split(/\r?\n/)[0] : '') || '';
    const targets = census.targets ?? [];
    const wrongTarget = targets.filter((t) => !t.endsWith(`@${pgHostPort}/${env.POSTGRES_DB}`));
    ok(
      'the drift census was read from this run’s Postgres container',
      !!pgHostPort && targets.length > 0 && wrongTarget.length === 0,
      !pgHostPort
        ? 'kartseek-postgres publishes no host port for 5432'
        : `${wrongTarget.length || 'no'} module target(s) do not name ${pgHostPort}/${env.POSTGRES_DB}: ${wrongTarget.slice(0, 2).join(', ')}`,
      `${targets.length} module(s) against ${pgHostPort}/${env.POSTGRES_DB}`,
    );
    say(`validate: schema drift census — ${census.line}`);

    // ── 11. The regional lock, proved through the containers ──────────────────
    const india = await staffLogin(
      'india-admin@kartseek.com',
      'AdminPass123!',
      env.REDIS_PASSWORD ?? '',
    );
    const qatar = await staffLogin(
      'qa-admin@kartseek.com',
      'AdminPass123!',
      env.REDIS_PASSWORD ?? '',
    );
    ok('india-admin (IN, locked) signed in', !!india.token, india.error ?? '');
    ok('qa-admin (QA, locked) signed in', !!qatar.token, qatar.error ?? '');
    const SELLERS = '/admin/marketplace/sellers?limit=1';
    const call = (token, q) =>
      get(`${GATEWAY}${SELLERS}${q}`, { headers: { Authorization: `Bearer ${token}` } });
    if (india.token && qatar.token && superadmin.token) {
      const own = await call(india.token, '');
      ok('IN admin reads its own market', own.status === 200, `HTTP ${own.status}`);
      const ownQa = await call(qatar.token, '');
      ok('QA admin reads its own market', ownQa.status === 200, `HTTP ${ownQa.status}`);
      const cross = await call(india.token, '&country=QA');
      const copy = String(cross.json?.message ?? cross.text ?? '');
      ok(
        'IN admin is refused QA with the gateway’s denial copy',
        // The whole sentence, object clause included. `restricted to the IN market`
        // alone also matches the copy `assertRecordInScope` builds for a single
        // record, which is a different refusal from this list-scope one.
        cross.status === 403 &&
          /restricted to the IN market; those sellers belongs to QA/.test(copy),
        `HTTP ${cross.status} ${copy.slice(0, 140)}`,
        copy.slice(0, 120),
      );
      const superIn = await call(superadmin.token, '&country=IN');
      const superQa = await call(superadmin.token, '&country=QA');
      ok(
        'superadmin reads both markets',
        superIn.status === 200 && superQa.status === 200,
        `IN ${superIn.status} / QA ${superQa.status}`,
      );
    } else {
      skip('the regional proof', 'one of the three staff sign-ins did not produce a token');
    }

    // ── 12. The logs, per container, so a bad line has an owner ───────────────
    for (const s of inProfile) {
      const r = tryDocker(['logs', '--tail', '400', nameOf(s)]);
      const bad = r.out
        .split(/\r?\n/)
        .map((l) => [l, classifyLogLine(l)])
        .filter(([, c]) => c);
      const worst = bad.some(([, c]) => c === 'fatal')
        ? 'fatal'
        : bad.length
          ? `${bad.length} error`
          : 'clean';
      logVerdict.set(s.name, worst);
      ok(
        `${s.name} log has no fatal or error line`,
        bad.length === 0,
        bad
          .slice(0, 2)
          .map(([l]) => l.trim().slice(0, 150))
          .join(' | '),
      );
    }

    return summarise(results).code;
  };

  // ── 13. Teardown — the application tier only, on EVERY path ───────────────
  const outcome = await withTeardown({
    phases,
    keep,
    teardown: () => {
      say('validate: removing the application tier; the datastores stay up.');
      const down = tryDocker(downArgs(reg));
      const left = composePs().filter((p) => p.State === 'running').length;
      if (down.ok) say(`validate: ${left} container(s) still running (the infrastructure tier).`);
      return {
        ok: down.ok,
        detail: down.ok ? `${left} infrastructure container(s) left up` : down.out.slice(0, 200),
      };
    },
  });
  if (outcome.error) console.error(outcome.error);
  if (keep) skip('teardown', '--keep was given; run `npm run stack:down` when you are finished');
  else
    ok(
      'teardown left the infrastructure running',
      outcome.teardown.ok,
      outcome.teardown.detail,
      outcome.teardown.detail,
    );

  // ── 14. The table ─────────────────────────────────────────────────────────
  const table = [
    '',
    'service              image     healthy  ready    role              log',
    '-------------------- --------- -------- -------- ----------------- --------',
    ...inProfile.map((s) => {
      const board = boards.get(s.name);
      const ready = board
        ? board.status === 200
          ? (readinessBody(board.json)?.status ?? 'no board')
          : `HTTP ${board.status || 'unreachable'}`
        : s.kind === 'web-shell'
          ? 'n/a'
          : '—';
      // Measured from the `up` log, not inferred from the flag. `--skip-build`
      // runs no build step at all, so there is nothing to measure and the
      // column says so rather than claiming "reused".
      const image = images.get(s.name) ?? (skipBuild ? 'no build' : '—');
      return [
        s.name.padEnd(20),
        image.padEnd(9),
        String(state.get(s.name) ?? '?').padEnd(8),
        String(ready).padEnd(8),
        String(roleOf.get(s.name) ?? 'n/a').padEnd(17),
        logVerdict.get(s.name) ?? '?',
      ].join(' ');
    }),
  ].join('\n');

  const { report, failed, skipped, passed, total } = summarise(results);
  const wall = Math.round((Date.now() - started) / 1000);
  if (json) {
    console.log(
      JSON.stringify(
        {
          profile,
          wallSeconds: wall,
          exitCode: outcome.code,
          census,
          results: results.map((r) => ({
            ...r,
            status: r.skipped ? 'skipped' : r.ok ? 'pass' : 'fail',
          })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(table);
    console.log(`\n${report}`);
    console.log(
      `\n${passed}/${total} checks passed, ${failed} failed, ${skipped} skipped — ` +
        `${wall}s wall (${skipBuild ? 'no build' : 'with build'})`,
    );
    console.log(`schema drift: ${census.line}`);
  }
  // `outcome.code`, not `summarise(results).code`: a run that threw exits 2 even
  // though the rows it managed to record may all have passed.
  process.exit(outcome.code);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
