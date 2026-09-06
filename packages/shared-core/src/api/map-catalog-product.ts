import type { HomeProduct } from '@/lib/marketplace/types';
import { productImageList } from '@/lib/product-image';

/**
 * Catalogue row → the `HomeProduct` shape the marketplace cards render.
 *
 * The listing endpoints (`best-sellers`, `flash-deals`, `new-arrivals`,
 * `deals-of-the-day`) return the Product entity: `name` not `title`, `mrp` as a
 * decimal *string*, `averageRating`/`reviewCount`, and images as `{ url }` rows.
 * Handing those to a card unmapped leaves a blank title and a NaN price, which is
 * why every one of those pages quietly kept showing its bundled demo array.
 */
/**
 * What the customer actually pays, falling back to MRP.
 *
 * The list endpoints return a `listings` **array**; only the product-detail
 * response carries a singular `listing`. Reading `p.listing?.sellingPrice` alone
 * — as the category, subcategory and search pages did — always missed on a list
 * response and silently priced every card at MRP, so nothing ever showed a
 * discount. Inactive listings are skipped: pricing off a withdrawn offer would
 * advertise a price no seller is honouring.
 */
export function buyBoxPrice(p: any): number {
  const mrp = Number(p?.mrp ?? p?.price ?? 0) || 0;
  const listings: any[] = (Array.isArray(p?.listings) ? p.listings : []).filter(
    (l: any) => l?.isActive !== false,
  );
  const buyBox = listings.find((l: any) => l?.isBuyBoxWinner) ?? listings[0] ?? p?.listing;
  return Number(p?.discountedPrice ?? p?.sellingPrice ?? buyBox?.sellingPrice ?? mrp) || mrp;
}

/** The offer a card prices from: the buy-box winner, else the first live one. */
export function buyBoxListing(p: any): any | null {
  const listings: any[] = (Array.isArray(p?.listings) ? p.listings : []).filter(
    (l: any) => l?.isActive !== false,
  );
  return listings.find((l: any) => l?.isBuyBoxWinner) ?? listings[0] ?? p?.listing ?? null;
}

/**
 * The struck-through list price for the offer being shown.
 *
 * Each market's offer carries its own `mrp` in that market's currency;
 * `Product.mrp` is one figure for the whole catalogue and is only the fallback.
 * Reading the product figure under a rupee sign showed a riyal number.
 */
export function buyBoxMrp(p: any): number {
  const offer = buyBoxListing(p);
  return Number(offer?.mrp ?? p?.mrp ?? p?.price ?? 0) || 0;
}

export function mapCatalogProduct(p: any): HomeProduct {
  const mrp = buyBoxMrp(p);
  const price = buyBoxPrice(p);

  // The full gallery, primary first — the card swipes through it, so resolving
  // only the primary image here is what limited every grid to one photograph.
  const gallery = productImageList(p);

  return {
    id: String(p?.id ?? ''),
    title: p?.title ?? p?.name ?? 'Product',
    brand: p?.brand?.name ?? (typeof p?.brand === 'string' ? p.brand : ''),
    mrp,
    price,
    rating: Number(p?.averageRating ?? p?.rating ?? 0) || undefined,
    reviews: Number(p?.reviewCount ?? p?.reviews ?? 0),
    imageUrl: gallery[0],
    images: gallery,
    variantAxes: Array.isArray(p?.variantAxes) ? p.variantAxes : undefined,
    category: p?.category?.slug ?? (typeof p?.category === 'string' ? p.category : undefined),
    delivery: p?.delivery,
    badge: p?.badge,
    badgeColor: p?.badgeColor,
  } as unknown as HomeProduct;
}

/**
 * Pull the rows out of a gateway list response.
 *
 * The gateway's TransformInterceptor wraps everything as `{ success, data }` and
 * the paged catalogue payload is itself `{ data, total, page, limit }`, so the
 * rows sit at `json.data.data`. Reading `json.data.length` — an object, so
 * `undefined` — is the mistake that made these pages look permanently offline.
 */
export function unwrapCatalogList(json: any): any[] {
  const inner = json?.data ?? json;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.data)) return inner.data;
  return [];
}

/** Rows mapped for display, minus anything that could not open a detail page. */
export function mapCatalogList(json: any): HomeProduct[] {
  return unwrapCatalogList(json)
    .map(mapCatalogProduct)
    .filter((p) => p.id);
}
