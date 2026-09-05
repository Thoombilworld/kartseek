/**
 * Loader and shape rules for services.yaml, the service registry.
 * No repository I/O beyond reading the YAML; the drift checks live in
 * validate.mjs and the renderers in generate.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const KINDS = ['gateway', 'core-service', 'module-service', 'web-shell', 'web-zone'];
export const NEST_KINDS = ['gateway', 'core-service', 'module-service'];
export const WEB_KINDS = ['web-shell', 'web-zone'];
export const INFRA = ['postgres', 'redis', 'kafka', 'mongodb', 'elasticsearch'];
const PORT_KEYS = ['http', 'tcp', 'grpc'];

export class RegistryError extends Error {
  constructor(problems) {
    super(`services.yaml is malformed:\n  - ${problems.join('\n  - ')}`);
    this.problems = problems;
  }
}

export function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

export function loadRegistry(root = repoRoot()) {
  const doc = YAML.parse(fs.readFileSync(path.join(root, 'services.yaml'), 'utf8'));
  const problems = validateShape(doc);
  if (problems.length) throw new RegistryError(problems);
  return doc;
}

export const nestEntries = (reg) => reg.services.filter((s) => NEST_KINDS.includes(s.kind));
export const webEntries = (reg) => reg.services.filter((s) => WEB_KINDS.includes(s.kind));

const isInt = (v) => Number.isInteger(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;

export function validateShape(doc) {
  const problems = [];
  const bad = (m) => problems.push(m);
  if (!doc || typeof doc !== 'object') return ['document is not a mapping'];
  if (doc.version !== 1) bad(`version must be 1, got ${JSON.stringify(doc.version)}`);
  if (!Array.isArray(doc.services) || doc.services.length === 0) return [...problems, 'services must be a non-empty list'];

  const names = new Set();
  doc.services.forEach((s, i) => {
    const id = s?.name ? `services[${i}] (${s.name})` : `services[${i}]`;
    if (!isStr(s?.name) || !/^[a-z][a-z0-9-]*$/.test(s.name)) bad(`${id}: name must be lower-case kebab`);
    else if (names.has(s.name)) bad(`${id}: duplicate name`);
    names.add(s?.name);
    if (!KINDS.includes(s?.kind)) bad(`${id}: kind must be one of ${KINDS.join(', ')}`);
    if (!isStr(s?.path) || s.path.endsWith('/')) bad(`${id}: path must be a relative directory without a trailing slash`);
    if (!isStr(s?.image) || !/^kartseek\/[a-z0-9-]+$/.test(s.image)) bad(`${id}: image must look like kartseek/<name>`);
    if (!isStr(s?.build?.workspace)) bad(`${id}: build.workspace is required`);

    if (!s?.ports || typeof s.ports !== 'object' || !isInt(s.ports.http)) bad(`${id}: ports.http (integer) is required`);
    for (const k of Object.keys(s?.ports ?? {})) {
      if (!PORT_KEYS.includes(k)) bad(`${id}: unknown ports key ${k}`);
      else if (!isInt(s.ports[k])) bad(`${id}: ports.${k} must be an integer`);
    }

    if (NEST_KINDS.includes(s?.kind)) {
      if (['gateway', 'core-service'].includes(s.kind) && !isStr(s.build?.nestProject)) bad(`${id}: build.nestProject is required for ${s.kind}`);
      for (const k of Object.keys(s.ports ?? {})) if (!isStr(s.env?.[k])) bad(`${id}: env.${k} must name the variable ${k} is read from`);
      for (const k of Object.keys(s.env ?? {})) {
        if (!(k in (s.ports ?? {}))) bad(`${id}: env.${k} has no matching port`);
        else if (!/^[A-Z][A-Z0-9_]*$/.test(s.env[k])) bad(`${id}: env.${k} must be an UPPER_SNAKE variable name`);
      }
      if (!s.health || typeof s.health !== 'object') bad(`${id}: health { live, ready } is required`);
      else for (const k of ['live', 'ready']) {
        if (!(k in s.health)) bad(`${id}: health.${k} is required (string path or null)`);
        else if (s.health[k] !== null && !(isStr(s.health[k]) && s.health[k].startsWith('/'))) bad(`${id}: health.${k} must be null or a path starting with /`);
      }
      if (!('database' in s)) bad(`${id}: database is required (mapping or null)`);
      else if (s.database !== null) for (const k of ['name', 'schema', 'envPrefix']) if (!isStr(s.database?.[k])) bad(`${id}: database.${k} is required`);
      if (!Array.isArray(s.dependsOn)) bad(`${id}: dependsOn must be a list`);
      else for (const d of s.dependsOn) if (!INFRA.includes(d)) bad(`${id}: dependsOn has unknown infrastructure ${d}`);
      if (s.kafka !== undefined && !isStr(s.kafka?.groupId)) bad(`${id}: kafka.groupId must be a string when kafka is present`);
      if ('basePath' in s) bad(`${id}: basePath is only for web-zone`);
    }

    if (s?.kind === 'web-zone' && !(isStr(s.basePath) && s.basePath.startsWith('/'))) bad(`${id}: basePath starting with / is required for web-zone`);
    if (s?.kind === 'web-shell' && 'basePath' in s) bad(`${id}: basePath is not allowed on web-shell`);
  });
  return problems;
}
