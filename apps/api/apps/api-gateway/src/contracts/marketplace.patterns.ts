/**
 * KARTSEEK — Marketplace TCP Message Patterns
 *
 * These constants mirror the @MessagePattern({ cmd }) values registered in
 * marketplace-service/src/marketplace.controller.ts (lines 802+).
 *
 * Usage in gateway controllers:
 *   this.client.send({ cmd: MARKETPLACE_PATTERNS.GET_PRODUCTS }, payload)
 */
export const MARKETPLACE_PATTERNS = {
  // ── Public Browsing ─────────────────────────────────────────────────────────
  GET_HOME: 'get_home',
  GET_CATEGORIES: 'get_categories',
  GET_CATEGORY_BY_ID: 'get_category_by_id',
  GET_SUBCATEGORIES: 'get_subcategories',
  GET_SUBCATEGORY_BY_ID: 'get_subcategory_by_id',
  GET_CATEGORY_ATTRIBUTES: 'get_category_attributes',
  GET_PRODUCTS: 'get_products',
  GET_PRODUCT_BY_ID: 'get_product_by_id',
  SEARCH: 'search',
  GET_FEATURED_PRODUCTS: 'get_featured_products',
  GET_DEALS: 'get_deals',
  GET_FLASH_DEALS: 'get_flash_deals',
  // Distinct from GET_FLASH_DEALS: this one carries `dealStartedAt`/`dealEndsAt`
  // per row, which is what `/marketplace/flash-deals/active` promises. The route
  // used to send GET_FEATURED_PRODUCTS and so returned a featured list with no
  // deal window at all.
  GET_AVAILABLE_FLASH_DEALS: 'get_available_flash_deals',

  // ── Admin flash-deal pipeline ─────────────────────────────────────────────
  // Every one of these routes used to send ADMIN_GET_DASHBOARD — the admin panel
  // asked for the dashboard whether you were creating a campaign, approving a
  // nomination or deleting a deal, and the catch returned `{ success: true }`
  // so it looked like it had worked. 35 further admin routes still do this; see
  // the note in admin-marketplace.controller.ts.
  ADMIN_GET_FLASH_DEALS: 'admin_get_flash_deals',
  ADMIN_CREATE_FLASH_DEAL: 'admin_create_flash_deal',
  ADMIN_UPDATE_FLASH_DEAL: 'admin_update_flash_deal',
  ADMIN_DELETE_FLASH_DEAL: 'admin_delete_flash_deal',
  ADMIN_GET_NOMINATIONS: 'admin_get_nominations',
  ADMIN_APPROVE_NOMINATION: 'admin_approve_nomination',
  ADMIN_REJECT_NOMINATION: 'admin_reject_nomination',
  GET_BRANDS: 'get_brands',
  GET_TOP_BRANDS: 'get_top_brands',
  GET_SELLERS: 'get_sellers',
  GET_VERIFIED_SELLERS: 'get_verified_sellers',
  GET_SELLER_BY_ID: 'get_seller_by_id',
  // Wider projection than GET_SELLER_BY_ID: an invoice names the merchant's
  // registered address and tax registration, which a catalogue read must not.
  GET_SELLER_FOR_INVOICE: 'get_seller_for_invoice',

  // ── Wishlist ────────────────────────────────────────────────────────────────
  GET_WISHLIST: 'get_wishlist',
  ADD_TO_WISHLIST: 'add_to_wishlist',
  REMOVE_FROM_WISHLIST: 'remove_from_wishlist',

  // ── Reviews ─────────────────────────────────────────────────────────────────
  GET_PRODUCT_REVIEWS: 'get_product_reviews',
  VOTE_REVIEW_HELPFUL: 'vote_review_helpful',
  CREATE_REVIEW: 'create_review',
  GET_CUSTOMER_REVIEWS: 'get_customer_reviews',

  // ── Coupons ─────────────────────────────────────────────────────────────────
  GET_COUPONS: 'get_coupons',
  GET_COUPON_BY_ID: 'get_coupon_by_id',
  CREATE_COUPON: 'create_coupon',
  UPDATE_COUPON: 'update_coupon',
  DELETE_COUPON: 'delete_coupon',
  GET_COUPON_USAGE: 'get_coupon_usage',
  // Server-authoritative order pricing. Checkout resolves every line through this
  // rather than trusting prices from the request body.
  PRICE_ORDER_ITEMS: 'price_order_items',
  // Conditional stock take, and its compensating release. Called between pricing
  // and `place_order`: the decrement has to be the thing that loses a race, not a
  // clamp applied after the order already exists.
  RESERVE_LISTING_STOCK: 'reserve_listing_stock',
  RELEASE_LISTING_STOCK: 'release_listing_stock',
  // Splits a placed order into one fulfilment record per seller. Without this the
  // seller portal never learns that an order exists — see
  // `SellerService.createSellerOrders`.
  CREATE_SELLER_ORDERS: 'create_seller_orders',
  // "Which seller account does this signed-in user own?" — how the seller portal
  // learns its own id instead of assuming a hard-coded demo one.
  GET_SELLER_BY_OWNER: 'get_seller_by_owner',
  VALIDATE_COUPON: 'validate_coupon',
  REDEEM_COUPON: 'redeem_coupon',

  // ── Returns ─────────────────────────────────────────────────────────────────
  GET_RETURNS: 'get_returns',
  GET_RETURN_BY_ID: 'get_return_by_id',
  CREATE_RETURN: 'create_return',
  UPDATE_RETURN_STATUS: 'update_return_status',
  CANCEL_RETURN: 'cancel_return',
  // Shopper-filed listing reports — the product page's report control
  // had no endpoint behind it at all.
  REPORT_PRODUCT: 'report_product',
  LIST_PRODUCT_REPORTS: 'list_product_reports',
  RESOLVE_PRODUCT_REPORT: 'resolve_product_report',
  // Price-drop watches. The wishlist's notify control had nowhere to write.
  CREATE_PRICE_ALERT: 'create_price_alert',
  LIST_PRICE_ALERTS: 'list_price_alerts',
  DELETE_PRICE_ALERT: 'delete_price_alert',
  SWEEP_PRICE_ALERTS: 'sweep_price_alerts',
  ASSIGN_RETURN_PICKUP: 'assign_return_pickup',

  // ── Variants ────────────────────────────────────────────────────────────────
  GET_VARIANTS: 'get_variants',
  GET_VARIANT_BY_ID: 'get_variant_by_id',
  CREATE_VARIANT: 'create_variant',
  UPDATE_VARIANT: 'update_variant',
  DELETE_VARIANT: 'delete_variant',
  UPDATE_VARIANT_STOCK: 'update_variant_stock',
  GET_LOW_STOCK_VARIANTS: 'get_low_stock_variants',

  // ── Gift Cards ──────────────────────────────────────────────────────────────
  GIFT_CARD_BALANCE: 'gift_card_balance',
  GIFT_CARD_REDEEM: 'gift_card_redeem',

  // ── Q&A ─────────────────────────────────────────────────────────────────────
  GET_QUESTIONS: 'get_questions',
  CREATE_QUESTION: 'create_question',
  CREATE_ANSWER: 'create_answer',
  GET_ANSWERS: 'get_answers',
  UPVOTE_QUESTION: 'upvote_question',
  VOTE_ANSWER_HELPFUL: 'vote_answer_helpful',
  ACCEPT_ANSWER: 'accept_answer',

  // ── Notifications ─────────────────────────────────────────────────────────────
  GET_NOTIFICATIONS: 'get_notifications',
  MARK_NOTIFICATION_READ: 'mark_notification_read',
  MARK_ALL_NOTIFICATIONS_READ: 'mark_all_notifications_read',

  // ── Account / Discovery ───────────────────────────────────────────────────────
  GET_RECENTLY_VIEWED: 'get_recently_viewed',
  CLEAR_RECENTLY_VIEWED: 'clear_recently_viewed',
  GET_BUY_AGAIN: 'get_buy_again',
  GET_CUSTOMER_ORDERS: 'get_customer_orders',
  GET_PRODUCT_BUNDLES: 'get_product_bundles',
  GET_EMI_OPTIONS: 'get_emi_options',
  // Market-aware finance quote: plans exist per market, and the quote is on
  // the buy-box price of that market, not on the list price.
  GET_PRODUCT_EMI_OPTIONS: 'get_product_emi_options',
  GET_ORDER_INVOICE: 'get_order_invoice',

  // ── Tracking ────────────────────────────────────────────────────────────────
  GET_TRACKING: 'get_tracking',
  ADD_TRACKING_EVENT: 'add_tracking_event',

  // ── Delivery ────────────────────────────────────────────────────────────────
  CREATE_DELIVERY_ASSIGNMENT: 'create_delivery_assignment',
  GET_DELIVERY_ASSIGNMENTS: 'get_delivery_assignments',
  GET_DELIVERY_ASSIGNMENT_BY_ID: 'get_delivery_assignment_by_id',
  UPDATE_DELIVERY_STATUS: 'update_delivery_status',
  VERIFY_DELIVERY_OTP: 'verify_delivery_otp',
  GET_PARTNER_ACTIVE_DELIVERY: 'get_partner_active_delivery',

  // ── Seller Portal ───────────────────────────────────────────────────────────
  SELLER_GET_DASHBOARD: 'seller_get_dashboard',
  SELLER_GET_COUPONS: 'seller_create_coupon',
  SELLER_CREATE_COUPON: 'seller_create_coupon',
  SELLER_GET_BUNDLES: 'seller_get_bundles',
  SELLER_CREATE_BUNDLE: 'seller_create_bundle',

  // ── Admin ───────────────────────────────────────────────────────────────────
  // ── Admin console ─────────────────────────────────────────────────────────
  // Every route below used to send ADMIN_GET_DASHBOARD, so the admin panel asked
  // the service for dashboard counters whatever the operator had clicked, and the
  // gateway's catch turned the mismatch into `{ success: true }` or an empty list.
  // Each concern now has its own pattern and its own handler.
  ADMIN_GET_PAGE_LAYOUT: 'admin_get_page_layout',
  ADMIN_UPDATE_PAGE_LAYOUT: 'admin_update_page_layout',
  ADMIN_GET_SEO: 'admin_get_seo',
  ADMIN_UPDATE_SEO: 'admin_update_seo',
  ADMIN_GET_SETTINGS: 'admin_get_settings',
  ADMIN_UPDATE_SETTINGS: 'admin_update_settings',
  ADMIN_GET_PROMOTIONS: 'admin_get_promotions',
  ADMIN_CREATE_PROMOTION: 'admin_create_promotion',
  ADMIN_UPDATE_PROMOTION: 'admin_update_promotion',
  ADMIN_GET_NOTIFICATIONS: 'admin_get_notifications',
  ADMIN_SEND_NOTIFICATION: 'admin_send_notification',
  ADMIN_GET_HSN_CODES: 'admin_get_hsn_codes',
  ADMIN_CREATE_HSN_CODE: 'admin_create_hsn_code',
  ADMIN_UPDATE_HSN_CODE: 'admin_update_hsn_code',
  ADMIN_GET_FEATURED: 'admin_get_featured',
  ADMIN_ADD_FEATURED: 'admin_add_featured',
  ADMIN_REMOVE_FEATURED: 'admin_remove_featured',
  ADMIN_GET_SPONSORED: 'admin_get_sponsored',
  ADMIN_UPDATE_SPONSORED: 'admin_update_sponsored',
  ADMIN_GET_QA: 'admin_get_qa',
  ADMIN_MODERATE_QA: 'admin_moderate_qa',
  ADMIN_GET_COMPLAINTS: 'admin_get_complaints',
  ADMIN_UPDATE_COMPLAINT: 'admin_update_complaint',
  ADMIN_GET_COMPLIANCE_COUNTRIES: 'admin_get_compliance_countries',
  ADMIN_UPDATE_COMPLIANCE_COUNTRY: 'admin_update_compliance_country',
  ADMIN_GET_CUSTOMERS: 'admin_get_customers',
  ADMIN_BLOCK_CUSTOMER: 'admin_block_customer',
  ADMIN_GET_SELLER_WALLETS: 'admin_get_seller_wallets',
  ADMIN_GET_INDIA_OPS: 'admin_get_india_ops',
  ADMIN_UPDATE_INDIA_OPS: 'admin_update_india_ops',
  ADMIN_GET_DISPUTES: 'admin_get_disputes',
  ADMIN_GET_CUSTOMER_SEGMENTS: 'admin_get_customer_segments',

  ADMIN_GET_DASHBOARD: 'admin_get_dashboard',
  ADMIN_GET_SELLERS: 'admin_get_sellers',
  ADMIN_PENDING_SELLER_COUNTS: 'admin_pending_seller_counts',
  ADMIN_GET_SELLER_BY_ID: 'admin_get_seller_by_id',
  // Listing-level moderation. An offer on an existing catalogue product creates
  // no `products` row, so it never appears in the product approvals queue —
  // without its own queue a submitted offer would sit PENDING forever.
  ADMIN_PENDING_LISTINGS: 'admin_pending_listings',
  ADMIN_APPROVE_LISTING: 'admin_approve_listing',
  ADMIN_REJECT_LISTING: 'admin_reject_listing',
  ADMIN_APPROVE_SELLER: 'admin_approve_seller',
  ADMIN_REJECT_SELLER: 'admin_reject_seller',
  ADMIN_SUSPEND_SELLER: 'admin_suspend_seller',
  ADMIN_REACTIVATE_SELLER: 'admin_reactivate_seller',
  ADMIN_GET_PRODUCTS: 'admin_get_products',
  // Distinct from ADMIN_GET_PRODUCTS on purpose: that one is served by
  // `CatalogService.getProducts`, which hard-codes `approval_status = 'APPROVED'`
  // because it is the storefront read. Routing the approvals queue through it
  // meant the queue could only ever list products that were already approved.
  ADMIN_GET_PENDING_PRODUCTS: 'admin_get_pending_products',
  ADMIN_GET_PRODUCT_BY_ID: 'admin_get_product_by_id',
  // Governance mutations. Each of these replaced a gateway handler that returned
  // a hand-built `{ success: true }` and wrote nothing.
  ADMIN_PUBLISH_PRODUCT: 'admin_publish_product',
  ADMIN_UNPUBLISH_PRODUCT: 'admin_unpublish_product',
  ADMIN_SUSPEND_PRODUCT: 'admin_suspend_product',
  ADMIN_REQUEST_PRODUCT_CORRECTION: 'admin_request_product_correction',
  ADMIN_FEATURE_PRODUCT: 'admin_feature_product',
  ADMIN_UNFEATURE_PRODUCT: 'admin_unfeature_product',
  ADMIN_UPDATE_BRAND: 'admin_update_brand',
  ADMIN_REJECT_BRAND: 'admin_reject_brand',
  ADMIN_SUSPEND_BRAND: 'admin_suspend_brand',
  ADMIN_UPDATE_CAMPAIGN: 'admin_update_campaign',
  ADMIN_BLOCK_SELLER: 'admin_block_seller',
  ADMIN_FLAG_REVIEW: 'admin_flag_review',
  ADMIN_HIDE_REVIEW: 'admin_hide_review',
  ADMIN_UPDATE_COMMISSION: 'admin_update_commission',
  ADMIN_PROCESS_PAYOUT: 'admin_process_payout',
  ADMIN_CREATE_SUBCATEGORY: 'admin_create_subcategory',
  ADMIN_UPDATE_SUBCATEGORY: 'admin_update_subcategory',
  ADMIN_DELETE_SUBCATEGORY: 'admin_delete_subcategory',
  ADMIN_GET_ATTRIBUTES: 'admin_get_attributes',
  ADMIN_CREATE_ATTRIBUTE: 'admin_create_attribute',
  ADMIN_UPDATE_ATTRIBUTE: 'admin_update_attribute',
  ADMIN_DELETE_ATTRIBUTE: 'admin_delete_attribute',
  ADMIN_CREATE_BANNER: 'admin_create_banner',
  ADMIN_UPDATE_BANNER: 'admin_update_banner',
  ADMIN_DELETE_BANNER: 'admin_delete_banner',
  ADMIN_UPDATE_BANK_OFFER: 'admin_update_bank_offer',
  GET_OFFERS_FOR_PRODUCT: 'get_offers_for_product',
  // Offers that apply to ONE product in ONE market, currently valid. The
  // older pattern above answers with every active offer for a category name.
  GET_PRODUCT_OFFERS: 'get_product_offers',
  ADMIN_LIST_BANK_OFFERS: 'admin_list_bank_offers',
  ADMIN_CREATE_BANK_OFFER: 'admin_create_bank_offer',
  ADMIN_LIST_EXCHANGE_OFFERS: 'admin_list_exchange_offers',
  ADMIN_CREATE_EXCHANGE_OFFER: 'admin_create_exchange_offer',
  ADMIN_DELETE_EXCHANGE_OFFER: 'admin_delete_exchange_offer',
  ADMIN_DELETE_BANK_OFFER: 'admin_delete_bank_offer',
  ADMIN_UPDATE_EXCHANGE_OFFER: 'admin_update_exchange_offer',
  ADMIN_ADJUST_SELLER_WALLET: 'admin_adjust_seller_wallet',
  ADMIN_APPROVE_PRODUCT: 'admin_approve_product',
  ADMIN_REJECT_PRODUCT: 'admin_reject_product',
  ADMIN_GET_CATEGORIES: 'admin_get_categories',
  ADMIN_CREATE_CATEGORY: 'admin_create_category',
  ADMIN_UPDATE_CATEGORY: 'admin_update_category',
  ADMIN_DELETE_CATEGORY: 'admin_delete_category',
  ADMIN_GET_BRANDS: 'admin_get_brands',
  ADMIN_GET_ORDERS: 'admin_get_orders',
  ADMIN_GET_PAYOUTS: 'admin_get_payouts',
  ADMIN_GET_CAMPAIGNS: 'admin_get_campaigns',
  ADMIN_GET_REVENUE_ANALYTICS: 'admin_get_revenue_analytics',
  ADMIN_GET_CONVERSION_FUNNEL: 'admin_get_conversion_funnel',
  ADMIN_GET_SELLER_RANKINGS: 'admin_get_seller_rankings',
  ADMIN_GET_CATEGORY_PERFORMANCE: 'admin_get_category_performance',
  ADMIN_GET_REGIONAL_PERFORMANCE: 'admin_get_regional_performance',
  ADMIN_GET_INVENTORY_AGING: 'admin_get_inventory_aging',
  ADMIN_GET_RETURN_ANALYSIS: 'admin_get_return_analysis',
  ADMIN_GET_FRAUD_ALERTS: 'admin_get_fraud_alerts',
  ADMIN_GET_SLA_COMPLIANCE: 'admin_get_sla_compliance',
  ADMIN_GET_PENALTY_LEDGER: 'admin_get_penalty_ledger',
} as const;

export type MarketplacePattern = (typeof MARKETPLACE_PATTERNS)[keyof typeof MARKETPLACE_PATTERNS];
