/**
 * The product detail page's model: one typed shape, built once from the
 * catalogue's `GET /marketplace/products/:id?country=` response.
 *
 * Every component on the page used to read the raw entity — `name` here,
 * `title` there, `listings[]` in one place and a singular `listing` in another,
 * decimal columns as strings, prices coerced in four places. A field renamed on
 * the backend broke one reader and left the rest silently showing a fallback.
 * Reading the response in exactly one place is what makes the page's data
 * mapping auditable: this file *is* the backend → frontend mapping table.
 *
 * Nothing here invents data. A field the catalogue does not carry is `null`,
 * an empty array, or `'unavailable'`, and the page renders nothing for it.
 */

/** Attribute value kinds the catalogue's attribute definitions allow. */
export type AttributeValueType =
  | 'TEXT'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'COLOR'
  | 'DATE'
  | 'RANGE';

/** One product-specific attribute value, as the catalogue projects it. */
export interface ProductAttributeValue {
  id: string;
  slug: string;
  name: string;
  /** Specification group heading, e.g. "Display", "General". */
  group: string;
  type: AttributeValueType;
  value: string | number | boolean | string[] | null;
  unit: string | null;
  /** The value as the shopper should read it, unit included ("6.7 inch"). */
  displayValue: string;
  /** Whether the definition flags this value for the highlights list. */
  isHighlight: boolean;
  sortOrder: number;
}

export interface SpecificationGroup {
  group: string;
  attributes: ProductAttributeValue[];
}

/** One seller's offer on the product, in the market being browsed. */
export interface ProductOffer {
  id: string;
  sellerId: string | null;
  sellerName: string;
  storeSlug: string | null;
  sellerRating: number;
  sellerReviews: number;
  verified: boolean;
  condition: 'NEW' | 'REFURBISHED' | 'USED' | string;
  sellingPrice: number;
  listPrice: number;
  stockQuantity: number;
  isBuyBoxWinner: boolean;
  isFulfilledByKartseek: boolean;
  sellerSku: string | null;
  regionCode: string | null;
}

export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unavailable';

export interface ProductAvailability {
  status: AvailabilityStatus;
  /** Units the buy-box offer can sell, or the sum across SKUs for a variant product. */
  stock: number;
  /** True when the product has SKUs and the shopper must pick one. */
  hasVariants: boolean;
}

export interface ProductEntityRef {
  id: string;
  name: string;
  slug: string | null;
}

export interface ProductDetail {
  id: string;
  slug: string | null;
  name: string;
  shortDescription: string;
  longDescription: string;
  /** Seller-authored A+ content. Unsafe until it goes through `sanitizeHtml`. */
  richDescriptionHtml: string | null;
  brand: ProductEntityRef | null;
  category: ProductEntityRef | null;
  subcategory: ProductEntityRef | null;
  /** Primary first, de-duplicated. */
  images: string[];
  /** Ordered frames of a 360° capture; empty when none. */
  spinFrames: string[];
  /** The payable price in this market (buy-box offer), or 0 when no seller offers it. */
  price: number;
  /** Struck-through list price for the offer shown, or 0. */
  listPrice: number;
  discountPercent: number;
  /** The offer the page quotes: the buy-box winner, else the cheapest live one. */
  offer: ProductOffer | null;
  /** Every live offer in this market, buy box first. */
  offers: ProductOffer[];
  /** SKUs as the catalogue sends them; the variant context normalises them. */
  variants: any[];
  attributes: ProductAttributeValue[];
  specificationGroups: SpecificationGroup[];
  highlights: string[];
  /** Warranty statement from the `warranty` attribute, or null. */
  warranty: string | null;
  /** Box contents from the `whats-included` / `in-the-box` attribute, or empty. */
  whatsIncluded: string[];
  averageRating: number;
  reviewCount: number;
  /** The offer's SKU when there is one, else the catalogue GTIN, else null. */
  sku: string | null;
  /** A real GTIN/EAN/UPC (8–14 digits) for the merchant feed, or null. Minted internal ids are not one. */
  gtin: string | null;
  availability: ProductAvailability;
  /** The market the detail was resolved for. */
  market: string;
  /** Whether the storefront may show it. False only for a non-public read (seller preview). */
  isPublic: boolean;
}

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const ref = (raw: any): ProductEntityRef | null => {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id);
  const name = text(raw.name);
  if (!id && !name) return null;
  return { id, name, slug: text(raw.slug) || null };
};

