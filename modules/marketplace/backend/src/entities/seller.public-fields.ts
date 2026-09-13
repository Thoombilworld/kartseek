/**
 * The Seller columns that may leave the service.
 *
 * `Seller` carries a seller's banking and tax identity — `bankAccountNumber`,
 * `bankIfscCode`, `bankAccountName`, `panNumber`, `gstNumber`, `kycDocuments` —
 * alongside their private `email` and `phone` and the `ownerId` that links them
 * to a user account. None of that belongs in a response.
 *
 * The catalogue reads were fixed with an explicit projection, but three other
 * paths joined the entity without one and returned the whole row: the order
 * reads (`leftJoinAndSelect('o.seller', …)`), the return detail read, and the
 * coupon detail read. Verified during the August audit — `GET /marketplace/orders`
 * answered with every banking column present.
 *
 * Sharing one list is the point. Projecting explicitly rather than deleting keys
 * afterwards means a column added to the entity later is private by default: it
 * has to be named here to become public.
 *
 * Admin and franchise views deliberately keep the full row — they sit behind
 * role guards and exist to review exactly this data.
 */
export const PUBLIC_SELLER_FIELDS = {
  id: true,
  businessName: true,
  storeSlug: true,
  description: true,
  logoUrl: true,
  bannerUrl: true,
  sellerRating: true,
  totalReviews: true,
  totalProducts: true,
  totalOrders: true,
  verificationStatus: true,
  isActive: true,
  regionCode: true,
  createdAt: true,
} as const;

/**
 * The same list, as `alias.column` strings for `QueryBuilder.select()`.
 *
 * `leftJoinAndSelect` has no projection of its own, so a join has to name its
 * columns — `leftJoin` plus an explicit `addSelect` of these.
 */
export function publicSellerColumns(alias: string): string[] {
  return Object.keys(PUBLIC_SELLER_FIELDS).map((column) => `${alias}.${column}`);
}

/**
 * The customer-facing projection of a loaded Seller row.
 *
 * `relations: ['seller']` loads the whole entity — bank account, PAN, GST
 * number, owner e-mail and phone, KYC documents, commission rate — and the
 * product detail response used to pass every column of it to the browser on
 * each offer. Anything that reads a seller through a relation and answers a
 * public request goes through here; `publicSellerColumns` is the query-builder
 * form of the same allowlist.
 */
export function toPublicSeller<T extends Record<string, unknown>>(
  seller: T | null | undefined,
): Partial<T> | null {
  if (!seller || typeof seller !== 'object') return null;
  const out: Partial<T> = {};
  for (const key of Object.keys(PUBLIC_SELLER_FIELDS) as (keyof T & string)[]) {
    if (key in seller) out[key] = seller[key];
  }
  return out;
}

/**
 * The Seller columns a **tax invoice** may carry.
 *
 * Deliberately a second, wider list rather than an addition to
 * `PUBLIC_SELLER_FIELDS`. An invoice legitimately names the merchant's
 * registered address and tax registration — that is the document's whole
 * purpose, and it is information the seller publishes on every invoice they
 * issue. A product listing has no such need, so widening the public projection
 * would leak it onto every catalogue read as well.
 *
 * Still excludes everything in the banking block (`bankAccountNumber`,
 * `bankIfscCode`, `bankAccountName`) and `panNumber`, which is a personal tax
 * identifier rather than a business registration and belongs on no invoice.
 */
export const INVOICE_SELLER_FIELDS = {
  id: true,
  businessName: true,
  storeSlug: true,
  /** GST number in India, CR number in Qatar, TRN in the UAE — see the region's `taxIdLabel`. */
  gstNumber: true,
  address: true,
  email: true,
  phone: true,
  regionCode: true,
} as const;
