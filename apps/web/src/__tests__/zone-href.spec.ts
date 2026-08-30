/**
 * zoneHref must undo exactly the prefix that basePath will re-add — no more.
 *
 * The regression this guards: the marketplace zone rendered
 * `<Link href={productPath(p)}>`, productPath returned the full public path,
 * and basePath prepended the zone prefix a second time. Every product card on
 * every category page pointed at /marketplace/marketplace/product/... — the
 * zone's chrome around a 404.
 */

const load = (basePath: string | undefined) => {
  jest.resetModules();
  const prev = process.env.NEXT_PUBLIC_ZONE_BASE_PATH;
  if (basePath === undefined) delete process.env.NEXT_PUBLIC_ZONE_BASE_PATH;
  else process.env.NEXT_PUBLIC_ZONE_BASE_PATH = basePath;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../../../../packages/shared-core/src/routes/zone-href');
  process.env.NEXT_PUBLIC_ZONE_BASE_PATH = prev;
  return mod as typeof import('../../../../packages/shared-core/src/routes/zone-href');
};

describe('zoneHref', () => {
  describe('inside the zone that owns the prefix', () => {
    it('strips the prefix so basePath can put it back', () => {
      const { zoneHref } = load('/marketplace');
      expect(zoneHref('/marketplace/product/abc')).toBe('/product/abc');
      expect(zoneHref('/marketplace/category/toys')).toBe('/category/toys');
    });

    it('maps the zone root to /', () => {
      const { zoneHref } = load('/marketplace');
      expect(zoneHref('/marketplace')).toBe('/');
    });

    it('keeps a query or fragment attached to the root', () => {
      const { zoneHref } = load('/marketplace');
      expect(zoneHref('/marketplace?sort=new')).toBe('/?sort=new');
      expect(zoneHref('/marketplace#reviews')).toBe('/#reviews');
    });

    it('does not strip a prefix that merely starts the same way', () => {
      // '/marketplacement' is not the marketplace zone.
      const { zoneHref } = load('/marketplace');
      expect(zoneHref('/marketplacement/x')).toBe('/marketplacement/x');
    });
  });

  describe('in the shell, which has no basePath', () => {
    it('returns the full public path unchanged', () => {
      const { zoneHref } = load(undefined);
      expect(zoneHref('/marketplace/product/abc')).toBe('/marketplace/product/abc');
      expect(zoneHref('/marketplace')).toBe('/marketplace');
    });
  });

  describe('pointing at a different zone', () => {
    it('leaves the path alone — those belong in ZoneLink, not next/link', () => {
      const { zoneHref } = load('/grocery');
      expect(zoneHref('/marketplace/product/abc')).toBe('/marketplace/product/abc');
    });
  });

  it('tolerates a null path', () => {
    const { zoneHref } = load('/marketplace');
    expect(zoneHref(null)).toBe('');
    expect(zoneHref(undefined)).toBe('');
  });
});
