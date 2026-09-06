/**
 * The shapes the marketplace UI renders.
 *
 * These lived in `lib/demo-data/marketplace-home.ts` alongside the bundled
 * fixtures, which meant production code — the catalogue feed, the product
 * grids, the admin product tables — imported its core types from a module named
 * `demo-data`. `HomeProduct` alone has ten consumers, none of them demos, and
 * the fixtures could not be deleted without taking the type system with them.
 *
 * The names are kept exactly as they were. They are inherited (`HomeProduct` is
 * really "the product shape a listing card renders", not "a product on the
 * homepage"), but renaming across ten files is a separate change from moving
 * them somewhere honest, and doing both at once would make the move unreviewable.
 */

/** Mixed into anything that can be scoped to a set of markets. */
export interface RegionTargeted {
  regions?: string[];
}

/** A product as rendered by a listing card, anywhere in the marketplace. */
export interface HomeProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: string;
  badge?: string;
  badgeColor?: string;
  icon: string; // lucide icon name
  category?: string;
  delivery?: string;
  imageUrl?: string;
  /** Every catalogue image for this product, primary first — the card swipes through them. */
  images?: string[];
  /** Pickable variant axes, e.g. `[{ variantName: 'Colour', variantOptions: [...] }]`. */
  variantAxes?: { variantName: string; variantOptions: string[] }[];
  /** Set when `price` is a live flash-deal price rather than the offer price. */
  dealPrice?: number;
  /** ISO end of the deal window `dealPrice` belongs to. */
  dealEndsAt?: string;
  /**
   * Bundled placeholder shown when the catalogue is unreachable: the card renders
   * but does not link, because this id exists only in this bundle and its detail
   * page would 404. Kept separate from `id` so the id stays usable as a React key —
   * blanking the id instead gave every placeholder in a section the same key `''`.
   */
  displayOnly?: boolean;
}

export interface HomeBrand {
  id: string;
  name: string;
  tagline: string;
  /**
   * Brand logo image. Supplied by the live feed (or dropped into
   * `public/brands/<id>.<ext>` and referenced here). When absent — or when the
   * file 404s — the brand card falls back to a monogram tile, so a missing
   * asset never leaves a broken image on the homepage.
   */
  logoUrl?: string;
  discount: string;
  /** If the discount text contains a currency amount, store it here for dynamic formatting */
  discountAmount?: number;
  /** 'starting' | 'upto' | 'flat' | 'emi' — how to render discountAmount */
  discountType?: 'starting' | 'upto' | 'flat' | 'emi';
  color: string;
  textColor: string;
}

export interface HomeCategory {
  id: string;
  label: string;
  iconName: string;
  color: string;
  subcategories: string[];
  productCount?: number;
  imageUrl?: string;
}

export interface CampaignBanner extends RegionTargeted {
  id: string;
  tag: string;
  headline: string;
  subheadline: string;
  startingPrice?: number;
  cta: string;
  ctaHref: string;
  gradient: string;
  icon: string;
}

export interface CountryBanner extends RegionTargeted {
  id: string;
  country: string;
  flag: string;
  headline: string;
  subtitle: string;
  gradient: string;
  href: string;
}

export interface HomeFaq extends RegionTargeted {
  q: string;
  a: string;
}

export interface TrustBadge extends RegionTargeted {
  id: string;
  title: string;
  subtitle: string;
  /** If subtitle contains a currency threshold, store it here for dynamic formatting */
  thresholdAmount?: number;
  icon: string;
  color: string;
}
