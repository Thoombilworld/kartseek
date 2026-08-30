import { mapCatalogProduct, unwrapCatalogList, mapCatalogList } from '@/lib/api/map-catalog-product';

/**
 * The gateway wraps every response as `{ success, data }` and the paged catalogue
 * payload is itself `{ data, total, page, limit }`, so rows sit at `data.data`.
 * Four separate call sites read `json.data.length` instead — the length of an
 * object, always `undefined` — so the guard never passed and best-sellers, deals,
 * flash-deals and new-arrivals silently kept rendering their bundled demo arrays
 * while a live catalogue sat behind them.
 */
describe('unwrapCatalogList', () => {
  it('finds rows inside the gateway envelope around a paged payload', () => {
    const json = { success: true, data: { data: [{ id: 'a' }, { id: 'b' }], total: 2, page: 1 } };

    expect(unwrapCatalogList(json)).toHaveLength(2);
  });

  it('accepts an already-unwrapped paged payload', () => {
    expect(unwrapCatalogList({ data: [{ id: 'a' }], total: 1 })).toHaveLength(1);
  });

  it('accepts a bare array', () => {
    expect(unwrapCatalogList([{ id: 'a' }])).toHaveLength(1);
  });

  it('returns empty rather than throwing on an unexpected shape', () => {
    expect(unwrapCatalogList(null)).toEqual([]);
    expect(unwrapCatalogList({ success: false })).toEqual([]);
    expect(unwrapCatalogList({ data: { total: 0 } })).toEqual([]);
  });
});

describe('mapCatalogProduct', () => {
  const row = {
    id: 'p1',
    name: 'iPhone 15 Pro',
    mrp: '134900.00',
    averageRating: 4.9,
    reviewCount: 12400,
    brand: { name: 'Apple' },
    category: { slug: 'mobiles-tablets' },
    images: [{ url: 'second.jpg' }, { url: 'primary.jpg', isPrimary: true }],
  };

  it('reads the entity field names the cards do not use', () => {
    const p: any = mapCatalogProduct(row);

    expect(p.title).toBe('iPhone 15 Pro');   // entity says `name`
    expect(p.brand).toBe('Apple');           // entity says `{ brand: { name } }`
    expect(p.reviews).toBe(12400);           // entity says `reviewCount`
    expect(p.rating).toBe(4.9);              // entity says `averageRating`
  });

  it('converts the decimal price string to a number', () => {
    const p: any = mapCatalogProduct(row);

    // `mrp` is a decimal column, so TypeORM returns a string. Left as-is it makes
    // discount maths and subtotals concatenate instead of add.
    expect(p.mrp).toBe(134900);
    expect(typeof p.mrp).toBe('number');
  });

  it('prices from the buy-box listing when one is present', () => {
    const p: any = mapCatalogProduct({
      ...row,
      listings: [{ sellingPrice: '120000.00' }, { sellingPrice: '115900.00', isBuyBoxWinner: true }],
    });

    expect(p.price).toBe(115900);
  });

  it('falls back to MRP when the listing endpoint omits listings', () => {
    // These endpoints join brand/category/images but not listings, so a mapper
    // that priced from `sellingPrice` alone rendered every card at zero.
    const p: any = mapCatalogProduct(row);

    expect(p.price).toBe(134900);
    expect(p.price).not.toBe(0);
  });

  it('prefers the primary image over the first one', () => {
    expect((mapCatalogProduct(row) as any).imageUrl).toBe('primary.jpg');
  });

  it('survives a row with nothing on it', () => {
    const p: any = mapCatalogProduct({});

    expect(p.id).toBe('');
    expect(p.price).toBe(0);
    expect(Number.isNaN(p.mrp)).toBe(false);
  });
});

describe('mapCatalogList', () => {
  it('drops rows with no id, which could only link to a 404', () => {
    const json = { success: true, data: { data: [{ id: 'p1', name: 'A' }, { name: 'no id' }] } };

    const rows = mapCatalogList(json);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('p1');
  });
});
