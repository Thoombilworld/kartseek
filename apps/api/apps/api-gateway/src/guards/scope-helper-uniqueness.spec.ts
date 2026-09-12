import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const GUARD = path.join(__dirname, 'market-scope.ts');
const COMMON = path.join(__dirname, '..', '..', '..', '..', 'libs', 'common', 'src', 'market');

/**
 * `private scopeOf` stays as the name every handler calls — the market-scope
 * regression spec matches `this.scopeOf(` in a handler body, and a base class
 * or a parameter decorator would hide the call from it. What must not stay is
 * fourteen copies of the BODY: an authorisation helper duplicated fourteen
 * times is fourteen chances for one of them to drift, which is how `qb.where`
 * came to discard a market predicate (audit V3).
 */
describe('there is one implementation of scopeOf', () => {
  const files = fs.readdirSync(CONTROLLERS).filter((f) => /\.controller\.ts$/.test(f));

  it('every scopeOf delegates to resolveScope and computes nothing itself', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(path.join(CONTROLLERS, file), 'utf8');
      const m = src.match(/private scopeOf\([\s\S]*?\n {2}\}/);
      if (!m) continue;
      const body = m[0];
      if (!/return resolveScope\(/.test(body)) offenders.push(`${file}: does not delegate`);
      if (/marketScopeOf\(/.test(body)) offenders.push(`${file}: still computes the lock itself`);
      // A delegate is three lines at most.
      if (body.split('\n').length > 8) offenders.push(`${file}: body is longer than a delegate`);
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('at least twelve controllers hold one, so the helper is genuinely shared', () => {
    const n = files.filter((f) =>
      /private scopeOf\(/.test(fs.readFileSync(path.join(CONTROLLERS, f), 'utf8')),
    ).length;
    expect(n).toBeGreaterThanOrEqual(12);
  });

  it('resolveScope is declared exactly once, in the gateway guard', () => {
    const declarations: string[] = [];
    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          scan(full);
          continue;
        }
        if (!/\.ts$/.test(entry.name) || /\.spec\.ts$/.test(entry.name)) continue;
        const src = fs.readFileSync(full, 'utf8');
        if (/export function resolveScope\(/.test(src)) declarations.push(full);
      }
    };
    scan(path.join(__dirname, '..', '..', '..', '..'));
    expect(declarations).toEqual([GUARD]);
  });
});

/**
 * The market predicate has the same problem in the other direction.
 *
 * ~40 hand-written `andWhere('x.regionCode = :scope', …)` lines each spelled the
 * boundary slightly differently, and one of them spelled `qb.where` — which
 * REPLACES the clause rather than adding to it, so a status filter silently
 * returned every market's bank offers (audit V3). `applyMarketFilter` is the
 * one spelling; a service that re-implements it is a service that can get it
 * wrong again.
 */
describe('there is one implementation of the market predicate', () => {
  it('applyMarketFilter and assertRecordMarket are declared once, in libs/common', () => {
    const found: Record<string, string[]> = { applyMarketFilter: [], assertRecordMarket: [] };
    const scan = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          scan(full);
          continue;
        }
        if (!/\.ts$/.test(entry.name) || /\.spec\.ts$/.test(entry.name)) continue;
        const src = fs.readFileSync(full, 'utf8');
        for (const name of Object.keys(found)) {
          if (new RegExp(`export function ${name}[<(]`).test(src)) found[name].push(full);
        }
      }
    };
    scan(path.join(__dirname, '..', '..', '..', '..'));
    const home = path.join(COMMON, 'market-scope.ts');
    expect(found.applyMarketFilter).toEqual([home]);
    expect(found.assertRecordMarket).toEqual([home]);
  });

  /**
   * A private copy is the failure mode this spec exists to catch: a service that
   * writes its own `applyMarketFilter`/`marketFilter`/`scopeFilter` method has
   * opted out of the shared rule without deleting it, so the two drift and only
   * one of them is tested.
   */
  it('no controller keeps a private market-filter helper beside the shared one', () => {
    const offenders: string[] = [];
    for (const file of fs.readdirSync(CONTROLLERS).filter((f) => /\.ts$/.test(f))) {
      if (/\.spec\.ts$/.test(file)) continue;
      const src = fs.readFileSync(path.join(CONTROLLERS, file), 'utf8');
      const copy = src.match(
        /private\s+(?:static\s+)?(applyMarketFilter|marketFilter|scopeFilter|marketPredicate|assertRecordMarket)\s*[<(]/,
      );
      if (copy) offenders.push(`${file}: private ${copy[1]}`);
    }
    expect(offenders.join('\n')).toBe('');
  });
});
