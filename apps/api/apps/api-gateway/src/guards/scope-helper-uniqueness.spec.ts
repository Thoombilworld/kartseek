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
   * A `where` OBJECT is a predicate too, and the bare-equality test above
   * cannot see one.
   *
   * `findAndCount({ where })` needs no query builder, so
   * `if (market) where.regionCode = market` reads as ordinary assignment and
   * sailed past the bare-equality scan — which is exactly how the
   * delivery-assignments list kept a `normaliseMarket`-only gate after every
   * builder site had been converted (R2-1). A market on a `where` object must
   * come from a REFUSING helper, so an unreadable value cannot simply drop the
   * key and return every market.
   *
   * Three shapes, because a market predicate can be written three ways and the
   * first version of this test only saw the first:
   *
   *   where.regionCode = m                         assignment
   *   { where: { regionCode: m } }                 object literal
   *   ...(cc ? { countryCode: cc } : {})           conditional spread
   *
   * `market-boundary-exempt:` is deliberately NOT honoured here (R3-3). That
   * marker excuses a SHAPE — "this equality is a config key, not a boundary" —
   * and the only thing this test asks for is a refusing helper, which no shape
   * argument can excuse. Honouring it meant the marker alone would have kept
   * this test green if a future edit deleted the `requireMarket` call at the
   * one site the test was written for.
   */
  it('a market on a where object comes from a refusing helper', () => {
    const COL = '(?:regionCode|region_code|countryCode|country_code)';
    // A bare identifier, not a member expression, a string literal or
    // `IsNull()`. The distinction is the whole point: `driver.countryCode`
    // compares one loaded row against another and cannot silently drop;
    // `{ countryCode: cc }` where `cc` may be `undefined` drops the KEY, and a
    // `where` with no market key returns every market.
    const VAL = String.raw`[A-Za-z_$][\w$]*`;
    const SHAPES = [
      // where.regionCode = m   /   whereFoo['region_code'] = m
      new RegExp(String.raw`where\w*(?:\.${COL}\b|\[['"]${COL}['"]\])\s*=\s*${VAL}\s*[;,)]?\s*$`),
      // ...(cc ? { countryCode: cc } : {})  — the conditional spread.
      new RegExp(String.raw`\.\.\.\(\s*${VAL}\s*\?[^)]*\b${COL}\s*:`),
      // x ? { … regionCode: x … } : …  — an object literal the same ternary can
      // drop entirely. Both halves on one line is the shape that occurs here.
      new RegExp(String.raw`\b${VAL}\s*\?[^?]*\b${COL}\s*:\s*${VAL}[^?]*:`),
    ];
    const offenders: string[] = [];
    for (const file of sources()) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (!SHAPES.some((re) => re.test(line))) return;
        // A type position is not a predicate.
        if (/Promise<|interface |type \w+ =|@Column|select:/.test(line)) return;
        // An explicit IS NULL is an inclusive read, not a boundary.
        if (/IsNull\(/.test(line)) return;
        // A WRITE payload is not a predicate either. `...(market ? {
        // regionCode: market } : {})` onto a `dto` FORCES a market onto a
        // create; an absent market there is the documented global-admin path,
        // not a dropped boundary.
        if (/\bdto\b|payload|\bactor\b/.test(line)) return;
        // An actor/claim object — `{ ownerId, role, ...(region ? … : {}) }` —
        // carries the same shape and is not a predicate. The method name sits
        // above the line, so this looks at the lines just above it.
        if (/ownerId|\brole\s*:/.test(lines.slice(Math.max(0, i - 5), i + 1).join('\n'))) return;

        const window = lines.slice(Math.max(0, i - 20), i + 6).join('\n');
        // Only a line that is actually building a query is in scope. An actor
        // object or a response projection carries the same shape and is not a
        // boundary — `gateway.controller.ts`'s claim projection, for one.
        const isQuery = /\bwhere\b|\.(?:count|find|findOne|findOneBy|findAndCount)\(/.test(window);
        if (!isQuery) return;
        // The value must come from a REFUSING helper. `normaliseMarket` is
        // pointedly absent: returning `undefined` for a code it cannot read is
        // precisely how these sites fail open. `marketPredicate` is absent too
        // (R3-2) — it refuses an unreadable LOCK but deliberately ignores an
        // unreadable REQUESTED value, so it is only half a refusal.
        if (/requireMarket\(|assertInMarket\(|assertRecordMarket\(/.test(window)) return;
        offenders.push(`${path.relative(REPO, file)}:${i + 1} ${line.trim().slice(0, 90)}`);
      });
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * And a refusing helper cannot be fed a permissive value.
   *
   * This is the hole the first two gates structurally could not see, and the
   * reason there was a round four. `applyMarketFilter(qb, col, market)` looks
   * correct at every call site — the helper IS the shared one, the column IS
   * right — while `const market = normaliseMarket(filters.countryCode)` six
   * lines above has already turned an unreadable lock into `undefined`. The
   * helper then adds no predicate and the read covers every market. The gate
   * proved the helper was *used*; it never proved what reached its scope slot.
   *
   * So: a variable derived from `normaliseMarket(` may not be used as a market
   * BOUNDARY. It stays perfectly legal for normalising a value to compare, to
   * store, or to hand to `assertInMarket` (which refuses on its own) — the ban
   * is on it becoming the predicate.
   */
  it('no boundary is derived from normaliseMarket alone', () => {
    const COL = '(?:regionCode|region_code|countryCode|country_code)';
    const offenders: string[] = [];
    for (const file of sources()) {
      const src = fs.readFileSync(file, 'utf8');
      // Every `const x = normaliseMarket(...)` in the file, with its line.
      const derived = [...src.matchAll(/const\s+(\w+)\s*=\s*normaliseMarket\(/g)].map((m) => ({
        name: m[1],
        line: src.slice(0, m.index).split('\n').length,
      }));
      if (!derived.length) continue;
      const lines = src.split('\n');
      for (const { name, line } of derived) {
        // Does the declaration immediately refuse a falsy result? Then it is a
        // refusing gate of its own and the value is safe downstream.
        const after = lines.slice(line - 1, line + 4).join('\n');
        if (new RegExp(String.raw`!\s*${name}\b[^\n]*\b(?:throw|Exception)`).test(after)) continue;
        // A refusing declaration need not spell `throw` itself:
        // `if (!market) refuseUnattributable(...)` throws just as hard.
        if (
          new RegExp(
            String.raw`if\s*\(\s*!\s*${name}\s*\)[\s\S]{0,140}(?:throw|refuseUnattributable\(|requireMarket\()`,
          ).test(after)
        )
          continue;

        // Used in the SCOPE slot of a predicate helper, or as a where-object
        // market value? The scope slot is the third argument.
        const asScope = new RegExp(
          String.raw`applyMarketFilter\([^,]+,[^,]+,\s*${name}\s*[,)]|assertRecordMarket\([^,]+,[^,]+,\s*${name}\s*[,)]`,
        );
        const asWhere = new RegExp(
          String.raw`\b${COL}\s*:\s*${name}\b|where\w*\.${COL}\s*=\s*${name}\b`,
        );
        lines.forEach((l, i) => {
          if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
          if (!asScope.test(l) && !asWhere.test(l)) return;
          offenders.push(
            `${path.relative(REPO, file)}:${i + 1} \`${name}\` came from normaliseMarket — ` +
              `use requireMarket: ${l.trim().slice(0, 60)}`,
          );
        });
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * The same rule, inline: `applyMarketFilter(qb, col, normaliseMarket(x))`.
   */
  it('no predicate helper is called with normaliseMarket inline', () => {
    const INLINE = /(?:applyMarketFilter|assertRecordMarket)\([^;]*?,\s*normaliseMarket\(/;
    const offenders: string[] = [];
    for (const file of sources()) {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
          if (!INLINE.test(line)) return;
          const at = `${path.relative(REPO, file)}:${i + 1}`;
          if (PENDING_HANDOVER.some((p) => at.endsWith(p.at))) return;
          offenders.push(`${at} ${line.trim().slice(0, 90)}`);
        });
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * The hand-over list, and why it is in the spec rather than in the source.
   *
   * One site this gate flags is real and cannot be fixed by the agent that
   * found it: another agent holds uncommitted edits in the same file, and the
   * rule for this round is never to commit a file someone else is editing — a
   * rule written because committing one such file already cost that agent four
   * lines of work (see the report's round-3 incident).
   *
   * A `market-boundary-exempt:` comment in the source would be the wrong tool:
   * that marker says "this shape is not a boundary", which is false here, and
   * R3-3 is precisely the finding that such a marker can outlive the fix it was
   * standing in for. So the debt lives here, in the gate's own file, and the
   * gate polices it:
   *
   *   • the entry names the exact offending text, so the moment someone applies
   *     the fix the entry stops matching and the assertion below fails — the
   *     list cannot rot into a permanent exemption;
   *   • the list's length is pinned, so a second pending item cannot be added
   *     quietly.
   */
  const PENDING_HANDOVER = [
    {
      at: 'fulfillment.service.ts:1107',
      expect: "applyMarketFilter(qb, 's.region_code', normaliseMarket(query.region));",
      fix: "requireMarket(query.region, 'product reports', this.logger)",
      why: 'R12 holds uncommitted edits in this file (acceptAnswer); see task-11-report.md round 4',
    },
  ];

  it('the hand-over list is exactly what it claims, and no longer', () => {
    expect(PENDING_HANDOVER).toHaveLength(1);
    const stale: string[] = [];
    for (const pending of PENDING_HANDOVER) {
      const file = sources().find((f) => f.endsWith(pending.at.split(':')[0]));
      expect(file, `${pending.at}: file is gone — delete this entry`).toBeTruthy();
      const line = fs.readFileSync(file!, 'utf8').split('\n')[Number(pending.at.split(':')[1]) - 1];
      // If the fix has landed, the entry must go with it.
      if (!line || line.trim() !== pending.expect) {
        stale.push(
          `${pending.at} no longer reads as recorded — the fix has landed or moved; ` +
            `delete this PENDING_HANDOVER entry. Expected: ${pending.expect}`,
        );
      }
    }
    expect(stale.join('\n')).toBe('');
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
