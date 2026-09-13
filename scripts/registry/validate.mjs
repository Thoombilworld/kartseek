#!/usr/bin/env node
/**
 * Drift checks between services.yaml and the repository.
 *
 *   node scripts/registry/validate.mjs        (npm run registry:check)
 *
 * Exit 1 with one line per disagreement. The registry is the source of truth:
 * fix the file the message names, or — if the registry itself is wrong —
 * fix the registry and re-run `npm run registry:generate`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { loadRegistry, repoRoot, nestEntries, webEntries, NEST_KINDS } from './lib.mjs';
import { stem } from './compose.mjs';

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

/**
 * `process.env.NAME ?? 1234` or `process.env.NAME || 1234` → Map(NAME → 1234).
 *
 * It matches the digits of any short quoted literal, so
 * `process.env.MARKETPLACE_HTTP_HOST ?? '127.0.0.1'` lands here as 127. Harmless
 * where the caller looks a name up (a bind address is never a registry port),
 * and the reason `undeclaredPortEnv` below filters on the `_PORT` suffix rather
 * than trusting every key in this map.
 */
export function parseMainDefaults(text) {
  const out = new Map();
  for (const m of text.matchAll(
    /process\.env\.([A-Z][A-Z0-9_]*)\s*(?:\?\?|\|\|)\s*'?(\d{2,5})'?/g,
  )) {
    if (!out.has(m[1])) out.set(m[1], Number(m[2]));
  }
  return out;
}

/**
 * The other direction: a port this service's main.ts binds that its registry
 * entry never declares.
 *
 * Every other check here reads the registry's `env` map INTO main.ts, so a
 * listener the registry has never heard of is invisible to all of them —
 * audit-log-service bound `AUDIT_LOG_TCP_PORT` (4028) for months while the
 * registry listed only its HTTP port, which meant Compose never published it,
 * the Kubernetes Service never carried it, and IN9's smoke had to keep a
 * hand-written `UNREGISTERED_PORTS` table to see it at all.
 *
 * Scoped to the service's OWN stem and to names ending `_PORT`: `REDIS_PORT` and
 * `DB_PORT` belong to infrastructure, not to this entry, and `_HOST` names are
 * bind addresses (see `parseMainDefaults` above).
 */
export function undeclaredPortEnv(s, mainTs) {
  const own = `${stem(s.name)}_`;
  const declared = new Set(Object.values(s.env ?? {}));
  return [...portEnvNamesRead(mainTs)].filter(
    (n) => n.startsWith(own) && n.endsWith('_PORT') && !declared.has(n),
  );
}

/**
 * Every `*_PORT` environment variable a source file reads, with or without a
 * literal default.
 *
 * `parseMainDefaults` only sees `process.env.X ?? 4028` — it exists to compare
 * the default with the registry, so a read it cannot value is no use to it. That
 * made the direction check above blind to `Number(process.env.X_PORT)` and to
 * `cfg.get('X_PORT')`, which are how a service would bind a port the registry
 * has never heard of WITHOUT tripping any of this. Three patterns, and a name
 * only has to appear once:
 *
 *   process.env.X_PORT        any read, default or not
 *   'X_PORT' / "X_PORT"       a quoted name — ConfigService.get, Joi schemas
 *
 * Over-matching is harmless: the caller keeps only names beginning with the
 * service's own stem and ending `_PORT`, and a name it already declares.
 */
