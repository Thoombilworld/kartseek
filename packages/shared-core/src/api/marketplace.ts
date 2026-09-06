import { api } from '@/lib/api-endpoints';

// ── Marketplace Home ────────────────────────────────────────────────────────
export async function getMarketplaceHome(country?: string) {
  return api.get<any>(`/marketplace/home${country ? `?country=${country}` : ''}`);
}

// ── Categories ──────────────────────────────────────────────────────────────
export async function getCategories() {
  return api.get<any>('/marketplace/category-list');
}
export async function getCategoryById(id: string) {
  return api.get<any>(`/marketplace/category-list/${id}`);
}
export async function getSubcategoryById(id: string) {
  return api.get<any>(`/marketplace/subcategories/${id}`);
}

// ── Products ────────────────────────────────────────────────────────────────
export async function getProducts(params?: Record<string, string>) {
  return api.get<any>('/marketplace/products', params);
}

/**
 * Product detail as one market sees it. Server components cannot send the
 * region header (it is read from `document.cookie`), so the market travels as
 * `?country=`; the gateway falls back to the header, then IP, when absent.
 */
export async function getProductById(id: string, country?: string) {
  return api.get<any>(`/marketplace/products/${id}`, country ? { country } : undefined);
}
export async function getFeaturedProducts() {
  return api.get<any>('/marketplace/featured');
}
export async function getDeals() {
  return api.get<any>('/marketplace/deals');
}
export async function getFlashDeals() {
  return api.get<any>('/marketplace/flash-deals');
}

// ── Search ──────────────────────────────────────────────────────────────────
export async function searchMarketplace(
  query: string,
  filters: Record<string, string | number | boolean | undefined> = {},
) {
  return api.get<any>('/marketplace/search', { q: query, ...filters });
}

// ── Brands ──────────────────────────────────────────────────────────────────
export async function getBrands() {
  return api.get<any>('/marketplace/brands');
}
export async function getTopBrands() {
  return api.get<any>('/marketplace/brands/top');
}
export interface MarketplaceBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  isVerified: boolean;
  followerCount: number;
}

/**
 * Resolve one brand by **either** its uuid or its slug.
 *
 * There is no `GET /marketplace/brands/:id` route on the gateway — only the
 * list and `/brands/top` — so the previous implementation of this function
 * requested a URL that answered `404 Cannot GET` every single time. The brand
 * page never noticed because it did not call the API at all; it rendered
 * hard-coded demo data instead, which is how a uuid ended up displayed as the
 * brand's name.
 *
 * Both key types have to be accepted: product pages link with `brand.id` (a
 * uuid, which the follow button also needs), while the homepage's promo cards
 * link with a slug. Matching either keeps both entry points on one page.
 */
export async function getBrandById(idOrSlug: string): Promise<MarketplaceBrand | null> {
  if (!idOrSlug) return null;
  const res = await getBrands();
  const rows: any[] = Array.isArray(res) ? res : (res?.data ?? res?.brands ?? []);
  const key = idOrSlug.toLowerCase();
  return (
    rows.find((b: any) => String(b?.id).toLowerCase() === key) ??
    rows.find((b: any) => String(b?.slug).toLowerCase() === key) ??
    null
  );
}

// ── Sellers ─────────────────────────────────────────────────────────────────
export async function getSellers() {
  return api.get<any>('/marketplace/sellers');
}
export async function getVerifiedSellers() {
  return api.get<any>('/marketplace/sellers/verified');
}
export async function getSellerById(id: string) {
  return api.get<any>(`/marketplace/sellers/${id}`);
}

// ── Cart ────────────────────────────────────────────────────────────────────
export async function getCart(userId?: string) {
  return api.get<any>(`/marketplace/cart${userId ? `?userId=${userId}` : ''}`);
}

export async function addToCart(productId: string, quantity: number, variantId?: string) {
  return api.post<any>('/marketplace/cart', { productId, quantity, variantId });
}

// `itemId` is the product id — cart lines are keyed by productId + variantId,
// there is no separate cart-item identifier. `variantId` must be forwarded or a
// variant line cannot be told apart from the plain one and the wrong row moves.
export async function updateCartItem(itemId: string, quantity: number, variantId?: string) {
  return api.put<any>(`/marketplace/cart/${itemId}`, {
    quantity,
    ...(variantId ? { variantId } : {}),
  });
}

export async function removeFromCart(itemId: string, variantId?: string) {
  return api.delete<any>(`/marketplace/cart/${itemId}`, variantId ? { variantId } : undefined);
}

// ── Wishlist ────────────────────────────────────────────────────────────────
export async function getWishlist(userId?: string) {
  return api.get<any>(`/marketplace/wishlist${userId ? `?userId=${userId}` : ''}`);
}