/** Stock under which the page says "only N left". */
export const LOW_STOCK_THRESHOLD = 5;

const VALUE_TYPES: ReadonlySet<string> = new Set([
  'TEXT',
  'NUMBER',
  'BOOLEAN',
  'SELECT',
  'MULTI_SELECT',
  'COLOR',
  'DATE',
  'RANGE',
]);

function attributeType(raw: unknown): AttributeValueType {
  const upper = text(raw).toUpperCase();
  return (VALUE_TYPES.has(upper) ? upper : 'TEXT') as AttributeValueType;
}

/**
 * The value as prose. The catalogue sends `displayValue` already; this is the
 * fallback for a row that carries only the raw value, so a unit is never lost
 * and a boolean never renders as "true".
 */
export function attributeDisplayValue(row: {
  value: unknown;
  unit?: string | null;
  type?: string | null;
  displayValue?: unknown;
}): string {
  const given = text(row.displayValue);
  if (given) return given;
  const { value } = row;
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value))
    return value
      .map((v) => String(v))
      .filter(Boolean)
      .join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (attributeType(row.type) === 'BOOLEAN') {
    const s = String(value).toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' ? 'Yes' : 'No';
  }
  const unit = text(row.unit);
  return unit ? `${String(value)} ${unit}` : String(value);
}

export function normaliseAttribute(raw: any, index = 0): ProductAttributeValue | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = text(raw.name ?? raw.label ?? raw.key);
  if (!name) return null;
  const displayValue = attributeDisplayValue(raw);
  if (!displayValue) return null;
  return {
    id: text(raw.id) || `${text(raw.slug) || name}-${index}`,
    slug:
      text(raw.slug) ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    name,
    group: text(raw.group ?? raw.groupName) || 'General',
    type: attributeType(raw.type),
    value: raw.value === undefined ? null : raw.value,
    unit: text(raw.unit) || null,
    displayValue,
    isHighlight: Boolean(raw.isHighlight),
    sortOrder: num(raw.sortOrder),
  };
}

/**
 * Group attributes for the specification table, in definition order.
 *
 * Groups keep the order of their first attribute, so an admin who sorts
 * "General" attributes first gets a "General" section first.
 */
export function groupSpecifications(attributes: ProductAttributeValue[]): SpecificationGroup[] {
  const groups = new Map<string, ProductAttributeValue[]>();
  for (const attr of [...attributes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const list = groups.get(attr.group) ?? [];
    list.push(attr);
    groups.set(attr.group, list);
  }
  return [...groups.entries()].map(([group, rows]) => ({ group, attributes: rows }));
}

/** Legacy `metadata.specifications` rows, in either shape the field has carried. */
function legacySpecifications(metadata: any): ProductAttributeValue[] {
  const rows = metadata?.specifications;
  if (!Array.isArray(rows)) return [];
  const out: ProductAttributeValue[] = [];
  let i = 0;
  for (const row of rows) {
    if (Array.isArray(row?.attributes)) {
      for (const attr of row.attributes) {
        const norm = normaliseAttribute({ ...attr, group: row.groupName ?? row.group }, i++);
        if (norm) out.push(norm);
      }
    } else {
      const norm = normaliseAttribute(row, i++);
      if (norm) out.push(norm);
    }
  }
  return out;
}

/** ≤ 8 short lines for the highlights block, never hand-written. */
export const MAX_HIGHLIGHTS = 8;

export function deriveHighlights(attributes: ProductAttributeValue[], given?: unknown): string[] {
  const fromServer = Array.isArray(given) ? given.map((h) => text(h)).filter(Boolean) : [];
  if (fromServer.length) return fromServer.slice(0, MAX_HIGHLIGHTS);
  return attributes
    .filter((a) => a.isHighlight)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((a) =>
      a.type === 'BOOLEAN'
        ? a.displayValue === 'Yes'
          ? a.name
          : ''
        : `${a.name}: ${a.displayValue}`,
    )
    .filter(Boolean)
    .slice(0, MAX_HIGHLIGHTS);
}

/** Every image URL the row carries, primary first. Mirrors `productImageList`. */
function imageUrls(product: any): string[] {
  const rows: any[] = Array.isArray(product?.images) ? product.images : [];
  const ordered = [...rows].sort((a, b) => {
    const primary = Number(!!b?.isPrimary) - Number(!!a?.isPrimary);
    if (primary !== 0) return primary;
    return num(a?.sortOrder) - num(b?.sortOrder);
  });
  const urls = [
    ...ordered.map((row) => (typeof row === 'string' ? row : (row?.url ?? row?.imageUrl))),
    ...(Array.isArray(product?.metadata?.imageGalleryUrls)
      ? product.metadata.imageGalleryUrls
      : []),
    product?.imageUrl,
  ]
    .map((url) => text(url))
    .filter(Boolean);
  return [...new Set(urls)];
}

function normaliseOffer(raw: any): ProductOffer | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.isActive === false) return null;
  const seller = raw.seller && typeof raw.seller === 'object' ? raw.seller : null;
  return {
    id: text(raw.id),
    sellerId: text(seller?.id) || text(raw.sellerId) || null,
    sellerName: text(seller?.businessName) || text(seller?.name) || 'Seller',
    storeSlug: text(seller?.storeSlug) || null,
    sellerRating: num(seller?.sellerRating),
    sellerReviews: num(seller?.totalReviews),
    verified: seller?.verificationStatus === 'VERIFIED',
    condition: text(raw.condition).toUpperCase() || 'NEW',
    sellingPrice: num(raw.sellingPrice),
    listPrice: num(raw.mrp),
    stockQuantity: Math.max(0, Math.trunc(num(raw.stockQuantity))),
    isBuyBoxWinner: Boolean(raw.isBuyBoxWinner),
    isFulfilledByKartseek: Boolean(raw.isFulfilledByKartseek),
    sellerSku: text(raw.sellerSku) || null,
    regionCode: text(seller?.regionCode ?? seller?.region_code) || null,
  };
}

