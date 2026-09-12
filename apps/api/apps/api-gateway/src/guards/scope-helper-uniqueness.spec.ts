import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const GUARD = path.join(__dirname, 'market-scope.ts');
const COMMON = path.join(__dirname, '..', '..', '..', '..', 'libs', 'common', 'src', 'market');
/** apps/api/apps/api-gateway/src/guards -> the repo root. */
const REPO = path.join(__dirname, '..', '..', '..', '..', '..', '..');
/** Every tree a market predicate can be written in. */
const ROOTS = [
  path.join(REPO, 'apps', 'api', 'apps'),
  path.join(REPO, 'apps', 'api', 'libs'),
  path.join(REPO, 'modules'),
];

/** Every `.ts` file under `dir`, skipping build output and dependencies. */
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...walk(full));
    } else if (/\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Every non-spec `.ts` file in the monorepo's service and library trees. */
function sources(): string[] {
  return ROOTS.flatMap(walk).filter((f) => !/\.spec\.ts$/.test(f));
}

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
    const declarations = sources().filter((f) =>
      /export function resolveScope\(/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(declarations).toEqual([GUARD]);
  });
});

/**
 * The market predicate has the same problem in the other direction.
 *
 * 46 hand-written `andWhere('x.regionCode = :scope', …)` lines each spelled the
 * boundary slightly differently, and one of them spelled `qb.where` — which
 * REPLACES the clause rather than adding to it, so a status filter silently
 * returned every market's bank offers (audit V3). `applyMarketFilter` is the
 * one spelling; a service that re-implements it is a service that can get it
 * wrong again.
 *
 * Every check below scans the WHOLE monorepo — `apps/api/apps`, `apps/api/libs`
 * and every module backend under `modules/`. A scan of the gateway's
 * controllers alone would have passed while three private copies sat in
 * marketplace analytics, hotel and restaurant, and 46 hand-written predicates
 * sat in the module services.
 *
 * (Written without a `modules/<star>/backend` glob on purpose: a `*` followed
 * by a `/` closes this block comment, which is how `admin-seo.controller.ts:64`
 * once swallowed a `@Controller` and five routes — see the note in
 * `admin-market-scope.regression.spec.ts`.)
 */
