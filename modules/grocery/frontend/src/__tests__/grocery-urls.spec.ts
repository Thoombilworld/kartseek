import {
  toSlug,
  storePath,
  productPath,
  parseIdParam,
  isCanonicalStoreParam,
  isCanonicalProductParam,
} from '@/lib/grocery/urls';

const STORE_ID = '126e8f9a-7b6f-4cb0-b5fd-13a6c96f2789';
const PROD_ID = 'dea052b6-16e7-4da7-9475-ed0aa91d9f3e';

/**
 * Readable grocery URLs, with the uuid still doing the lookup.
 *
 * The slug in front of the id is decorative by design: names are not unique
 * across shops and they change, so resolving by name would need an index the
 * schema does not have and would break every shared link on the first rename.
 * That only holds if parsing ignores the slug entirely — which is what most of
 * these cases pin.
 */
describe('grocery URLs', () => {
  describe('toSlug', () => {
    it('reduces a name to a safe path segment', () => {
      expect(toSlug('Atlantic Salmon Fillet')).toBe('atlantic-salmon-fillet');
      expect(toSlug('Lulu Hypermarket')).toBe('lulu-hypermarket');
    });

    it('folds accents to their base letters rather than percent-encoding', () => {
      expect(toSlug('Crème Fraîche')).toBe('creme-fraiche');
    });

    it('strips characters that would change what the path means', () => {
      // Separators and traversal segments must not survive into a URL.
      expect(toSlug('a/b')).toBe('ab');
      expect(toSlug('../../etc/passwd')).toBe('etcpasswd');
      expect(toSlug('a?b=c#d')).toBe('abcd');
      expect(toSlug('<script>alert(1)</script>')).toBe('scriptalert1script');
    });

    it('yields an empty string for a name with nothing latin in it', () => {
      // Arabic product names reduce to empty, which is why the builders fall
      // back to the bare uuid instead of emitting a dangling "-<uuid>".
      expect(toSlug('سمك السلمون')).toBe('');
    });

    it('never ends in a separator, even after truncation', () => {
      const long = 'a'.repeat(40) + ' ' + 'b'.repeat(40);
      expect(toSlug(long).endsWith('-')).toBe(false);
    });
  });

  describe('building paths', () => {
    it('puts the store name in front of the id', () => {
      expect(storePath({ id: STORE_ID, slug: 'lulu-doha-corniche' }))
        .toBe(`/store/lulu-doha-corniche-${STORE_ID}`);
    });

    it('carries both the store and product names when the caller knows them', () => {
      expect(productPath({ id: PROD_ID, name: 'Atlantic Salmon Fillet', storeName: 'Lulu Hypermarket' }))
        .toBe(`/product/lulu-hypermarket-atlantic-salmon-fillet-${PROD_ID}`);
    });

    it('still builds a usable path when the shop is unknown', () => {
      // Search results and wishlist rows have the product but not its shop.
      expect(productPath({ id: PROD_ID, name: 'Atlantic Salmon Fillet' }))
        .toBe(`/product/atlantic-salmon-fillet-${PROD_ID}`);
    });

    it('falls back to the bare uuid rather than a dangling separator', () => {
      expect(productPath({ id: PROD_ID, name: 'سمك السلمون' }))
        .toBe(`/product/${PROD_ID}`);
      expect(storePath({ id: STORE_ID, name: '' })).toBe(`/store/${STORE_ID}`);
    });

    it('does not invent a path for a product with no id', () => {
      expect(productPath({ id: '', name: 'Salmon' })).toBe('/');
      expect(productPath(null)).toBe('/');
      expect(storePath(undefined)).toBe('/stores');
    });
  });

  describe('parsing a route parameter', () => {
    it('recovers the id from a slugged segment', () => {
      expect(parseIdParam(`lulu-hypermarket-atlantic-salmon-fillet-${PROD_ID}`))
        .toEqual({ id: PROD_ID, slug: 'lulu-hypermarket-atlantic-salmon-fillet' });
    });

    it('accepts a bare uuid, so old links keep working', () => {
      expect(parseIdParam(PROD_ID)).toEqual({ id: PROD_ID, slug: null });
    });

    it('ignores the slug entirely when resolving', () => {
      // The whole design rests on this: a stale or hand-edited slug must not
      // change which record is fetched.
      expect(parseIdParam(`completely-wrong-name-${PROD_ID}`).id).toBe(PROD_ID);
      expect(parseIdParam(`../../admin-${PROD_ID}`).id).toBe(PROD_ID);
    });

    it('refuses a segment with no uuid in it', () => {
      // `id: null` is what the page uses to 404 instead of querying with junk.
      expect(parseIdParam('just-a-name')).toEqual({ id: null, slug: null });
      expect(parseIdParam('')).toEqual({ id: null, slug: null });
      expect(parseIdParam(undefined)).toEqual({ id: null, slug: null });
      expect(parseIdParam('00000000-0000-0000-0000')).toEqual({ id: null, slug: null });
    });

    it('survives a malformed percent-escape', () => {
      // decodeURIComponent throws on a lone '%'; the page must not.
      expect(() => parseIdParam('%')).not.toThrow();
      expect(parseIdParam('%')).toEqual({ id: null, slug: null });
    });
  });

  describe('canonical form', () => {
    const store = { id: STORE_ID, slug: 'lulu-doha-corniche' };
    const product = { id: PROD_ID, name: 'Atlantic Salmon Fillet', storeName: 'Lulu Hypermarket' };

    it('recognises the canonical segment', () => {
      expect(isCanonicalStoreParam(`lulu-doha-corniche-${STORE_ID}`, store)).toBe(true);
      expect(isCanonicalProductParam(`lulu-hypermarket-atlantic-salmon-fillet-${PROD_ID}`, product)).toBe(true);
    });

    it('rejects a bare uuid and a stale slug, so both redirect', () => {
      expect(isCanonicalStoreParam(STORE_ID, store)).toBe(false);
      expect(isCanonicalProductParam(`old-name-${PROD_ID}`, product)).toBe(false);
    });
  });
});
