/**
 * Domain Services Barrel Export
 *
 * MarketplaceService decomposition (3036 lines → 13 focused domain services):
 *
 * Original 4 services:
 *  1. CatalogService          — Categories, Products, Search, Brands, Attributes, Variants, Images
 *  2. OrderService            — Orders, Delivery Assignments, OTP
 *  3. SellerDomainService     — Seller operations
 *  4. AnalyticsService        — Revenue, Conversion, Rankings, Performance, SLA, Fraud
 *
 * Extracted domain services:
 *  5. ReviewService           — Product reviews, ratings, stats, helpful votes
 *  6. CouponService           — Coupon CRUD, validation, redemption, usage tracking
 *  7. WishlistService         — Wishlist management with product enrichment
 *  8. GiftCardService         — Gift card lifecycle (create, redeem, balance, deactivate)
 *  9. ReturnService           — Return requests, status lifecycle, pickup assignment, refunds
 * 10. MarketplaceCartService  — Redis-backed cart with product snapshots
 * 11. QAService               — Product questions & answers, upvotes, accepted answers
 * 12. TrackingService         — Shipment tracking events, courier webhooks, ETA
 * 13. BrandFollowService      — Brand follow/unfollow, feed, updates
 *
 * The original MarketplaceService acts as a façade, delegating to these
 * domain services. This avoids a breaking change in the gateway controller layer.
 */

// NOTE: The former Catalog/Order/SellerDomain/Analytics/Review/Coupon/Wishlist/
// GiftCard/Return/MarketplaceCart/QA/Tracking domain services were dead code —
// injected nowhere and divergent from the live inline logic in MarketplaceService.
// They have been removed. BrandFollowService is the only one still wired.
export { BrandFollowService } from './brand-follow.service';