/**
 * Availability from the offer being quoted and the SKUs on sale.
 *
 * A variant product is "in stock" when any SKU is; the picker then greys out
 * the ones that are not. A product no seller offers in this market is
 * `unavailable`, which the page states rather than pricing at MRP.
 */
export function deriveAvailability(
  offer: ProductOffer | null,
  variants: any[],
): ProductAvailability {
  const hasVariants = variants.length > 0;
  if (!offer) return { status: 'unavailable', stock: 0, hasVariants };
  const stock = hasVariants
    ? variants.reduce(
        (sum, v) => sum + Math.max(0, Math.trunc(num(v?.stockQuantity ?? v?.stock))),
        0,
      )
    : offer.stockQuantity;
  if (stock <= 0) return { status: 'out_of_stock', stock: 0, hasVariants };
  if (!hasVariants && stock <= LOW_STOCK_THRESHOLD)
    return { status: 'low_stock', stock, hasVariants };
  return { status: 'in_stock', stock, hasVariants };
}

/** First attribute matching any of the slugs, by slug then by name. */
function findAttribute(
  attributes: ProductAttributeValue[],
  slugs: string[],
): ProductAttributeValue | null {
  for (const slug of slugs) {
    const hit = attributes.find(
      (a) => a.slug === slug || a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug,
    );
    if (hit) return hit;
  }
  return null;
}

/**
 * Build the page model from the catalogue's detail response.
 *
 * Accepts the shape the catalogue has served since 2026-09-13 (`attributes`,
 * `specificationGroups`, `highlights`, projected sellers) and the older one
 * (`metadata.specifications`, full seller rows) so a stale cache entry during a
 * deploy still renders rather than blanking the page.
 */
