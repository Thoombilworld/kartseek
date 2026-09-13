import * as fs from 'fs';
import * as path from 'path';
import { KAFKA_TOPICS, PUBLISHED_TOPICS } from './kafka-topics.constants';

/**
 * The registry is the only thing that creates topics.
 *
 * The broker runs with auto-create off and `apps/api/scripts/create-kafka-topics.js`
 * creates exactly the names declared in `kafka-topics.constants.ts`. A service
 * that publishes to a name nobody declared publishes to a topic that does not
 * exist: kafkajs fails the metadata lookup ("This server does not host this
 * topic-partition"), retries, gives up, and the event is gone — while the
 * producer used to log "Published". On 2026-09-13 that was 186 names across
 * fifteen backends, `listing.approved` and `review.created` among them.
 *
 * This spec scans every backend's publish sites and fails on the first
 * literal that is not declared, naming the file. Declaring it is a one-line
 * change here; the CI provisioner then creates it.
 */
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
// `kafka.publish(…)` and `kafkaProducer.emit(…)` are the Kafka producers in
// this codebase; `client.emit(…)` is socket.io in the gateway's WebSocket
// gateways and is not a topic.
const PUBLISH_RE = /\b(?:kafka|kafkaProducer)\.(?:publish|emit)\(\s*'([^']+)'/g;
const TOPIC_NAME = /^[a-z0-9][a-z0-9._-]*$/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

function backendRoots(): string[] {
  const roots: string[] = [];
  const apps = path.join(ROOT, 'apps', 'api', 'apps');
  for (const d of fs.readdirSync(apps)) roots.push(path.join(apps, d, 'src'));
  const modules = path.join(ROOT, 'modules');
  for (const d of fs.readdirSync(modules)) roots.push(path.join(modules, d, 'backend', 'src'));
  return roots.filter((r) => fs.existsSync(r));
}

function literalPublishes(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const root of backendRoots()) {
    for (const file of sourceFiles(root)) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(PUBLISH_RE)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        const files = found.get(m[1]) ?? [];
        if (!files.includes(rel)) files.push(rel);
        found.set(m[1], files);
      }
    }
  }
  return found;
}

const declared = new Set<string>([
  ...Object.values(KAFKA_TOPICS),
  ...Object.values(PUBLISHED_TOPICS),
]);

describe('Kafka topic registry', () => {
  it('scans a real fleet: at least ten backends publish something', () => {
    expect(backendRoots().length).toBeGreaterThanOrEqual(10);
    expect(literalPublishes().size).toBeGreaterThan(100);
  });

  it('declares every topic a backend publishes by literal name', () => {
    const offenders = [...literalPublishes().entries()]
      .filter(([name]) => !declared.has(name))
      .map(([name, files]) => `${name}  ← ${files.join(', ')}`);
    expect(offenders.join('\n')).toBe('');
  });

  it('declares only names the provisioner can create, each once', () => {
    const all = [...Object.values(KAFKA_TOPICS), ...Object.values(PUBLISHED_TOPICS)];
    const bad = all.filter((n) => !TOPIC_NAME.test(n));
    expect(bad).toEqual([]);
    const dupes = all.filter((n, i) => all.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it('reads the same names the provisioner reads', () => {
    // The provisioner does not import this module; it regexes the file. The
    // two views must agree or a declared topic could still be never created.
    const src = fs.readFileSync(path.join(__dirname, 'kafka-topics.constants.ts'), 'utf8');
    const scanned = new Set([...src.matchAll(/:\s*'([a-z0-9][a-z0-9._-]*)'/g)].map((m) => m[1]));
    for (const name of declared) expect(scanned.has(name)).toBe(true);
    expect(scanned.size).toBe(declared.size);
  });
});