export async function addToWishlist(productId: string, userId?: string) {
  return api.post<any>('/marketplace/wishlist', { productId, userId });
}

export async function removeFromWishlist(productId: string, userId?: string) {
  return api.delete<any>(`/marketplace/wishlist/${productId}${userId ? `?userId=${userId}` : ''}`);
}

// ── Orders ──────────────────────────────────────────────────────────────────
export async function getOrders(params?: Record<string, string>) {
  return api.get<any>('/marketplace/orders', params);
}

export async function getOrderById(id: string) {
  return api.get<any>(`/marketplace/orders/${id}`);
}

export async function placeOrder(payload: any) {
  return api.post<any>('/marketplace/orders', payload);
}

// PUT, not POST: the gateway route is `@Put('orders/:id/cancel')`. Sent as a
// POST this 404'd on every attempt, and the order page's catch turned that into
// a generic "could not cancel" — so the Cancel Order button never once worked.
export async function cancelOrder(orderId: string, reason: string) {
  return api.put<any>(`/marketplace/orders/${orderId}/cancel`, { reason });
}

export async function createCheckout() {
  return api.post<any>('/marketplace/orders/checkout', {});
}

// ── Returns & Refunds ───────────────────────────────────────────────────────
export async function createReturnRequest(orderId: string, payload: any) {
  return api.post<any>(`/marketplace/orders/${orderId}/returns`, payload);
}

export async function getReturns(sellerId?: string) {
  return api.get<any>(`/marketplace/returns${sellerId ? `?sellerId=${sellerId}` : ''}`);
}

export async function getRefunds(sellerId?: string) {
  return api.get<any>(`/marketplace/refunds${sellerId ? `?sellerId=${sellerId}` : ''}`);
}

// ── Reviews ─────────────────────────────────────────────────────────────────
export async function getProductReviews(productId: string) {
  return api.get<any>(`/marketplace/products/${productId}/reviews`);
}

export async function addProductReview(productId: string, review: any) {
  return api.post<any>(`/marketplace/products/${productId}/reviews`, review);
}

/**
 * Mark a review as helpful.
 *
 * `reviews.helpfulCount` was rendered beside a thumbs-up button that had no
 * handler and no endpoint behind it, so the count was permanently zero on every
 * review the storefront has ever shown.
 */
export async function voteReviewHelpful(reviewId: string) {
  return api.post<{ success: boolean; alreadyVoted: boolean; helpfulCount: number }>(
    `/marketplace/reviews/${reviewId}/helpful`,
    {},
  );
}

// A customer's own reviews across all products
export async function getCustomerReviews(userId?: string) {
  return api.get<any>('/marketplace/reviews', userId ? { userId } : {});
}

// ── Recently Viewed ─────────────────────────────────────────────────────────
export async function getRecentlyViewed(userId?: string) {
  return api.get<any>(`/marketplace/recently-viewed${userId ? `?userId=${userId}` : ''}`);
}

