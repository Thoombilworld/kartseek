/**
 * The product detail model — the one place the catalogue's response becomes
 * what the page renders. These pin the properties that keep the page honest:
 * the payable price is the buy-box offer's, availability follows the stock the
 * button is gated on, specifications only ever come from the product's own
 * attribute values, and a seller row is never carried through.
 */
import {
  normaliseProductDetail,
  deriveAvailability,
  deriveHighlights,
  groupSpecifications,
  attributeDisplayValue,
  schemaAvailability,
  schemaCondition,
  type ProductAttributeValue,
} from '@/lib/marketplace/product-detail';

const ID = '2b3c706d-185e-4b7e-86e2-00b29682c552';

const attr = (over: Partial<ProductAttributeValue>): ProductAttributeValue => ({
  id: over.slug ?? 'x',
  slug: 'x',
  name: 'X',
  group: 'General',
  type: 'TEXT',
  value: 'v',
  unit: null,
  displayValue: 'v',
  isHighlight: false,
  sortOrder: 0,
  ...over,
});

function detail(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: 'iPhone 15 Pro (256GB)',
    slug: 'iphone-15-pro-256gb',
    short_description: 'Short',
    long_description: '',
    mrp: '153609.00',
    averageRating: 4.9,
    reviewCount: 12400,
    approval_status: 'APPROVED',
    is_active: true,
    brand: { id: 'b1', name: 'Apple', slug: 'apple' },
    category: { id: 'c1', name: 'Mobiles & Tablets', slug: 'mobiles-tablets' },
    subcategory: { id: 'c2', name: 'Smartphones', slug: 'smartphones' },
    images: [
      { url: 'https://img/2.jpg', isPrimary: false, sortOrder: 0 },
      { url: 'https://img/1.jpg', isPrimary: true, sortOrder: 1 },
    ],
    listings: [
      {
        id: 'l-dear',
        sellingPrice: '140000.00',
        mrp: '153609.00',
        stockQuantity: 3,
        isBuyBoxWinner: false,
        isActive: true,
        condition: 'NEW',
        sellerSku: 'SKU-DEAR',
        seller: {
          id: 's2',
          businessName: 'Dear Seller',
          verificationStatus: 'PENDING',
          sellerRating: 0,
        },
      },
      {
        id: 'l-bb',
        sellingPrice: '132603.00',
        mrp: '153609.00',
        stockQuantity: 344,
        isBuyBoxWinner: true,
        isActive: true,
        condition: 'NEW',
        sellerSku: 'SKU-BB',
        seller: {
          id: 's1',
          businessName: 'KartSeek Official Store',
          storeSlug: 'kartseek-official-in',
          verificationStatus: 'VERIFIED',
          sellerRating: 4.8,
          totalReviews: 12,
          regionCode: 'IN',
        },
      },
      {
        id: 'l-off',
        sellingPrice: '1.00',
        isActive: false,
        isBuyBoxWinner: false,
        stockQuantity: 9,
        seller: { id: 's3', businessName: 'Withdrawn' },
      },
    ],
    variants: [],
    attributes: [
      {
        id: 'a1',
        slug: 'model',
        name: 'Model',
        group: 'General',
        type: 'TEXT',
        value: 'iPhone 15 Pro',
        unit: null,
        displayValue: 'iPhone 15 Pro',
        isHighlight: false,
        sortOrder: 1,
      },
      {
        id: 'a2',
        slug: 'processor',
        name: 'Processor',
        group: 'Performance',
        type: 'TEXT',
        value: 'A17 Pro',
        unit: null,
        displayValue: 'A17 Pro',
        isHighlight: true,
        sortOrder: 2,
      },
      {
        id: 'a3',
        slug: 'display-size',
        name: 'Display size',
        group: 'Display',
        type: 'NUMBER',
        value: 6.1,
        unit: 'inch',
        displayValue: '6.1 inch',
        isHighlight: true,
        sortOrder: 3,
      },
      {
        id: 'a4',
        slug: 'warranty',
        name: 'Warranty',
        group: 'Warranty',
        type: 'TEXT',
        value: '1 year manufacturer warranty',
        unit: null,
        displayValue: '1 year manufacturer warranty',
        isHighlight: false,
        sortOrder: 9,
      },
    ],
    ...over,
  };
}