describe('there is one implementation of the market predicate', () => {
  it('applyMarketFilter and assertRecordMarket are declared once, in libs/common', () => {
    const found: Record<string, string[]> = { applyMarketFilter: [], assertRecordMarket: [] };
    for (const file of sources()) {
      const src = fs.readFileSync(file, 'utf8');
      for (const name of Object.keys(found)) {
        // Concatenated, not a template literal: the generic `<` that follows
        // `applyMarketFilter` has to reach the regex, and oxc parses a `[<(]`
        // inside a template literal in a .ts file as the start of a type
        // argument list and fails the whole file to load.
        if (new RegExp('export function ' + name + '[<(]').test(src)) found[name].push(file);
      }
    }
    const home = path.join(COMMON, 'market-scope.ts');
    expect(found.applyMarketFilter).toEqual([home]);
    expect(found.assertRecordMarket).toEqual([home]);
  });

  /**
   * A private copy is the failure mode this spec exists to catch: a service that
   * writes its own `applyMarketFilter`/`marketFilter`/`scopeFilter` method has
   * opted out of the shared rule without deleting it, so the two drift and only
   * one of them is tested.
   *
   * Three such copies existed when R11's fix round started — marketplace
   * analytics, hotel, and restaurant's `scopeToRegion` — each carrying a doc
   * comment saying "a private method rather than a shared helper because
   * `@app/common` has no query-builder half yet". It has one now, so that reason
   * is spent, and a fourth copy would be a silent opt-out.
   */
  it('nothing in the monorepo keeps a private market-filter helper', () => {
    // The rule is about the BODY, not the name — the same rule as `scopeOf`
    // above. A named wrapper is welcome and often necessary: restaurant's
    // `scopeToRegion` carries this module's `LEFT(r.regionCode, 2)` column
    // expression, and catalog's carries an inclusive raw predicate. What must
    // not come back is a body that writes the market clause itself.
    const NAMES =
      /private\s+(?:static\s+)?(?:async\s+)?(applyMarketFilter|marketFilter|scopeFilter|scopeToRegion|marketPredicate|assertRecordMarket|inMarketFilter)\s*[<(]([\s\S]*?)\n {2}\}/g;
    const OWN_CLAUSE =
      /(?:and)?[wW]here\(\s*[`'"][^`'"]*(?:regionCode|region_code|countryCode|country_code)[^`'"]*=\s*:/;
    const offenders: string[] = [];
    for (const file of sources()) {
      const src = fs.readFileSync(file, 'utf8');
      for (const [, name, body] of src.matchAll(NAMES)) {
        if (!OWN_CLAUSE.test(body)) continue;
        offenders.push(`${path.relative(REPO, file)}: private ${name} writes its own clause`);
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * And the predicate is never spelled by hand where it is a market BOUNDARY.
   *
   * What remains legitimately is a different predicate, not a boundary: an
   * INCLUSIVE storefront read (`… IS NULL OR … = :region`, which deliberately
   * admits market-agnostic rows such as a coupon that runs everywhere), and raw
   * SQL template strings that never touch a query builder. Both are recognised
   * by shape below, so a new bare equality on a builder fails this test.
   *
   * A third case exists and is NOT recognised by shape, because it cannot be:
   * a market column read as a CONFIGURATION KEY rather than as a boundary
   * (`payment_method_configs.countryCode` — "which methods does this country
   * offer"). Those carry `// market-boundary-exempt: <reason>` on the line
   * above, which makes the exemption greppable and reviewable instead of
   * invisible. It is a claim about the code, not a way to be excused from the
   * rule: `git log -S 'market-boundary-exempt'` lists every one ever added.
   */
  it('no bare market equality remains on a query builder', () => {
    const COLUMN = '(?:regionCode|region_code|countryCode|country_code)';
    const BARE = new RegExp(String.raw`\.(?:and)?[wW]here\(\s*[\`'"][^\`'"]*\b${COLUMN}\b\s*=\s*:`);
    const offenders: string[] = [];
    for (const file of sources()) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!BARE.test(line)) return;
        // An inclusive read is not a boundary.
        if (/IS NULL/.test(line)) return;
        // A declared, reasoned exemption anywhere in the contiguous comment
        // block immediately above — the reason usually needs more than one line.
        let j = i - 1;
        let exempt = false;
        while (j >= 0 && /^\s*(\/\/|\*|\/\*)/.test(lines[j])) {
          if (/market-boundary-exempt:/.test(lines[j])) {
            exempt = true;
            break;
          }
          j--;
        }
        if (exempt) return;
        offenders.push(`${path.relative(REPO, file)}:${i + 1} ${line.trim().slice(0, 90)}`);
      });
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('every market-boundary exemption gives a reason', () => {
    const bare: string[] = [];
    for (const file of sources()) {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const m = line.match(/market-boundary-exempt:(.*)$/);
          if (!m) return;
          if (m[1].trim().length < 12) {
            bare.push(`${path.relative(REPO, file)}:${i + 1} exemption without a reason`);
          }
        });
    }
    expect(bare.join('\n')).toBe('');
  });

  /**
   * No admin authorisation path may read `applicableCountries`.
   *
   * The exchange-offer entity carried its market only in that simple-array,
   * which is the fourth of the four encodings §2(c) names. It has `region_code`
   * and `is_global` now; the array stays as the customer-facing eligibility
   * list. An admin list filter or record assert that reads it is back to
   * comparing a scope against comma-joined text, where a two-market offer
   * equals no market at all (C1, audit AUD2-082).
   */
  it('admin scoping never authorises on the legacy applicableCountries array', () => {
    const offenders: string[] = [];
    for (const file of sources()) {
      if (!/[\\/](admin|analytics)[\\/]/.test(file)) continue;
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (!/applicableCountries/.test(line)) return;
          // Prose about the array is not a read of it — and this file is full of
          // prose about exactly that, which is the point.
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
          // A market ASSERT on the array, or an equality PREDICATE on it. An
          // inclusive storefront read (`… IS NULL OR …`) is allowed: the array
          // stays as the customer-facing eligibility list, and a row the
          // backfill could not reduce to one market still has to be shown.
          const asserts = /assert\w*\([^)]*applicableCountries/.test(line);
          const equality = /applicableCountries\s*=\s*:/.test(line) && !/IS NULL/.test(line);
          if (!asserts && !equality) return;
          offenders.push(`${path.relative(REPO, file)}:${i + 1} ${line.trim().slice(0, 90)}`);
        });
    }
    expect(offenders.join('\n')).toBe('');
  });
});
