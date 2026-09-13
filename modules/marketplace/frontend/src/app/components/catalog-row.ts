import { buyBoxMrp, buyBoxPrice } from '@/lib/api/map-catalog-product';
import { productImageList } from '@/lib/product-image';

/**
 * One product as a listing card renders it.
 *
 * Every figure comes from one catalogue row: the payable price is the buy-box
 * offer for the market the page was rendered for, the list price is that
 * offer's own, and the images are the catalogue's in its own order. Nothing on
 * the card is computed from a second source, so a card can never disagree
 * with the detail page it links to.
 */
export interface CatalogCardRow {
  id: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: string;
  createdAt?: string;
  badge?: string;
  imageUrl?: string;
  /** Every catalogue image, primary first — the card swipes through them. */
  images?: string[];
  /** Variant axes from the catalogue, rendered as swatches / size counts. */
  variantAxes?: { variantName: string; variantOptions: string[] }[];
  delivery?: string;
}

/**
 * Map a catalogue entity (as the gateway returns it) to a card row.
 *
 * Shared by the category and subcategory pages, which each carried their own
 * copy of this mapping — and the copies had drifted: one read `created_at`
 * (needed for the "newest" sort), the other did not; one fell back to the
 * price when the list price was missing, the other rendered a struck-through
 * zero.
 */
export function mapCatalogRow(p: any): CatalogCardRow {
  const price = buyBoxPrice(p);
  return {
    id: String(p?.id ?? ''),
    title: p?.name ?? p?.title ?? 'Product',
    brand: p?.brand?.name ?? (typeof p?.brand === 'string' ? p.brand : ''),
    price,
    mrp: buyBoxMrp(p) || price,
    rating: Number(p?.averageRating ?? p?.rating ?? 0) || 0,
    reviews: String(p?.reviewCount ?? p?.reviews ?? 0),
    createdAt: p?.created_at ?? p?.createdAt ?? undefined,
    badge: p?.badge || undefined,
    imageUrl: productImageList(p)[0],
    images: productImageList(p),
    variantAxes: Array.isArray(p?.variantAxes) ? p.variantAxes : undefined,
    delivery: p?.delivery ?? undefined,
  };
}

/** The rows of a gateway list response, whatever envelope it arrived in. */
export function catalogRows(res: any): any[] {
  const list = res?.data?.data ?? res?.data ?? res?.products ?? res;
  return Array.isArray(list) ? list : [];
}
