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
import { loadRegistry, repoRoot, nestEntries, webEntries, NEST_KINDS } from './lib.mjs';

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

/** `process.env.NAME ?? 1234` or `process.env.NAME || 1234` → Map(NAME → 1234). */
export function parseMainDefaults(text) {
  const out = new Map();
  for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)\s*(?:\?\?|\|\|)\s*'?(\d{2,5})'?/g)) {
    if (!out.has(m[1])) out.set(m[1], Number(m[2]));
  }
  return out;
}

export function findDuplicatePorts(reg) {
  const seen = new Map();
  const dupes = [];
  for (const s of reg.services) for (const [kind, port] of Object.entries(s.ports)) {
    if (seen.has(port)) dupes.push(`port ${port} is bound by ${seen.get(port)} and ${s.name} (${kind})`);
    else seen.set(port, `${s.name} (${kind})`);
  }
  return dupes;
}

export async function runChecks(reg, root) {
  const fail = [];

  // 1. Every path exists and holds its entry file.
  for (const s of reg.services) {
    if (!exists(root, s.path)) { fail.push(`${s.name}: ${s.path} does not exist`); continue; }
    const entry = NEST_KINDS.includes(s.kind) ? 'src/main.ts' : 'next.config.mjs';
    if (!exists(root, `${s.path}/${entry}`)) fail.push(`${s.name}: ${s.path}/${entry} is missing`);
  }

  // 2. Coverage both ways: nest-cli applications, modules/*/{backend,frontend}, apps/web.
  const nestCli = JSON.parse(read(root, 'apps/api/nest-cli.json'));
  const cliApps = Object.entries(nestCli.projects).filter(([, p]) => p.type === 'application').map(([n]) => n);
  const regApps = reg.services.filter((s) => ['gateway', 'core-service'].includes(s.kind)).map((s) => s.build.nestProject);
  for (const a of cliApps) if (!regApps.includes(a)) fail.push(`apps/api/nest-cli.json project ${a} has no registry entry`);
  for (const a of regApps) if (!cliApps.includes(a)) fail.push(`registry nestProject ${a} is not an application in apps/api/nest-cli.json`);
  const modules = fs.readdirSync(path.join(root, 'modules'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const m of modules) for (const side of ['backend', 'frontend']) {
    const p = `modules/${m}/${side}`;
    if (exists(root, p) && !reg.services.some((s) => s.path === p)) fail.push(`${p} has no registry entry`);
  }
  if (!reg.services.some((s) => s.path === 'apps/web')) fail.push('apps/web has no registry entry');

  // 3. main.ts defaults, zone dev ports and basePaths.
  for (const s of nestEntries(reg)) {
    if (!exists(root, `${s.path}/src/main.ts`)) continue;
    const defaults = parseMainDefaults(read(root, `${s.path}/src/main.ts`));
    for (const [kind, envName] of Object.entries(s.env)) {
      const found = defaults.get(envName);
      if (found === undefined) fail.push(`${s.name}: src/main.ts never defaults ${envName} (registry: ${s.ports[kind]})`);
      else if (found !== s.ports[kind]) fail.push(`${s.name}: src/main.ts defaults ${envName} to ${found}, registry says ${s.ports[kind]}`);
    }
  }
  for (const s of webEntries(reg)) {
    const pkg = JSON.parse(read(root, `${s.path}/package.json`));
    const m = /-p\s+(\d+)/.exec(pkg.scripts?.dev ?? '');
    if (!m) fail.push(`${s.name}: package.json dev script has no "-p <port>"`);
    else if (Number(m[1]) !== s.ports.http) fail.push(`${s.name}: dev script uses port ${m[1]}, registry says ${s.ports.http}`);
    if (s.kind === 'web-zone') {
      const bp = /basePath:\s*'([^']+)'/.exec(read(root, `${s.path}/next.config.mjs`));
      if (!bp) fail.push(`${s.name}: next.config.mjs declares no basePath`);
      else if (bp[1] !== s.basePath) fail.push(`${s.name}: next.config.mjs basePath ${bp[1]}, registry says ${s.basePath}`);
    }
  }

  // 4. .env.example defaults — only variables the registry names.
  const envFiles = ['apps/api/.env.example', ...modules.map((m) => `modules/${m}/backend/.env.example`)].filter((f) => exists(root, f));
  const envDefaults = new Map();
  for (const f of envFiles) for (const line of read(root, f).split('\n')) {
    const m = /^([A-Z][A-Z0-9_]*)=(\d+)\s*$/.exec(line);
    if (m && !envDefaults.has(m[1])) envDefaults.set(m[1], { value: Number(m[2]), file: f });
  }
  for (const s of nestEntries(reg)) for (const [kind, envName] of Object.entries(s.env)) {
    const d = envDefaults.get(envName);
    if (d && d.value !== s.ports[kind]) fail.push(`${d.file}: ${envName}=${d.value}, registry says ${s.ports[kind]}`);
  }

  // 5. Kubernetes ConfigMap ports.
  if (exists(root, 'infra/k8s/config.yaml')) {
    const cm = read(root, 'infra/k8s/config.yaml');
    for (const s of nestEntries(reg)) {
      const m = new RegExp(`^\\s*${s.env.http}:\\s*"?(\\d+)"?\\s*$`, 'm').exec(cm);
      if (m && Number(m[1]) !== s.ports.http) fail.push(`infra/k8s/config.yaml: ${s.env.http}=${m[1]}, registry says ${s.ports.http}`);
    }
  }

  // 6. Uniqueness.
  fail.push(...findDuplicatePorts(reg));
  const groups = new Map();
  for (const s of reg.services) {
    const g = s.kafka?.groupId; if (!g) continue;
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
  console.log(failures.length ? `${failures.length} problem(s)` : `services.yaml agrees with the repository (${reg.services.length} entries)`);
  process.exit(failures.length ? 1 : 0);
}
