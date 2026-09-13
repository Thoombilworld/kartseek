import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * AUD2-076 — `KEYS` blocks the whole server, and thirteen request paths called it.
 *
 * Redis is single-threaded and `KEYS` is O(N) over the entire keyspace: for as
 * long as the scan runs, Redis serves nobody — not this service, not the other
 * twenty-five, not the session lookups on the critical path of every request.
 * A development database with 297 keys hides that completely, which is how an
 * admin opening the KYC queue, a courier fetching their active deliveries and a
 * seller opening a refund report all came to stall the platform.
 *
 * `scanKeys()` answers the same question with a cursor loop.
 */
const cfg = () => ({ get: (_k: string, fallback?: unknown) => fallback }) as any;

let silenced: ReturnType<typeof vi.spyOn>[];
beforeEach(() => {
  silenced = [
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {}),
  ];
});
afterEach(() => {
  for (const s of silenced) s.mockRestore();
  vi.unstubAllEnvs();
});

/** A service whose SCAN walks a real, multi-page cursor. */
function withPagedClient(pages: Array<[string, string[]]>) {
  const svc = new RedisService(cfg());
  (svc as any).isSkipped = false;
  const scan = vi.fn();
  for (const page of pages) scan.mockResolvedValueOnce(page);
  (svc as any).client = { status: 'ready', scan, keys: vi.fn() };
  return { svc, scan };
}

describe('RedisService.scanKeys', () => {
  it('walks the cursor to the end rather than stopping at the first page', async () => {
    const { svc } = withPagedClient([
      ['17', ['a:1', 'a:2']],
      ['42', ['a:3']],
      ['0', ['a:4']],
    ]);
    expect((await svc.scanKeys('a:*')).sort()).toEqual(['a:1', 'a:2', 'a:3', 'a:4']);
  });

  it('passes the pattern as MATCH and a bounded COUNT', async () => {
    const { svc, scan } = withPagedClient([['0', []]]);
    await svc.scanKeys('delivery:assignment:*');
    expect(scan).toHaveBeenCalledWith('0', 'MATCH', 'delivery:assignment:*', 'COUNT', '500');
  });

  it('deduplicates keys SCAN returned twice', async () => {
    // SCAN may return a key more than once when the keyspace is resized
    // mid-scan. Every caller here counts what comes back — active deliveries,
    // pending refunds, banned IPs — so a duplicate is a wrong number on an
    // admin console, not a harmless extra.
    const { svc } = withPagedClient([
      ['9', ['dup', 'x']],
      ['0', ['dup', 'y']],
    ]);
    expect((await svc.scanKeys('*')).sort()).toEqual(['dup', 'x', 'y']);
  });

  it('never calls the blocking KEYS command', async () => {
    const { svc } = withPagedClient([['0', ['k']]]);
    await svc.scanKeys('*');
    expect((svc as any).client.keys).not.toHaveBeenCalled();
  });

  it('answers from the emulator outside production', async () => {
    const svc = new RedisService(cfg());
    (svc as any).isSkipped = true;
    await svc.set('cart:u1', '{}');
    await svc.set('cart:u2', '{}');
    await svc.set('order:o1', '{}');
    expect((await svc.scanKeys('cart:*')).sort()).toEqual(['cart:u1', 'cart:u2']);
  });
});

/**
 * The call sites, checked in the source: a helper nobody calls fixes nothing,
 * and the failure mode here is invisible in development, so the only thing that
 * keeps it fixed is a check that reads the tree.
 *
 * `redis.service.ts` itself is excluded — it is where `keys()` is defined and
 * where the comment telling callers to prefer `scanKeys()` lives.
 */
describe('nothing on a request path calls KEYS', () => {
  const repoRoot = path.join(__dirname, '..', '..', '..', '..', '..');

  const ROOTS = [
    path.join(repoRoot, 'apps', 'api', 'apps'),
    path.join(repoRoot, 'apps', 'api', 'libs'),
    path.join(repoRoot, 'modules'),
  ];

  function walk(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.next', 'build'].includes(entry.name)) continue;
        walk(full, out);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        out.push(full);
      }
    }
    return out;
  }

  it('leaves no `redis.keys(` call anywhere in the application tree', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        if (path.basename(file) === 'redis.service.ts') continue;
        const src = fs.readFileSync(file, 'utf8');
        if (/\.redis\.keys\(|redisService\.keys\(/.test(src)) {
          offenders.push(path.relative(repoRoot, file).replace(/\\/g, '/'));
        }
      }
    }
    // The fix is `scanKeys(pattern)` — identical return shape — or
    // `delPattern(pattern)` when the loop only deletes what it finds.
    expect(offenders).toEqual([]);
  });
});
