import { buildBrandLookup } from '@/lib/api/resolve-brand-link';

/**
 * A slice of the real catalogue: brands carry a uuid `id`, a `name` and a
 * `slug`, and the storefront links by slug.
 */
const BRANDS = [
  { id: '80918dda-9b8f-4233-b32d-1a80d5d5c0e0', name: 'Apple',  slug: 'apple',  logoUrl: null, bannerUrl: null, description: null, isVerified: true, followerCount: 0 },
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Samsung', slug: 'samsung', logoUrl: null, bannerUrl: null, description: null, isVerified: true, followerCount: 0 },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', name: 'Sony',   slug: 'sony',   logoUrl: null, bannerUrl: null, description: null, isVerified: true, followerCount: 0 },
  { id: 'aaaaaaaa-0000-4000-8000-000000000003', name: 'Nike',   slug: 'nike',   logoUrl: null, bannerUrl: null, description: null, isVerified: true, followerCount: 0 },
  { id: 'aaaaaaaa-0000-4000-8000-000000000004', name: 'Dyson',  slug: 'dyson',  logoUrl: null, bannerUrl: null, description: null, isVerified: true, followerCount: 0 },
  { id: 'aaaaaaaa-0000-4000-8000-000000000005', name: "Levi's", slug: 'levis',  logoUrl: null, bannerUrl: null, description: null, isVerified: true, followerCount: 0 },
];

const lookup = buildBrandLookup(BRANDS);

describe('brand promo resolution', () => {
  it('is ready once brands have loaded', () => {
    expect(lookup.isReady).toBe(true);
    expect(buildBrandLookup([]).isReady).toBe(false);
  });

  /**
   * The live `/marketplace/home` feed sets promo ids to presentation keys —
   * `bp-e1`, `bp-e2` — which match no catalogue row. Linking by that id is what
   * produced "404 Page Not Found" on the Top Brands cards. Only the name is
   * usable, so it has to be the primary key.
   */
  it.each([
    ['bp-e1', 'Apple',   'apple'],
    ['bp-e2', 'Samsung', 'samsung'],
    ['bp-e3', 'Sony',    'sony'],
  ])('resolves a live-feed promo (id=%s, name=%s) to /%s', (id, name, slug) => {
    expect(lookup.resolve({ id, name })).toBe(slug);
  });

  it('accepts a bundled promo whose id is already a real slug', () => {
    expect(lookup.resolve({ id: 'apple', name: 'Apple' })).toBe('apple');
  });

  it('trusts the slug the feed now supplies, in preference to the name', () => {
    // Server-side resolution ships `{ id: <uuid>, slug, name }`.
    expect(lookup.resolve({ id: '80918dda-9b8f-4233-b32d-1a80d5d5c0e0', slug: 'apple', name: 'Apple' })).toBe('apple');
  });

  it('ignores a slug the catalogue does not have and falls back to the name', () => {
    expect(lookup.resolve({ slug: 'not-a-real-brand', name: 'Sony' })).toBe('sony');
  });

  it('recovers a promo whose id is wrong but whose name is right', () => {
    // BRAND_PROMOS ships `{ id: 'nike-sport', name: 'Nike' }` — the id matches
    // no brand, the name matches Nike.
    expect(lookup.resolve({ id: 'nike-sport', name: 'Nike' })).toBe('nike');
  });

  it('normalises punctuation when falling back to a slugified name', () => {
    expect(lookup.resolve({ id: 'whatever', name: "Levi's" })).toBe('levis');
  });

  /**
   * Dropping beats guessing. "Dyson Beauty" is plausibly Dyson's line, but the
   * catalogue has no such brand and inventing the mapping would send shoppers to
   * a store that does not carry the advertised products.
   */
  it.each([
    ['dyson-beauty', 'Dyson Beauty'],
    ['loreal',       "L'Oréal"],
    ['zara',         'ZARA'],
    ['mac',          'MAC'],
    ['oneplus',      'OnePlus'],
    ['whirlpool',    'Whirlpool'],
    ['fitbit',       'Fitbit'],
  ])('returns null for %s, which the catalogue does not carry', (id, name) => {
    expect(lookup.resolve({ id, name })).toBeNull();
  });

  it('is case-insensitive on names', () => {
    expect(lookup.resolve({ id: 'x', name: 'APPLE' })).toBe('apple');
    expect(lookup.resolve({ id: 'x', name: 'apple' })).toBe('apple');
  });

  it('handles malformed promos without throwing', () => {
    expect(lookup.resolve({} as any)).toBeNull();
    expect(lookup.resolve({ id: undefined, name: undefined })).toBeNull();
    expect(lookup.resolve(null as any)).toBeNull();
  });

  it('never returns a slug the catalogue does not have', () => {
    const known = new Set(BRANDS.map(b => b.slug));
    const promos = [
      { id: 'bp-e1', name: 'Apple' }, { id: 'nike-sport', name: 'Nike' },
      { id: 'zara', name: 'ZARA' }, { id: 'mac', name: 'MAC' },
      { id: 'dyson-beauty', name: 'Dyson Beauty' }, { id: 'bp-x', name: 'Nonexistent' },
    ];
    for (const p of promos) {
      const slug = lookup.resolve(p);
      if (slug !== null) expect(known.has(slug)).toBe(true);
    }
  });
});