describe('normaliseProductDetail', () => {
  it('prices from the buy-box offer, not the list price or the cheapest row', () => {
    const p = normaliseProductDetail(detail(), 'IN');
    expect(p.price).toBe(132603);
    expect(p.listPrice).toBe(153609);
    expect(p.discountPercent).toBe(14);
    expect(p.offer?.id).toBe('l-bb');
    expect(p.sku).toBe('SKU-BB');
  });

  it('keeps every live offer, buy box first, and drops withdrawn ones', () => {
    const p = normaliseProductDetail(detail(), 'IN');
    expect(p.offers.map((o) => o.id)).toEqual(['l-bb', 'l-dear']);
  });

  it('carries only public seller fields onto an offer', () => {
    const raw = detail();
    (raw.listings[1].seller as any).bankAccountNumber = '0000';
    (raw.listings[1].seller as any).email = 'x@y';
    const p = normaliseProductDetail(raw, 'IN');
    const offer = p.offer as any;
    expect(offer.sellerName).toBe('KartSeek Official Store');
    expect(offer.verified).toBe(true);
    expect(offer.storeSlug).toBe('kartseek-official-in');
    expect(Object.keys(offer)).not.toContain('bankAccountNumber');
    expect(Object.keys(offer)).not.toContain('email');
    expect(Object.keys(offer)).not.toContain('seller');
  });

  it('orders the gallery primary-first and de-duplicates', () => {
    const p = normaliseProductDetail(detail(), 'IN');
    expect(p.images).toEqual(['https://img/1.jpg', 'https://img/2.jpg']);
  });

  it('builds specification groups from the product’s own attributes, in group order', () => {
    const p = normaliseProductDetail(detail(), 'IN');
    expect(p.specificationGroups.map((g) => g.group)).toEqual([
      'General',
      'Performance',
      'Display',
      'Warranty',
    ]);
    expect(p.specificationGroups[2].attributes[0].displayValue).toBe('6.1 inch');
  });

  it('derives highlights from flagged attributes only, never from copy', () => {
    const p = normaliseProductDetail(detail(), 'IN');
    expect(p.highlights).toEqual(['Processor: A17 Pro', 'Display size: 6.1 inch']);
  });

  it('prefers server-sent highlights and specification groups when present', () => {
    const p = normaliseProductDetail(
      detail({
        highlights: ['A17 Pro', '48 MP camera'],
        specificationGroups: [
          {
            group: 'Camera',
            attributes: [
              {
                id: 'z',
                slug: 'rear',
                name: 'Rear camera',
                type: 'TEXT',
                value: '48 MP',
                displayValue: '48 MP',
              },
            ],
          },
        ],
      }),
      'IN',
    );
    expect(p.highlights).toEqual(['A17 Pro', '48 MP camera']);
    expect(p.specificationGroups.map((g) => g.group)).toEqual(['Camera']);
  });

  it('reads the warranty from the warranty attribute and nothing else', () => {
    expect(normaliseProductDetail(detail(), 'IN').warranty).toBe('1 year manufacturer warranty');
    expect(normaliseProductDetail(detail({ attributes: [] }), 'IN').warranty).toBeNull();
  });

  it('renders no specifications for a product without attribute values', () => {
    const p = normaliseProductDetail(detail({ attributes: [] }), 'IN');
    expect(p.attributes).toEqual([]);
    expect(p.specificationGroups).toEqual([]);
    expect(p.highlights).toEqual([]);
  });

  it('still reads legacy metadata.specifications when the new shape is absent', () => {
    const p = normaliseProductDetail(
      detail({
        attributes: undefined,
        metadata: {
          specifications: [{ groupName: 'Box', attributes: [{ key: 'Cable', value: 'USB-C' }] }],
        },
      }),
      'IN',
    );
    expect(p.specificationGroups).toEqual([
      {
        group: 'Box',
        attributes: [expect.objectContaining({ name: 'Cable', displayValue: 'USB-C' })],
      },
    ]);
  });

  it('is unavailable, with no price, when no seller offers it in the market', () => {
    const p = normaliseProductDetail(detail({ listings: [] }), 'AE');
    expect(p.price).toBe(0);
    expect(p.offer).toBeNull();
    expect(p.availability).toEqual({ status: 'unavailable', stock: 0, hasVariants: false });
  });

  it('is public only when approved and active', () => {
    expect(normaliseProductDetail(detail(), 'IN').isPublic).toBe(true);
    expect(normaliseProductDetail(detail({ approval_status: 'REJECTED' }), 'IN').isPublic).toBe(
      false,
    );
    expect(normaliseProductDetail(detail({ is_active: false }), 'IN').isPublic).toBe(false);
  });

  it('accepts only a real GTIN, never the minted internal identifier', () => {
    expect(
      normaliseProductDetail(detail({ globalTradeItemNumber: '0194253000000' }), 'IN').gtin,
    ).toBe('0194253000000');
    expect(
      normaliseProductDetail(detail({ globalTradeItemNumber: 'KS-ABC123-DEF4' }), 'IN').gtin,
    ).toBeNull();
  });
});

