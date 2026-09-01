/**
 * Product URL building.
 *
 * These paths carry a uuid behind a human-readable slug, and the page resolves
 * the product by the uuid — the slug is decorative. The cases below pin the two
 * properties that matter: the uuid always survives into the path, and a product
 * with nothing to build a slug from still yields a URL that resolves rather
 * than a malformed one like `/product/-<uuid>`.
 */
import { productPath, parseProductParam } from '@/lib/marketplace/product-url';

const ID = '80086222-f748-4281-8968-5a3949f50bef';

describe('productPath', () => {
  it('puts the slug in front of the id', () => {
    expect(productPath({ id: ID, slug: 'himalaya-ashwagandha-60' }))
      .toBe(`/marketplace/product/himalaya-ashwagandha-60-${ID}`);
  });

  it('derives a slug from the name when none is stored', () => {
    const p = productPath({ id: ID, name: 'Himalaya Ashwagandha Capsules, 60s' });
    expect(p.startsWith('/marketplace/product/himalaya-ashwagandha')).toBe(true);
    expect(p.endsWith(ID)).toBe(true);
  });

  it('falls back to the bare id rather than emitting a dangling separator', () => {
    expect(productPath({ id: ID })).toBe(`/marketplace/product/${ID}`);
    expect(productPath({ id: ID, slug: '', name: '' })).toBe(`/marketplace/product/${ID}`);
  });

  it('accepts an already-built segment', () => {
    expect(productPath(`some-slug-${ID}`)).toBe(`/marketplace/product/some-slug-${ID}`);
  });

  it('sends an unusable product to the storefront, never to a broken URL', () => {
    expect(productPath(null)).toBe('/marketplace');
    expect(productPath(undefined)).toBe('/marketplace');
    expect(productPath({ id: '' })).toBe('/marketplace');
  });

  it('always carries the module prefix', () => {
    for (const input of [{ id: ID }, { id: ID, slug: 'x' }, null]) {
      expect(productPath(input as any).startsWith('/marketplace')).toBe(true);
    }
  });
});

describe('parseProductParam', () => {
  it('recovers the id from a slugged segment', () => {
    expect(parseProductParam(`himalaya-ashwagandha-60-${ID}`).id).toBe(ID);
  });

  it('recovers a bare id', () => {
    expect(parseProductParam(ID).id).toBe(ID);
  });

  it('reports no id when the segment was never one of ours', () => {
    expect(parseProductParam('not-a-product').id).toBeNull();
    expect(parseProductParam(undefined).id).toBeNull();
  });
});
