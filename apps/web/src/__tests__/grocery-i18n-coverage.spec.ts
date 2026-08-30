import fs from 'fs';
import path from 'path';
import { t, missingTranslationKeys } from '@/i18n/grocery-locale';

/**
 * Every key the grocery UI asks for must have an Arabic translation.
 *
 * `t()` falls back to the English key when there is none, which is the right
 * runtime behaviour — a shopper mid-checkout is better served by a word they
 * may not read than by a blank. But it also meant the module sat at 9%
 * coverage with every page on the shopping path untranslated and nothing
 * anywhere reporting it.
 *
 * This reads the actual `tr('…')` call sites out of the source, so adding a new
 * one without its Arabic fails here rather than silently shipping English to
 * Doha.
 */
const SRC = path.join(process.cwd(), 'src');
const ROOTS = [path.join(SRC, 'app', 'grocery'), path.join(SRC, 'components', 'grocery')];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

/** Every literal key passed to `tr()` across the grocery UI. */
function trKeys(): { key: string; file: string }[] {
  const out: { key: string; file: string }[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\btr\(\s*(['"])(.+?)\1\s*\)/g)) {
        // A key written with an escaped quote — tr('they\'re gone') — arrives
        // here with the backslash still in it. Resolve it, or the lookup is for
        // a key that does not exist and the test reports a phantom gap.
        // A key written with an escaped quote arrives here with the backslash
        // still attached. Resolve it, or the lookup targets a key that does not
        // exist and the test reports a gap that is not there.
        const key = m[2].split("\\'").join("'").split('\\"').join('"');
        out.push({ key, file: path.relative(SRC, file).split(path.sep).join('/') });
      }
    }
  }
  return out;
}

describe('grocery Arabic coverage', () => {
  const keys = trKeys();

  it('finds the call sites at all, so a broken scan cannot pass vacuously', () => {
    expect(keys.length).toBeGreaterThan(80);
  });

  it('has an Arabic translation for every key the UI requests', () => {
    const missing = [...new Set(
      keys.filter(({ key }) => t(key, true) === key).map(({ key }) => key),
    )];
    // Named in the failure so the fix is obvious: add these to AR_TRANSLATIONS.
    expect(missing).toEqual([]);
  });

  it('records a missing key rather than swallowing it', () => {
    // The reporting side of the same guard — `t()` used to return the English
    // and say nothing at all.
    const before = missingTranslationKeys().length;
    t('__definitely_not_translated__', true);
    expect(missingTranslationKeys().length).toBe(before + 1);
    expect(missingTranslationKeys()).toContain('__definitely_not_translated__');
  });

  it('leaves English untouched when Arabic is off', () => {
    expect(t('Checkout', false)).toBe('Checkout');
  });

  it('covers the shopping path, not just the homepage chrome', () => {
    // These pages were at zero: an Arabic shopper saw English from the moment
    // they opened a shop through to placing the order.
    const byFile = new Map<string, number>();
    for (const { file } of keys) byFile.set(file, (byFile.get(file) ?? 0) + 1);

    for (const page of [
      'app/grocery/cart/page.tsx',
      'app/grocery/checkout/page.tsx',
      'app/grocery/product/[id]/page.tsx',
      'app/grocery/store/[slug]/page.tsx',
      'app/grocery/search/page.tsx',
      'app/grocery/stores/page.tsx',
      'app/grocery/orders/page.tsx',
    ]) {
      expect(byFile.get(page) ?? 0).toBeGreaterThan(5);
    }
  });
});
