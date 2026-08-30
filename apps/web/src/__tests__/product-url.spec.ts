import { productPath, parseProductParam, isCanonicalProductParam, toProductSlug } from '@/lib/marketplace/product-url';

/**
 * The parser is what keeps every existing product link alive.
 *
 * Product URLs were bare uuids for the whole life of the storefront, so every
 * shared link, every search-engine index entry and every order confirmation
 * points at that shape. If `parseProductParam` fails to recover the uuid from
 * one of them the page 404s, and no amount of correct new-URL behaviour makes up
 * for that. These cases exist to pin the shapes that must keep resolving.
 */

const UUID = 'd104fae6-e7f3-4a15-9154-fa365c78e4d0';

describe('parseProductParam', () => {
  it('recovers the id from a legacy bare uuid', () => {
    expect(parseProductParam(UUID)).toEqual({ id: UUID, slug: null });
  });

  it('recovers the id from the canonical slug-uuid form', () => {
    expect(parseProductParam(`samsung-s24-ultra-256gb-${UUID}`))
      .toEqual({ id: UUID, slug: 'samsung-s24-ultra-256gb' });
  });

  it('splits on the uuid, not on the last dash', () => {
    // The whole reason parsing is anchored on the uuid's shape: a slug contains
    // dashes, so "split on the final dash" would return `…-fa365c78e4d0` as the
    // id and lose the rest.
    const { id, slug } = parseProductParam(`a-b-c-d-e-${UUID}`);
    expect(id).toBe(UUID);
    expect(slug).toBe('a-b-c-d-e');
  });

  it('is case-insensitive about the uuid', () => {
    expect(parseProductParam(UUID.toUpperCase()).id).toBe(UUID.toUpperCase());
  });

  it('reports no id for a segment carrying no uuid', () => {
    // The page turns this into a 404 rather than a lookup that cannot succeed.
    expect(parseProductParam('samsung-s24-ultra')).toEqual({ id: null, slug: null });
    expect(parseProductParam('')).toEqual({ id: null, slug: null });
    expect(parseProductParam(undefined)).toEqual({ id: null, slug: null });
  });

  it('rejects a uuid-shaped string that is not a full uuid', () => {
    expect(parseProductParam('d104fae6-e7f3-4a15-9154').id).toBeNull();
  });
});

describe('productPath', () => {
  it('prefers the stored slug', () => {
    expect(productPath({ id: UUID, slug: 'samsung-s24-ultra-256gb', name: 'Something Else' }))
      .toBe(`/marketplace/product/samsung-s24-ultra-256gb-${UUID}`);
  });

  it('derives a slug from the name when the catalogue has none', () => {
    expect(productPath({ id: UUID, name: 'Samsung Galaxy S24 Ultra (12GB, 256GB)' }))
      .toBe(`/marketplace/product/samsung-galaxy-s24-ultra-12gb-256gb-${UUID}`);
  });

  it('falls back to the bare uuid rather than emitting a dangling separator', () => {
    // A URL that resolves beats one that reads well; `-<uuid>` would be worse
    // than either.
    expect(productPath({ id: UUID })).toBe(`/marketplace/product/${UUID}`);
    expect(productPath({ id: UUID, name: '!!!' })).toBe(`/marketplace/product/${UUID}`);
  });

  it('round-trips: every path it builds parses back to the same id', () => {
    for (const product of [
      { id: UUID, slug: 'samsung-s24-ultra-256gb' },
      { id: UUID, name: 'Crème Brûlée Ramekin Set — 4 Pack' },
      { id: UUID },
    ]) {
      const path = productPath(product);
      const segment = path.replace('/marketplace/product/', '');
      expect(parseProductParam(segment).id).toBe(UUID);
    }
  });
});

describe('isCanonicalProductParam', () => {
  const product = { id: UUID, slug: 'samsung-s24-ultra-256gb' };

  it('accepts the canonical segment', () => {
    expect(isCanonicalProductParam(`samsung-s24-ultra-256gb-${UUID}`, product)).toBe(true);
  });

  it('rejects the legacy bare uuid, so it redirects', () => {
    expect(isCanonicalProductParam(UUID, product)).toBe(false);
  });

  it('rejects a stale slug from before a rename, so it redirects', () => {
    expect(isCanonicalProductParam(`samsung-s24-ultra-128gb-${UUID}`, product)).toBe(false);
  });
});

describe('toProductSlug', () => {
  it('strips accents rather than percent-encoding them', () => {
    expect(toProductSlug('Crème Brûlée')).toBe('creme-brulee');
  });

  it('collapses punctuation and whitespace', () => {
    expect(toProductSlug('Apple iPad Pro 12.9" M2 Chip (256GB)')).toBe('apple-ipad-pro-129-m2-chip-256gb');
  });

  it('leaves no leading or trailing dash', () => {
    expect(toProductSlug('  --Hello--  ')).toBe('hello');
  });

  it('caps the length without leaving a trailing dash', () => {
    const slug = toProductSlug('word '.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});
