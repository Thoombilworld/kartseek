import fs from 'node:fs';
import path from 'node:path';

/**
 * Guard against the zone prefix being written twice.
 *
 * Each zone under `modules` sets its own `basePath`, and Next prepends it to
 * every `next/link` href, every `router.push`/`replace`, and every
 * `redirect()`/`permanentRedirect()`. Anything that already carries the prefix
 * is therefore emitted twice — `/marketplace/marketplace/product/x` — which
 * matches no route. The zone's layout still renders, so the visitor gets the
 * module's own chrome wrapped around a 404 and nothing upstream looks broken.
 *
 * Two ways in, and this pins both:
 *
 *   1. a literal:  <Link href="/marketplace/cart">
 *   2. a helper:   <Link href={productPath(p)}>   — productPath returns the
 *      full public path, which is right for the shell, for canonical URLs and
 *      for the sitemap, and doubled here. Wrap it in zoneHref().
 *
 * Which zone a helper belongs to is decided by its import source, never its
 * name: `productPath` exists in both @/lib/marketplace/product-url and
 * @/lib/grocery/urls and returns a different prefix from each.
 */

const ROOT = path.resolve(__dirname, '../../../..');

const ZONES: Record<string, string> = {
  marketplace: '/marketplace', grocery: '/grocery', restaurant: '/restaurant',
  pharmacy: '/pharmacy', doctor: '/doctor', hotel: '/hotel-booking',
  taxi: '/taxi', franchise: '/franchise',
};

/** import specifier -> the zone prefix everything it exports carries */
const HELPER_SOURCES: [RegExp, string][] = [
  [/@\/lib\/marketplace\/product-url/, '/marketplace'],
  [/@\/lib\/routes\/marketplace-routes/, '/marketplace'],
  [/@\/lib\/grocery\/urls/, '/grocery'],
  [/@\/lib\/routes\/grocery-routes/, '/grocery'],
  [/@\/lib\/routes\/doctor-routes/, '/doctor'],
  [/@\/lib\/routes\/pharmacy-routes/, '/pharmacy'],
  [/@\/lib\/routes\/restaurant-routes/, '/restaurant'],
  [/@\/lib\/routes\/taxi-routes/, '/taxi'],
];

/** Contexts Next rewrites with basePath. */
const NAV_HEAD = String.raw`(?:href=\{|href:\s*|router\.(?:push|replace)\(\s*|(?:permanent)?[Rr]edirect\(\s*)`;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.next', '__tests__'].includes(e.name)) walk(p, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Route-helper identifiers imported into this file, mapped to their zone. */
function importedHelpers(src: string): Record<string, string> {
  const owners: Record<string, string> = {};
  for (const m of src.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?$/gm)) {
    const hit = HELPER_SOURCES.find(([re]) => re.test(m[2]));
    if (!hit) continue;
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop()!.trim();
      if (name) owners[name] = hit[1];
    }
  }
  return owners;
}

const violations: string[] = [];

for (const [zone, prefix] of Object.entries(ZONES)) {
  for (const file of walk(path.join(ROOT, 'modules', zone, 'frontend/src'))) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const lines = src.split('\n');

    // (1) a literal carrying this zone's own prefix, in a basePath-aware slot
    const literalRe = new RegExp(`${NAV_HEAD}["'\`]\\${prefix}(?=["'\`/?#])`);
    lines.forEach((line, i) => {
      if (!literalRe.test(line)) return;
      violations.push(
        `${rel}:${i + 1}  literal '${prefix}...' in a basePath-aware slot — drop the prefix\n` +
        `      ${line.trim().slice(0, 96)}`,
      );
    });

    // (2) a same-zone helper result not passed through zoneHref
    const owners = importedHelpers(src);
    for (const [helper, owner] of Object.entries(owners)) {
      if (owner !== prefix) continue;               // another zone's path: needs ZoneLink, not this
      const re = new RegExp(`${NAV_HEAD}(${helper}(?:\\.[A-Za-z_$][\\w$]*)?\\s*\\()`, 'g');
      for (const m of src.matchAll(re)) {
        const line = src.slice(0, m.index).split('\n').length;
        violations.push(
          `${rel}:${line}  ${helper}() returns the full public path — wrap it in zoneHref()\n` +
          `      ${lines[line - 1].trim().slice(0, 96)}`,
        );
      }
    }
  }
}

describe('zone basePath is applied exactly once', () => {
  it('no navigation target carries its own zone prefix', () => {
    expect(violations).toEqual([]);
  });
});