export function portEnvNamesRead(text) {
  const names = new Set();
  for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*_PORT)\b/g)) names.add(m[1]);
  for (const m of text.matchAll(/['"`]([A-Z][A-Z0-9_]*_PORT)['"`]/g)) names.add(m[1]);
  return names;
}

/**
 * The `data` block of a ConfigMap, parsed as YAML rather than matched with a
 * regex.
 *
 * The regex this replaces accepted an optional DOUBLE quote — and prettier
 * normalised `AUTH_SERVICE_PORT: "3010"` to `'3010'` when the file was first
 * staged, so it matched 0 of 26 services. A non-match was silently skipped, so
 * `registry:check` stayed green while checking nothing. A parser has no quote
 * style to be wrong about.
 */
export function parseConfigMapData(text, name = 'kartseek-config') {
  for (const doc of YAML.parseAllDocuments(text)) {
    const js = doc.toJS();
    if (js?.kind === 'ConfigMap' && js?.metadata?.name === name) return js.data ?? {};
  }
  return null;
}

/**
 * Every port the ConfigMap publishes, against the registry — and an assertion
 * that the gate looked at anything at all.
 *
 * The count is the point: a check that silently matches nothing is worse than
 * no check, because it reports success. If a service's key is missing the gate
 * fails on that key AND on the tally, so neither a rename nor a reformat can
 * turn this green by accident.
 */
export function checkConfigMapPorts(reg, data) {
  if (data === null)
    return ['infra/k8s/config.yaml: no ConfigMap named kartseek-config — the port gate cannot run'];
  const fail = [];
  const entries = nestEntries(reg);
  let servicesSeen = 0;
  for (const s of entries) {
    if (data[s.env.http] !== undefined) servicesSeen++;
    for (const [kind, envName] of Object.entries(s.env)) {
      const raw = data[envName];
      if (raw === undefined) {
        fail.push(
          `infra/k8s/config.yaml: ${envName} is missing — ${s.name} binds ${kind} on ${s.ports[kind]}`,
        );
        continue;
      }
      if (Number(raw) !== s.ports[kind])
        fail.push(`infra/k8s/config.yaml: ${envName}=${raw}, registry says ${s.ports[kind]}`);
    }
  }
  // An ABSOLUTE floor as well as a relative one. `servicesSeen < entries.length`
  // alone is satisfied by 0 of 0 — a registry with no Nest entries would pass
  // this gate with no failures at all, which is the same "green while checking
  // nothing" the gate exists to prevent, one level up. `loadRegistry` rejects an
  // empty `services:` list, so today that is unreachable through the real entry
  // point; a guard that depends on somebody else's validation is not a guard.
  if (servicesSeen !== entries.length || servicesSeen === 0)
    fail.push(
      `infra/k8s/config.yaml: the port gate matched ${servicesSeen} of ${entries.length} services — ` +
        'it is checking nothing (a renamed key, a ConfigMap this parser did not find, or a ' +
        'registry with no Nest services in it)',
    );
  return fail;
}

export function findDuplicatePorts(reg) {
  const seen = new Map();
  const dupes = [];
  for (const s of reg.services)
    for (const [kind, port] of Object.entries(s.ports)) {
      if (seen.has(port))
        dupes.push(`port ${port} is bound by ${seen.get(port)} and ${s.name} (${kind})`);
      else seen.set(port, `${s.name} (${kind})`);
    }
  return dupes;
}

export async function runChecks(reg, root) {
  const fail = [];

  // 1. Every path exists and holds its entry file.
  for (const s of reg.services) {
    if (!exists(root, s.path)) {
      fail.push(`${s.name}: ${s.path} does not exist`);
      continue;
    }
    const entry = NEST_KINDS.includes(s.kind) ? 'src/main.ts' : 'next.config.mjs';
    if (!exists(root, `${s.path}/${entry}`)) fail.push(`${s.name}: ${s.path}/${entry} is missing`);
  }

  // 2. Coverage both ways: nest-cli applications, modules/*/{backend,frontend}, apps/web.
  const nestCli = JSON.parse(read(root, 'apps/api/nest-cli.json'));
  const cliApps = Object.entries(nestCli.projects)
    .filter(([, p]) => p.type === 'application')
    .map(([n]) => n);
  const regApps = reg.services
    .filter((s) => ['gateway', 'core-service'].includes(s.kind))
    .map((s) => s.build.nestProject);
  for (const a of cliApps)
    if (!regApps.includes(a))
      fail.push(`apps/api/nest-cli.json project ${a} has no registry entry`);
  for (const a of regApps)
    if (!cliApps.includes(a))
      fail.push(`registry nestProject ${a} is not an application in apps/api/nest-cli.json`);
  const modules = fs
    .readdirSync(path.join(root, 'modules'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const m of modules)
    for (const side of ['backend', 'frontend']) {
      const p = `modules/${m}/${side}`;
      if (exists(root, p) && !reg.services.some((s) => s.path === p))
        fail.push(`${p} has no registry entry`);
    }
  if (!reg.services.some((s) => s.path === 'apps/web')) fail.push('apps/web has no registry entry');

  // 3. main.ts defaults, zone dev ports and basePaths.
  let mainsRead = 0;
  for (const s of nestEntries(reg)) {
    // Not a silent `continue`. Check 1 above already fails on a missing entry
    // file, but this loop is a gate of its own and a gate that quietly examines
    // nothing is the failure mode this whole round is about — so it is counted,
    // and the tally below says so in its own words.
    if (!exists(root, `${s.path}/src/main.ts`)) continue;
    mainsRead++;
    const mainTs = read(root, `${s.path}/src/main.ts`);
    const defaults = parseMainDefaults(mainTs);
    for (const n of undeclaredPortEnv(s, mainTs))
      fail.push(
        `${s.name}: src/main.ts binds ${n}, which services.yaml does not declare — ` +
          "add it to this entry's ports/env map (compose, k8s and the docs regenerate from it)",
      );
    for (const [kind, envName] of Object.entries(s.env)) {
      const found = defaults.get(envName);
      if (found === undefined)
        fail.push(`${s.name}: src/main.ts never defaults ${envName} (registry: ${s.ports[kind]})`);
      else if (found !== s.ports[kind])
        fail.push(
          `${s.name}: src/main.ts defaults ${envName} to ${found}, registry says ${s.ports[kind]}`,
        );
    }
  }
  if (mainsRead !== nestEntries(reg).length || mainsRead === 0)
    fail.push(
      `the main.ts gate read ${mainsRead} of ${nestEntries(reg).length} services — the rest have no ` +
        'src/main.ts at the path the registry gives, so neither their port defaults nor the ports ' +
        'they bind undeclared were checked',
    );

  for (const s of webEntries(reg)) {
    const pkg = JSON.parse(read(root, `${s.path}/package.json`));
    const m = /-p\s+(\d+)/.exec(pkg.scripts?.dev ?? '');
    if (!m) fail.push(`${s.name}: package.json dev script has no "-p <port>"`);
    else if (Number(m[1]) !== s.ports.http)
      fail.push(`${s.name}: dev script uses port ${m[1]}, registry says ${s.ports.http}`);
    if (s.kind === 'web-zone') {
      const bp = /basePath:\s*'([^']+)'/.exec(read(root, `${s.path}/next.config.mjs`));
      if (!bp) fail.push(`${s.name}: next.config.mjs declares no basePath`);
      else if (bp[1] !== s.basePath)
        fail.push(`${s.name}: next.config.mjs basePath ${bp[1]}, registry says ${s.basePath}`);
    }
  }

  // 4. .env.example defaults — only variables the registry names.
  const envFiles = [
    'apps/api/.env.example',
    ...modules.map((m) => `modules/${m}/backend/.env.example`),
  ].filter((f) => exists(root, f));
  const envDefaults = new Map();
  for (const f of envFiles)
    for (const line of read(root, f).split('\n')) {
      const m = /^([A-Z][A-Z0-9_]*)=(\d+)\s*$/.exec(line);
      if (m && !envDefaults.has(m[1])) envDefaults.set(m[1], { value: Number(m[2]), file: f });
    }
  for (const s of nestEntries(reg))
    for (const [kind, envName] of Object.entries(s.env)) {
      const d = envDefaults.get(envName);
      if (d && d.value !== s.ports[kind])
        fail.push(`${d.file}: ${envName}=${d.value}, registry says ${s.ports[kind]}`);
    }

  // 5. Kubernetes ConfigMap ports — every http, tcp and gRPC key, both ways.
  if (exists(root, 'infra/k8s/config.yaml'))
    fail.push(...checkConfigMapPorts(reg, parseConfigMapData(read(root, 'infra/k8s/config.yaml'))));

  // 6. Uniqueness.
  fail.push(...findDuplicatePorts(reg));
  const groups = new Map();
  for (const s of reg.services) {
    const g = s.kafka?.groupId;
    if (!g) continue;
    if (groups.has(g)) fail.push(`kafka groupId ${g} is shared by ${groups.get(g)} and ${s.name}`);
    groups.set(g, s.name);
  }

  // 7. Generated artifacts are current (generate.mjs lands in Task 3; skip if absent).
  if (exists(root, 'scripts/registry/generate.mjs')) {
    const { checkGenerated } = await import('./generate.mjs');
    fail.push(...checkGenerated(reg, root));
  }
  return fail;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = repoRoot();
  const reg = loadRegistry(root);
  const failures = await runChecks(reg, root);
  for (const f of failures) console.error(`✗ ${f}`);
  console.log(
    failures.length
      ? `${failures.length} problem(s)`
      : `services.yaml agrees with the repository (${reg.services.length} entries)`,
  );
  process.exit(failures.length ? 1 : 0);
}
