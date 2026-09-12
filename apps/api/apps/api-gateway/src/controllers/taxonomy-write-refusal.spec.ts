import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Every write to the global catalogue taxonomy refuses a region-locked admin in
 * its OWN handler block. Five `PUT`/`PATCH` aliases used to call `scopeOf`
 * instead and lean on the handler they delegated to — which is a rule stated in
 * one place and enforced in another (audit I8).
 *
 * `scopeOf` on a taxonomy route is not merely redundant, it is the wrong rule:
 * it *resolves a market* for an entity that has none, so it answers "which
 * market may this caller act in" where the only correct answer is "none, this
 * row belongs to every market". It also passes a global admin silently, which
 * is why the delegation looked like it worked.
 *
 * Two corrections to the pattern this spec was specified with:
 *
 *  * the route matcher has no leading `/` — the decorators read
 *    `@Patch('brands/:id')`, so a pattern anchored on `/brands` matched nothing
 *    at all and the count assertion below could never have passed;
 *  * a handler block ends at the next route decorator, not after a fixed number
 *    of lines. `@Put('hsn-codes/:id')` is six lines from `@Put('bank-offers/:id')`,
 *    which legitimately calls `this.scopeOf` — a fixed window reads that as
 *    this route's own call.
 */
const FILE = path.join(__dirname, 'admin-marketplace.controller.ts');
const TAXONOMY = /'(categories|subcategories|attributes|brands|hsn-codes)(\/|')/;
const WRITE = /^\s*@(Post|Put|Patch|Delete)\(/;
const ROUTE = /^\s*@(Get|Post|Put|Patch|Delete|All)\(/;

/**
 * Comments blanked, line count preserved.
 *
 * These assertions search for the code the fix removed, and the fix quotes that
 * code in the comment explaining it — so a naive scan matches the prose
 * describing the rule and reports the route as an offender. `admin-market-scope.
 * regression.spec.ts` strips comments outright; blanking them instead keeps the
 * line numbers in the failure message pointing at real lines.
 */
function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');
}

describe('taxonomy writes refuse locked admins at the route', () => {
  const src = blankComments(fs.readFileSync(FILE, 'utf8')).split('\n');
  const routeLines = src.map((l, i) => ({ l, i })).filter(({ l }) => ROUTE.test(l));
  const routes = routeLines
    .map(({ l, i }, idx) => ({
      l,
      i,
      end: idx + 1 < routeLines.length ? routeLines[idx + 1].i : src.length,
    }))
    .filter(({ l }) => WRITE.test(l) && TAXONOMY.test(l));

  it('finds the taxonomy write routes at all', () => {
    expect(routes.length).toBeGreaterThanOrEqual(12);
  });

  it('every one calls refuseLockedAdmin and none calls this.scopeOf', () => {
    const offenders: string[] = [];
    for (const { l, i, end } of routes) {
      const block = src.slice(i, end).join('\n');
      if (!/refuseLockedAdmin\(/.test(block) || /this\.scopeOf\(/.test(block)) {
        offenders.push(`${l.trim()} (line ${i + 1})`);
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('states one refusal, in one wording, everywhere', () => {
    // An alias that answered differently from the handler it delegates to would
    // tell the console two different things about the same row.
    const src2 = src.join('\n');
    const wordings = new Set(
      [...src2.matchAll(/refuseLockedAdmin\(req, 'catalogue taxonomy', ([^)]*)\)/g)].map((m) =>
        m[1].trim(),
      ),
    );
    expect([...wordings]).toEqual(["'Catalogue taxonomy is managed globally.'"]);
  });
});