export function normaliseProductDetail(raw: any, market: string): ProductDetail {
  const product = raw && typeof raw === 'object' ? raw : {};
  const metadata: any =
    product.metadata && typeof product.metadata === 'object' ? product.metadata : {};

  const offersRaw: any[] = Array.isArray(product.listings) ? product.listings : [];
  const offers = offersRaw
    .map(normaliseOffer)
    .filter((o): o is ProductOffer => !!o && o.sellingPrice > 0)
    .sort((a, b) => {
      if (a.isBuyBoxWinner !== b.isBuyBoxWinner) return a.isBuyBoxWinner ? -1 : 1;
      return a.sellingPrice - b.sellingPrice;
    });
  const singular = normaliseOffer(product.listing);
  const offer = offers[0] ?? (singular && singular.sellingPrice > 0 ? singular : null);

  const variants: any[] = (Array.isArray(product.variants) ? product.variants : []).filter(
    (v: any) => v && v.isActive !== false,
  );

  const attributesRaw: any[] = Array.isArray(product.attributes) ? product.attributes : [];
  let attributes = attributesRaw
    .map((row, i) => normaliseAttribute(row, i))
    .filter((a): a is ProductAttributeValue => !!a);
  if (attributes.length === 0) attributes = legacySpecifications(metadata);

  const groupsRaw: any[] = Array.isArray(product.specificationGroups)
    ? product.specificationGroups
    : [];
  const specificationGroups: SpecificationGroup[] = groupsRaw.length
    ? groupsRaw
        .map((g: any) => ({
          group: text(g?.group ?? g?.groupName) || 'General',
          attributes: (Array.isArray(g?.attributes) ? g.attributes : [])
            .map((row: any, i: number) =>
              normaliseAttribute({ ...row, group: g?.group ?? g?.groupName }, i),
            )
            .filter((a: ProductAttributeValue | null): a is ProductAttributeValue => !!a),
        }))
        .filter((g: SpecificationGroup) => g.attributes.length > 0)
    : groupSpecifications(attributes);

  const listPrice = num(offer?.listPrice) || num(product.mrp);
  const price = num(offer?.sellingPrice);
  const discountPercent =
    listPrice > price && price > 0 ? Math.round(((listPrice - price) / listPrice) * 100) : 0;

  const warranty = findAttribute(attributes, ['warranty', 'warranty-period', 'warranty-summary']);
  const included = findAttribute(attributes, [
    'whats-included',
    'in-the-box',
    'box-contents',
    'package-contents',
  ]);
  const whatsIncluded = included
    ? Array.isArray(included.value)
      ? included.value.map((v) => text(v)).filter(Boolean)
      : included.displayValue
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
    : [];

  const spinFrames: string[] = Array.isArray(metadata.spin360Urls)
    ? metadata.spin360Urls.map((u: unknown) => text(u)).filter(Boolean)
    : [];

  return {
    id: text(product.id),
    slug: text(product.slug) || null,
    name: text(product.name ?? product.title),
    shortDescription: text(product.shortDescription ?? product.short_description),
    longDescription: text(product.longDescription ?? product.long_description),
    richDescriptionHtml: text(metadata.richDescriptionHtml) || null,
    brand: ref(product.brand),
    category: ref(product.category),
    subcategory: ref(product.subcategory),
    images: imageUrls(product),
    spinFrames,
    price,
    listPrice,
    discountPercent,
    offer,
    offers,
    variants,
    attributes,
    specificationGroups,
    highlights: deriveHighlights(attributes, product.highlights),
    warranty: warranty?.displayValue ?? null,
    whatsIncluded,
    averageRating: num(product.averageRating),
    reviewCount: Math.max(0, Math.trunc(num(product.reviewCount))),
    sku: offer?.sellerSku ?? (text(product.sku) || null),
    gtin: (() => {
      const raw = text(product.gtin ?? product.globalTradeItemNumber);
      return /^\d{8,14}$/.test(raw) ? raw : null;
    })(),
    availability: deriveAvailability(offer, variants),
    market: text(market).toUpperCase(),
    isPublic: product.approval_status
      ? product.approval_status === 'APPROVED' && product.is_active !== false
      : true,
  };
}

/** schema.org availability for the Product markup, from the same figures the page shows. */
export function schemaAvailability(
  availability: ProductAvailability,
): 'InStock' | 'OutOfStock' | 'LimitedAvailability' {
  switch (availability.status) {
    case 'in_stock':
      return 'InStock';
    case 'low_stock':
      return 'LimitedAvailability';
    default:
      return 'OutOfStock';
  }
}

/** schema.org item condition for an offer. */
export function schemaCondition(
  condition: string | undefined | null,
): 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition' {
  switch (String(condition ?? '').toUpperCase()) {
    case 'REFURBISHED':
      return 'RefurbishedCondition';
    case 'USED':
      return 'UsedCondition';
    default:
      return 'NewCondition';
  }
}