describe('deriveAvailability', () => {
  const offer = normaliseProductDetail(detail(), 'IN').offer!;

  it('follows the buy-box stock for a product without SKUs', () => {
    expect(deriveAvailability({ ...offer, stockQuantity: 344 }, [])).toEqual({
      status: 'in_stock',
      stock: 344,
      hasVariants: false,
    });
    expect(deriveAvailability({ ...offer, stockQuantity: 3 }, [])).toEqual({
      status: 'low_stock',
      stock: 3,
      hasVariants: false,
    });
    expect(deriveAvailability({ ...offer, stockQuantity: 0 }, [])).toEqual({
      status: 'out_of_stock',
      stock: 0,
      hasVariants: false,
    });
  });

  it('sums SKU stock for a variant product and never reports low stock across SKUs', () => {
    const variants = [{ stockQuantity: 2 }, { stockQuantity: 0 }, { stockQuantity: 1 }];
    expect(deriveAvailability(offer, variants)).toEqual({
      status: 'in_stock',
      stock: 3,
      hasVariants: true,
    });
    expect(deriveAvailability(offer, [{ stockQuantity: 0 }])).toEqual({
      status: 'out_of_stock',
      stock: 0,
      hasVariants: true,
    });
  });
});

describe('attribute helpers', () => {
  it('formats values with their unit and booleans as words', () => {
    expect(attributeDisplayValue({ value: 6.7, unit: 'inch' })).toBe('6.7 inch');
    expect(attributeDisplayValue({ value: true })).toBe('Yes');
    expect(attributeDisplayValue({ value: 'false', type: 'BOOLEAN' })).toBe('No');
    expect(attributeDisplayValue({ value: ['Wi-Fi 6', 'NFC'] })).toBe('Wi-Fi 6, NFC');
    expect(attributeDisplayValue({ value: '', displayValue: undefined })).toBe('');
  });

  it('groups by definition order and caps highlights at eight', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      attr({
        slug: `a${i}`,
        name: `Attr ${i}`,
        group: i % 2 ? 'B' : 'A',
        sortOrder: 10 - i,
        isHighlight: true,
        displayValue: String(i),
      }),
    );
    expect(groupSpecifications(rows).map((g) => g.group)).toEqual(['B', 'A']);
    expect(deriveHighlights(rows)).toHaveLength(8);
    expect(deriveHighlights(rows)[0]).toBe('Attr 9: 9');
  });

  it('turns a true boolean highlight into the attribute name alone', () => {
    const rows = [
      attr({
        slug: 'five-g',
        name: '5G',
        type: 'BOOLEAN',
        value: true,
        displayValue: 'Yes',
        isHighlight: true,
      }),
    ];
    expect(deriveHighlights(rows)).toEqual(['5G']);
  });
});

describe('schema.org mapping', () => {
  it('maps availability and condition to the values the page shows', () => {
    expect(schemaAvailability({ status: 'in_stock', stock: 10, hasVariants: false })).toBe(
      'InStock',
    );
    expect(schemaAvailability({ status: 'low_stock', stock: 2, hasVariants: false })).toBe(
      'LimitedAvailability',
    );
    expect(schemaAvailability({ status: 'out_of_stock', stock: 0, hasVariants: false })).toBe(
      'OutOfStock',
    );
    expect(schemaAvailability({ status: 'unavailable', stock: 0, hasVariants: false })).toBe(
      'OutOfStock',
    );
    expect(schemaCondition('REFURBISHED')).toBe('RefurbishedCondition');
    expect(schemaCondition('used')).toBe('UsedCondition');
    expect(schemaCondition(undefined)).toBe('NewCondition');
  });
});