// ── Support ─────────────────────────────────────────────────────────────────
export async function createSupportTicket(payload: any) {
  return api.post<any>('/marketplace/support', payload);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ██ TIER 6 — New Entity APIs
// ═══════════════════════════════════════════════════════════════════════════════

// ── Returns (Full CRUD) ─────────────────────────────────────────────────────

export async function getReturnRequests(
  params?: Record<string, string | number | boolean | undefined>,
) {
  return api.get<any>('/marketplace/returns', params);
}

export async function getReturnById(id: string) {
  return api.get<any>(`/marketplace/returns/${id}`);
}

export async function updateReturnStatus(
  id: string,
  payload: { status: string; rejectionReason?: string; qcCondition?: string; qcNotes?: string },
) {
  return api.put<any>(`/marketplace/returns/${id}/status`, payload);
}

export async function assignReturnPickup(
  id: string,
  payload: { pickupPartnerId: string; pickupScheduledAt: string },
) {
  return api.put<any>(`/marketplace/returns/${id}/assign-pickup`, payload);
}

export async function createReturn(payload: {
  orderId: string;
  reason: string;
  description?: string;
  imageUrls?: string[];
  customerId: string;
}) {
  return api.post<any>('/marketplace/returns', payload);
}

/**
 * Withdraw a return request you raised.
 *
 * No customer id in the payload on purpose — the gateway reads it from the
 * bearer token, so the caller cannot cancel someone else's return by id.
 */
export async function cancelReturn(returnId: string) {
  return api.put<{ success: boolean; id: string; status: string }>(
    `/marketplace/returns/${returnId}/cancel`,
    {},
  );
}

// ── Product reports ─────────────────────────────────────────────────────────

export type ProductReportReason =
  | 'COUNTERFEIT'
  | 'PROHIBITED'
  | 'MISLEADING'
  | 'OFFENSIVE'
  | 'PRICING'
  | 'OTHER';

/**
 * Flag a listing for moderation review.
 *
 * The reporter is taken from the bearer token server-side, so no customer id is
 * sent. Reporting the same product twice updates the existing report rather
 * than creating a second — the response says which happened via `updated`.
 */
export async function reportProduct(
  productId: string,
  payload: { reason: ProductReportReason; details?: string },
) {
  return api.post<{ success: boolean; id: string; updated: boolean }>(
    `/marketplace/products/${productId}/report`,
    payload,
  );
}

// ── Price-drop alerts ───────────────────────────────────────────────────────

export interface PriceAlert {
  id: string;
  productId: string;
  priceWhenSet: number;
  targetPrice: number | null;
  isActive: boolean;
  notifiedAt: string | null;
  notifiedPrice: number | null;
  product?: { id: string; name?: string };
}

/**
 * Watch a product for a price drop.
 *
 * The reference price is read server-side from the buy-box listing, so the
 * client cannot set what counts as "cheaper". Omit `targetPrice` to be told on
 * any decrease.
 */
export async function createPriceAlert(productId: string, targetPrice?: number) {
  return api.post<{ success: boolean; id: string; watchingFrom: number; rearmed: boolean }>(
    `/marketplace/products/${productId}/price-alert`,
    targetPrice === undefined ? {} : { targetPrice },
  );
}

export async function getPriceAlerts() {
  return api.get<{ data: PriceAlert[]; total: number }>('/marketplace/price-alerts');
}

export async function deletePriceAlert(alertId: string) {
  return api.delete<{ success: boolean }>(`/marketplace/price-alerts/${alertId}`);
}

// ── Exchange / trade-in offers ──────────────────────────────────────────────

/**
 * One trade-in programme, as stored in `marketplace.exchange_offers`.
 *
 * `minExchangeValue` / `maxExchangeValue` bound what the programme will pay for
 * a device in the category; `eligibilityCriteria` optionally carries a
 * `conditionMultipliers` map so an operator can tune the grading schedule per
 * offer without a deploy.
 */
export interface ExchangeOffer {
  id: string;
  title: string | null;
  description: string | null;
  exchangeCategory: string | null;
  targetCategory: string | null;
  minExchangeValue: number;
  maxExchangeValue: number | null;
  bonusAmount: number;
  eligibilityCriteria: { conditionMultipliers?: Record<string, number>; brands?: string[] } | null;
  fulfillmentMode: string;
  expiresAt: string;
  isFeatured: boolean;
}

export async function getExchangeOffers(targetCategory?: string) {
  return api.get<{ data: ExchangeOffer[] }>(
    '/marketplace/offers/exchange',
    targetCategory ? { targetCategory } : undefined,
  );
}

// ── Coupons ─────────────────────────────────────────────────────────────────

export async function getCoupons(params?: Record<string, string | number | boolean | undefined>) {
  return api.get<any>('/marketplace/coupons', params);
}

export async function getCouponById(id: string) {
  return api.get<any>(`/marketplace/coupons/${id}`);
}

export async function validateCoupon(payload: {
  code: string;
  cartTotal: number;
  userId?: string;
  paymentMethod?: string;
}) {
  return api.post<any>('/marketplace/coupons/validate', payload);
}

export async function redeemCoupon(payload: {
  code: string;
  orderId: string;
  customerId: string;
  cartTotal: number;
}) {
  return api.post<any>('/marketplace/coupons/redeem', payload);
}

export async function getCouponUsage(couponId: string) {
  return api.get<any>(`/marketplace/coupons/${couponId}/usage`);
}

export async function createCoupon(payload: any) {
  return api.post<any>('/marketplace/coupons', payload);
}

export async function updateCoupon(id: string, payload: any) {
  return api.put<any>(`/marketplace/coupons/${id}`, payload);
}

export async function deleteCoupon(id: string) {
  return api.delete<any>(`/marketplace/coupons/${id}`);
}

// ── Shipment Tracking ───────────────────────────────────────────────────────

export async function getTrackingEvents(orderId: string) {
  return api.get<any>(`/marketplace/tracking/order/${orderId}`);
}

export async function getTrackingByTrackingId(trackingId: string) {
  return api.get<any>(`/marketplace/tracking/${trackingId}`);
}

export async function addTrackingEvent(payload: any) {
  return api.post<any>('/marketplace/tracking/events', payload);
}

// ── Product Variants ────────────────────────────────────────────────────────

export async function getVariants(productId: string) {
  return api.get<any>(`/marketplace/products/${productId}/variants`);
}

export async function getVariantById(id: string) {
  return api.get<any>(`/marketplace/variants/${id}`);
}

export async function createVariant(productId: string, payload: any) {
  return api.post<any>(`/marketplace/products/${productId}/variants`, payload);
}

export async function updateVariant(id: string, payload: any) {
  return api.put<any>(`/marketplace/variants/${id}`, payload);
}

export async function deleteVariant(id: string) {
  return api.delete<any>(`/marketplace/variants/${id}`);
}

export async function updateVariantStock(
  id: string,
  payload: { operation: 'SET' | 'INCREMENT' | 'DECREMENT'; quantity: number },
) {
  return api.put<any>(`/marketplace/variants/${id}/stock`, payload);
}

export async function getLowStockVariants(sellerId: string) {
  return api.get<any>(`/marketplace/sellers/${sellerId}/low-stock-variants`);
}

// ── Product Q&A ─────────────────────────────────────────────────────────────

export async function getQuestions(
  productId: string,
  params?: Record<string, string | number | boolean | undefined>,
) {
  return api.get<any>(`/marketplace/products/${productId}/questions`, params);
}

export async function createQuestion(
  productId: string,
  payload: { questionText: string; customerName?: string },
) {
  return api.post<any>(`/marketplace/products/${productId}/questions`, payload);
}

export async function getAnswers(questionId: string) {
  return api.get<any>(`/marketplace/questions/${questionId}/answers`);
}

export async function createAnswer(
  questionId: string,
  payload: { answerText: string; authorName?: string; authorRole?: string },
) {
  return api.post<any>(`/marketplace/questions/${questionId}/answers`, payload);
}

export async function upvoteQuestion(questionId: string) {
  return api.post<any>(`/marketplace/questions/${questionId}/upvote`, {});
}

export async function voteAnswerHelpful(answerId: string) {
  return api.post<any>(`/marketplace/answers/${answerId}/helpful`, {});
}

export async function acceptAnswer(answerId: string) {
  return api.put<any>(`/marketplace/answers/${answerId}/accept`, {});
}

// ── Delivery Assignments ────────────────────────────────────────────────────

export async function getDeliveryAssignments(
  params?: Record<string, string | number | boolean | undefined>,
) {
  return api.get<any>('/marketplace/delivery-assignments', params);
}

export async function getDeliveryAssignmentById(id: string) {
  return api.get<any>(`/marketplace/delivery-assignments/${id}`);
}

export async function createDeliveryAssignment(payload: any) {
  return api.post<any>('/marketplace/delivery-assignments', payload);
}

export async function updateDeliveryStatus(
  id: string,
  payload: { status: string; failureReason?: string },
) {
  return api.put<any>(`/marketplace/delivery-assignments/${id}/status`, payload);
}

export async function verifyDeliveryOtp(id: string, otp: string) {
  return api.post<any>(`/marketplace/delivery-assignments/${id}/verify-otp`, { otp });
}

export async function submitDeliveryProof(
  id: string,
  payload: {
    proofPhotos: string[];
    deliveryMode: string;
    deliveryNotes?: string;
    coordinates?: { lat: number; lng: number };
  },
) {
  return api.post<any>(`/marketplace/delivery-assignments/${id}/proof`, payload);
}

export async function getPartnerActiveDelivery(partnerId: string) {
  return api.get<any>(`/marketplace/delivery-assignments/partner/${partnerId}/active`);
}

// ── Gift Cards ──────────────────────────────────────────────────────────────

/** What `POST /marketplace/gift-cards/balance` answers with. */
export interface GiftCardBalance {
  code: string;
  currentBalance: number;
  originalAmount: number;
  currency: string;
  status: string;
  expiresAt: string | null;
  redemptionHistory: Array<{ orderId: string; amount: number; date: string }>;
}

/**
 * Look up a gift card's balance.
 *
 * The code travels in the POST body, not the path: a gift card code is a bearer
 * secret, and a path segment ends up in access logs, referrer headers and
 * browser history. (The balance page used to `GET /gift-cards/{code}/balance`,
 * a route that does not exist — so every lookup 404'd and fell through to a
 * hard-coded "demo" balance.)
 */
export async function getGiftCardBalance(code: string) {
  return api.post<GiftCardBalance>('/marketplace/gift-cards/balance', { code });
}

// ── Bundles ─────────────────────────────────────────────────────────────────

export interface ProductBundle {
  id: string;
  name: string;
  /** `price` is the payable buy-box price; `mrp` is the struck-through list price. */
  products: Array<{ id: string; name: string; mrp: string | number; price?: number }>;
  sellerId: string;
  totalMrp: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
  status: string;
  /** How many past orders contained both products. */
  boughtTogetherCount?: number;
}

/** Every active bundle. The endpoint is not per-product; callers filter. */
export async function getProductBundles() {
  return api.get<{ data: ProductBundle[] } | ProductBundle[]>('/marketplace/bundles');
}
