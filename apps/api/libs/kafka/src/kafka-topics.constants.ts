/**
 * KARTSEEK Kafka Topic Registry
 * Centralised constants for all Kafka topic names.
 * Import from '@app/kafka' in any service that produces or consumes events.
 */
export const KAFKA_TOPICS = {
  // ── Order lifecycle ────────────────────────────────────────────────────────
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_UPDATED: 'order.status_updated',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',

  // ── User Lifecycle ─────────────────────────────────────────────────────────
  USER_REGISTERED: 'user.registered',
  /** Carries a single-use reset link for notification-service to deliver. */
  PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',

  // ── Payment ────────────────────────────────────────────────────────────────
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUND_INITIATED: 'payment.refund.initiated',

  // ── Wallet ─────────────────────────────────────────────────────────────────
  WALLET_CREDITED: 'wallet.credited',
  WALLET_DEBITED: 'wallet.debited',
  WALLET_TOPUP_COMPLETED: 'wallet.topup.completed',
  WALLET_FROZEN: 'wallet.frozen',
  WALLET_UNFROZEN: 'wallet.unfrozen',

  // ── Loyalty ────────────────────────────────────────────────────────────────
  LOYALTY_POINTS_AWARDED: 'loyalty.points.awarded',
  LOYALTY_POINTS_REDEEMED: 'loyalty.points.redeemed',
  LOYALTY_POINTS_REVERSED: 'loyalty.points.reversed',

  // ── Notifications ──────────────────────────────────────────────────────────
  NOTIFICATION_PUSH: 'notification.push',
  NOTIFICATION_SMS: 'notification.sms',
  NOTIFICATION_EMAIL: 'notification.email',
  NOTIFICATION_BROADCAST: 'notification.promo.broadcast',

  // ── Restaurant ─────────────────────────────────────────────────────────────
  RESTAURANT_APPROVED: 'restaurant.approved',
  RESTAURANT_STATUS_CHANGED: 'restaurant.status.changed',
  RESTAURANT_MENU_ITEM_CREATED: 'restaurant.menu_item.created',
  RESTAURANT_TABLE_BOOKED: 'restaurant.table.booked',

  // ── Grocery ────────────────────────────────────────────────────────────────
  GROCERY_ORDER_CREATED: 'grocery.order.created',
  GROCERY_ORDER_STATUS_UPDATED: 'grocery.order.status_updated',
  GROCERY_CATEGORY_UPDATED: 'grocery.category.updated',
  GROCERY_STORE_APPROVED: 'grocery.store.approved',
  GROCERY_STORE_SUSPENDED: 'grocery.store.suspended',
  GROCERY_INVENTORY_LOW: 'grocery.inventory.low_stock',
  GROCERY_DELIVERY_REQUESTED: 'grocery.delivery.requested',
  GROCERY_PRODUCT_CREATED: 'grocery.product.created',
  // Moderation outcomes. grocery.service publishes these on every decision;
  // they had no constant and no subscriber, so a seller was never told that
  // their listing had gone live or been rejected.
  GROCERY_PRODUCT_APPROVED: 'grocery.product.approved',
  GROCERY_PRODUCT_REJECTED: 'grocery.product.rejected',

  // ── Doctor ─────────────────────────────────────────────────────────────────
  DOCTOR_APPOINTMENT_BOOKED: 'doctor.appointment.booked',
  DOCTOR_APPOINTMENT_UPDATED: 'doctor.appointment.updated',
  DOCTOR_APPOINTMENT_CANCELLED: 'doctor.appointment.cancelled',
  DOCTOR_APPOINTMENT_COMPLETED: 'doctor.appointment.completed',
  DOCTOR_REGISTERED: 'doctor.registered',
  DOCTOR_STATUS_CHANGED: 'doctor.status_changed',
  DOCTOR_TOKEN_ADVANCED: 'doctor.token.advanced',
  DOCTOR_QUEUE_UPDATED: 'doctor.queue.updated',
  DOCTOR_APPOINTMENT_REMINDER: 'doctor.appointment.reminder',

  // ── Taxi Ride Lifecycle ─────────────────────────────────────────────────────
  TAXI_RIDE_REQUESTED: 'taxi.ride.requested',
  TAXI_RIDE_STATUS_UPDATED: 'taxi.ride.status_updated',
  TAXI_RIDE_COMPLETED: 'taxi.ride.completed',
  TAXI_RIDE_CANCELLED: 'taxi.ride.cancelled',
  TAXI_RIDE_NO_DRIVER: 'taxi.ride.no_driver',

  // ── Taxi Dispatch Pipeline ────────────────────────────────────────────────
  TAXI_RIDE_REQUEST_SENT: 'taxi.ride.request_sent',
  TAXI_RIDE_DRIVER_ACCEPTED: 'taxi.ride.driver_accepted',
  TAXI_RIDE_DRIVER_REJECTED: 'taxi.ride.driver_rejected',
  TAXI_RIDE_DRIVER_TIMEOUT: 'taxi.ride.driver_timeout',

  // ── Taxi Driver State ─────────────────────────────────────────────────────
  TAXI_DRIVER_STATUS_CHANGED: 'taxi.driver.status_changed',
  TAXI_DRIVER_LOCATION_UPDATED: 'taxi.driver.location_updated',

  // ── Taxi Surge & Analytics ────────────────────────────────────────────────
  TAXI_SURGE_ACTIVATED: 'taxi.surge.activated',
  TAXI_SURGE_DEACTIVATED: 'taxi.surge.deactivated',

  // ── Delivery ───────────────────────────────────────────────────────────────
  DELIVERY_PARTNER_ASSIGNED: 'delivery.partner.assigned',
  DELIVERY_STATUS_UPDATED: 'delivery.status.updated',
  DELIVERY_REQUEST_CREATED: 'delivery.request.created',
  DELIVERY_PARTNER_LOCATION: 'delivery.partner.location',
  DELIVERY_PARTNER_ONLINE: 'delivery.partner.online',
  DELIVERY_PARTNER_OFFLINE: 'delivery.partner.offline',
  DELIVERY_FEE_CALCULATED: 'delivery.fee.calculated',

  // ── Flash Deals ─────────────────────────────────────────────────────────────
  FLASH_DEAL_CREATED: 'flash_deal.created',
  FLASH_DEAL_UPDATED: 'flash_deal.updated',
  FLASH_DEAL_STARTED: 'flash_deal.started',
  FLASH_DEAL_ENDED: 'flash_deal.ended',
  FLASH_DEAL_NOMINATION_SUBMITTED: 'flash_deal.nomination.submitted',
  FLASH_DEAL_NOMINATION_APPROVED: 'flash_deal.nomination.approved',
  FLASH_DEAL_NOMINATION_REJECTED: 'flash_deal.nomination.rejected',

  // ── Seller & Marketplace ───────────────────────────────────────────────────
  SELLER_REGISTERED: 'seller.registered',
  SELLER_APPROVED: 'seller.approved',
  SELLER_REJECTED: 'seller.rejected',
  SELLER_SUSPENDED: 'seller.suspended',
  SELLER_BLOCKED: 'seller.blocked',
  SELLER_REACTIVATED: 'seller.reactivated',
  SELLER_PRODUCT_CREATED: 'seller.product.created',

  /**
   * Marketplace catalogue moderation.
   *
   * marketplace-service has published these since it was written; they were
   * simply never declared here, so `create-kafka-topics.js` never created them
   * and the broker runs with auto-creation disabled. search-service consumes
   * all four to keep the index in step with what an admin has approved — an
   * undeclared topic meant its consumer could not even start.
   */
  PRODUCT_APPROVED: 'product.approved',
  PRODUCT_REJECTED: 'product.rejected',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_SUSPENDED: 'product.suspended',
  INVENTORY_UPDATED: 'inventory.updated',
  MARKETPLACE_HOME_UPDATED: 'marketplace.home.updated',
  /**
   * A customer order has been split onto the seller who must fulfil it.
   * Distinct from `order.created`, which is the customer's whole basket and
   * carries no seller — this one is per seller and is what drives the seller
   * portal's live new-order toast and pending badge.
   */
  MARKETPLACE_ORDER_PLACED: 'marketplace.order.placed',

  // ── Franchise ──────────────────────────────────────────────────────────────
  FRANCHISE_REGISTERED: 'franchise.registered',
  FRANCHISE_COMPLIANCE_SUBMITTED: 'franchise.compliance.submitted',

  // ── Refund ─────────────────────────────────────────────────────────────────
  REFUND_REQUESTED: 'refund.requested',
  REFUND_APPROVED: 'refund.approved',
  REFUND_REJECTED: 'refund.rejected',

  // ── Commission & Payout ────────────────────────────────────────────────────
  COMMISSION_CALCULATED: 'commission.calculated',
  PAYOUT_REQUESTED: 'payout.requested',
  PAYOUT_PROCESSED: 'payout.processed',

  // ── Admin / Platform ───────────────────────────────────────────────────────
  ADMIN_USER_BANNED: 'admin.user.banned',
  ADMIN_KYC_APPROVED: 'admin.kyc.approved',
  ADMIN_KYC_SUBMITTED: 'admin.kyc.submitted',

  // ── Audit ──────────────────────────────────────────────────────────────────
  AUDIT_LOG: 'audit.log',

  // ── Search ─────────────────────────────────────────────────────────────────
  SEARCH_PERFORMED: 'search.performed',

  // ── GDPR & Privacy ────────────────────────────────────────────────────────
  GDPR_CONSENT_GRANTED: 'gdpr.consent.granted',
  GDPR_CONSENT_REVOKED: 'gdpr.consent.revoked',
  GDPR_DATA_EXPORT_REQUESTED: 'gdpr.data.export.requested',
  GDPR_DATA_EXPORT_COMPLETED: 'gdpr.data.export.completed',
  GDPR_DATA_ERASURE_REQUESTED: 'gdpr.data.erasure.requested',
  GDPR_DATA_ERASURE_COMPLETED: 'gdpr.data.erasure.completed',

  // ── Partner Lifecycle ─────────────────────────────────────────────────────
  PARTNER_REGISTERED: 'partner.registered',
  PARTNER_STATUS_CHANGED: 'partner.status.changed',
  PARTNER_LOCATION_UPDATED: 'partner.location.updated',

  // ── Safety & Emergency ────────────────────────────────────────────────────
  EMERGENCY_SOS_TRIGGERED: 'emergency.sos_triggered',
  TAXI_SOS_TRIGGERED: 'taxi.sos.triggered',

  // ── Franchise ─────────────────────────────────────────────────────────────
  FRANCHISE_SELLER_STATUS_UPDATED: 'franchise.marketplace.seller_status_updated',

  // ── Tier 6: Return Requests ────────────────────────────────────────────────
  RETURN_CREATED: 'marketplace.return.created',
  RETURN_STATUS_UPDATED: 'marketplace.return.status_updated',
  RETURN_PICKUP_ASSIGNED: 'marketplace.return.pickup_assigned',

  // ── Tier 6: Coupons ────────────────────────────────────────────────────────
  COUPON_REDEEMED: 'marketplace.coupon.redeemed',
  COUPON_EXPIRED: 'marketplace.coupon.expired',

  // ── Tier 6: Shipment Tracking ──────────────────────────────────────────────
  SHIPMENT_TRACKING_UPDATED: 'marketplace.shipment.tracking_updated',

  // ── Tier 6: Product Variants ───────────────────────────────────────────────
  VARIANT_LOW_STOCK: 'marketplace.variant.low_stock',

  // ── Tier 6: Product Q&A ────────────────────────────────────────────────────
  QA_QUESTION_POSTED: 'marketplace.qa.question_posted',
  QA_ANSWER_POSTED: 'marketplace.qa.answer_posted',

  // ── Tier 6: Delivery Assignment ────────────────────────────────────────────
  DELIVERY_ASSIGNMENT_CREATED: 'marketplace.delivery.assigned',

  // ── Pharmacy ────────────────────────────────────────────────────────────────
  PHARMACY_ORDER_CREATED: 'pharmacy.order.created',
  PHARMACY_ORDER_STATUS_UPDATED: 'pharmacy.order.status_updated',
  PHARMACY_ORDER_COMPLETED: 'pharmacy.order.completed',
  PHARMACY_PRESCRIPTION_UPLOADED: 'pharmacy.prescription.uploaded',
  PHARMACY_PRESCRIPTION_VERIFIED: 'pharmacy.prescription.verified',
  PHARMACY_STORE_APPROVED: 'pharmacy.store.approved',
  PHARMACY_STORE_SUSPENDED: 'pharmacy.store.suspended',
  PHARMACY_LOW_STOCK: 'pharmacy.low_stock',
  PHARMACY_DELIVERY_REQUESTED: 'pharmacy.delivery.requested',
  PHARMACY_DELIVERY_COMPLETED: 'pharmacy.delivery.completed',

  // ── Doctor Appointments (additional) ────────────────────────────────────────
  DOCTOR_APPOINTMENT_RESCHEDULED: 'doctor.appointment.rescheduled',

  // ── Doctor Prescriptions ────────────────────────────────────────────────────
  DOCTOR_PRESCRIPTION_ISSUED: 'doctor.prescription.issued',
  DOCTOR_PRESCRIPTION_DISPENSED: 'doctor.prescription.dispensed',
  DOCTOR_PRESCRIPTION_TO_PHARMACY: 'doctor.prescription.to_pharmacy',
  PHARMACY_ORDER_FROM_PRESCRIPTION: 'pharmacy.order.from_prescription',

  // ── Centralized Payment (v2) ───────────────────────────────────────────────
  PAYMENT_V2_INITIATED: 'payment.v2.initiated',
  PAYMENT_V2_PROCESSING: 'payment.v2.processing',
  PAYMENT_V2_COMPLETED: 'payment.v2.completed',
  PAYMENT_V2_FAILED: 'payment.v2.failed',
  PAYMENT_V2_REFUND_REQUESTED: 'payment.v2.refund.requested',
  PAYMENT_V2_REFUND_COMPLETED: 'payment.v2.refund.completed',
  PAYMENT_V2_PREAUTH_CREATED: 'payment.v2.preauth.created',
  PAYMENT_V2_PREAUTH_CAPTURED: 'payment.v2.preauth.captured',
  PAYMENT_V2_PREAUTH_RELEASED: 'payment.v2.preauth.released',

  // ── Invoice ────────────────────────────────────────────────────────────────
  INVOICE_GENERATED: 'invoice.generated',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_DOWNLOAD_REQUESTED: 'invoice.download.requested',

  // ── Settlement ─────────────────────────────────────────────────────────────
  SETTLEMENT_CREATED: 'settlement.created',
  SETTLEMENT_SETTLED: 'settlement.settled',
  SETTLEMENT_FAILED: 'settlement.failed',

  // ── Taxi Real-Time Billing ─────────────────────────────────────────────────
  TAXI_BILLING_PREAUTH: 'taxi.billing.preauth',
  TAXI_BILLING_METER_UPDATED: 'taxi.billing.meter_updated',
  TAXI_BILLING_CAPTURED: 'taxi.billing.captured',
  TAXI_BILLING_CANCELLED: 'taxi.billing.cancelled',
  TAXI_BILLING_PREAUTH_FAILED: 'taxi.billing.preauth.failed',
  TAXI_BILLING_CAPTURE_FAILED: 'taxi.billing.capture.failed',

  // ── Hotel Bookings ─────────────────────────────────────────────────────────
  HOTEL_BOOKING_CONFIRMED: 'hotel.booking.confirmed',
  HOTEL_BOOKING_CANCELLED: 'hotel.booking.cancelled',
  HOTEL_GUEST_CHECKED_IN: 'hotel.guest.checked_in',
  HOTEL_GUEST_CHECKED_OUT: 'hotel.guest.checked_out',
  HOTEL_ROOM_AVAILABILITY_CHANGED: 'hotel.room.availability_changed',
  HOTEL_PRICE_CHANGED: 'hotel.price.changed',

  // ── Recommendation Engine ─────────────────────────────────────────────────
  USER_ACTIVITY_TRACKED: 'user.activity.tracked',
  RECOMMENDATION_GENERATED: 'recommendation.generated',
  RECOMMENDATION_CLICKED: 'recommendation.clicked',
  RECOMMENDATION_TRENDING_COMPUTED: 'recommendation.trending.computed',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/**
 * Topics that services publish by literal name and that no consumer group
 * subscribes to by constant yet.
 *
 * Declared on 2026-09-13 from a scan of every `kafka.publish('…')` /
 * `.emit('…')` call in apps/api/apps and modules/*\/backend (163 names across
 * 15 backends). The broker runs with auto-create off and the provisioner
 * (apps/api/scripts/create-kafka-topics.js) creates exactly the names declared
 * in this file, so an undeclared name was a topic that did not exist: every
 * publish to it failed its metadata lookup ("This server does not host this
 * topic-partition") through kafkajs's retries and was dropped, while the
 * producer logged "Published". `kafka-topics.registry.spec.ts` fails the build
 * on the next undeclared literal.
 *
 * Several names here are the same event under two vocabularies
 * (`order.placed` next to `marketplace.order.placed`, `review.created` next
 * to `product.review.created`, `qa.question-created` next to
 * `marketplace.qa.question_posted`). They are declared as published, so that
 * nothing is lost; consolidating publishers onto one name per event and
 * moving them to KAFKA_TOPICS is the follow-up.
 */
export const PUBLISHED_TOPICS = {
  // ── admin ──
  ADMIN_KYC_REJECTED: 'admin.kyc.rejected',
  ADMIN_ROLE_CREATED: 'admin.role.created',
  ADMIN_ROLE_DELETED: 'admin.role.deleted',
  ADMIN_ROLE_UPDATED: 'admin.role.updated',
  ADMIN_STAFF_CREATED: 'admin.staff.created',
  ADMIN_STAFF_UPDATED: 'admin.staff.updated',
  ADMIN_USER_UNBANNED: 'admin.user.unbanned',
  // ── attribute ──
  ATTRIBUTE_CREATED: 'attribute.created',
  ATTRIBUTE_DELETED: 'attribute.deleted',
  ATTRIBUTE_UPDATED: 'attribute.updated',
  // ── bank ──
  BANK_OFFER_CREATED: 'bank-offer.created',
  BANK_OFFER_DELETED: 'bank-offer.deleted',
  BANK_OFFER_UPDATED: 'bank-offer.updated',
  // ── brand ──
  BRAND_APPROVED: 'brand.approved',
  BRAND_CREATED: 'brand.created',
  BRAND_DEACTIVATED: 'brand.deactivated',
  BRAND_DELETED: 'brand.deleted',
  BRAND_FOLLOWED: 'brand.followed',
  BRAND_REJECTED: 'brand.rejected',
  BRAND_SUSPENDED: 'brand.suspended',
  BRAND_UNFOLLOWED: 'brand.unfollowed',
  BRAND_UPDATE_CREATED: 'brand.update.created',
  BRAND_UPDATED: 'brand.updated',
  // ── bundle ──
  BUNDLE_CREATED: 'bundle.created',
  // ── campaign ──
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_DELETED: 'campaign.deleted',
  CAMPAIGN_UPDATED: 'campaign.updated',
  // ── cart ──
  CART_ITEM_ADDED: 'cart.item.added',
  // ── category ──
  CATEGORY_CREATED: 'category.created',
  CATEGORY_DEACTIVATED: 'category.deactivated',
  CATEGORY_DELETED: 'category.deleted',
  CATEGORY_UPDATED: 'category.updated',
  // ── commission ──
  COMMISSION_CATEGORY_RATE_UPDATED: 'commission.category-rate.updated',
  COMMISSION_CREATED: 'commission.created',
  COMMISSION_RATE_UPDATED: 'commission.rate.updated',
  COMMISSION_SELLER_OVERRIDE_SET: 'commission.seller-override.set',
  COMMISSION_TRIGGER: 'commission.trigger',
  COMMISSION_UPDATED: 'commission.updated',
  // ── complaint ──
  COMPLAINT_UPDATED: 'complaint.updated',
  // ── compliance ──
  COMPLIANCE_COUNTRY_UPDATED: 'compliance.country.updated',
  // ── coupon ──
  COUPON_CREATED: 'coupon.created',
  COUPON_REDEEMED: 'coupon.redeemed',
  COUPON_UPDATED: 'coupon.updated',
  // ── customer ──
  CUSTOMER_BLOCKED: 'customer.blocked',
  // ── delivery ──
  DELIVERY_ASSIGN_PARTNER: 'delivery.assign_partner',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_ASSIGNMENT_REQUESTED: 'delivery.assignment.requested',
  DELIVERY_OTP_GENERATED: 'delivery.otp.generated',
  DELIVERY_OTP_VERIFIED: 'delivery.otp.verified',
  DELIVERY_PARTNER_STATUS_CHANGED: 'delivery.partner.status_changed',
  DELIVERY_PROOF_SUBMITTED: 'delivery.proof-submitted',
  DELIVERY_STATUS_UPDATED: 'delivery.status-updated',
  // ── exchange ──
  EXCHANGE_OFFER_CREATED: 'exchange-offer.created',
  EXCHANGE_OFFER_DELETED: 'exchange-offer.deleted',
  EXCHANGE_OFFER_UPDATED: 'exchange-offer.updated',
  // ── featured ──
  FEATURED_ADDED: 'featured.added',
  FEATURED_REMOVED: 'featured.removed',
  // ── flash ──
  FLASH_DEAL_DELETED: 'flash-deal.deleted',
  // ── franchise ──
  FRANCHISE_HOTEL_STATUS_UPDATED: 'franchise.hotel.status_updated',
  FRANCHISE_TAXI_DRIVER_STATUS_UPDATED: 'franchise.taxi.driver_status_updated',
  // ── gift ──
  GIFT_CARD_REDEEMED: 'gift-card.redeemed',
  // ── grocery ──
  GROCERY_BRAND_REQUESTED: 'grocery.brand.requested',
  GROCERY_FLASH_DEAL_APPROVED: 'grocery.flash_deal.approved',
  GROCERY_FLASH_DEAL_REJECTED: 'grocery.flash_deal.rejected',
  GROCERY_FLASH_DEAL_SUBMITTED: 'grocery.flash_deal.submitted',
  GROCERY_SETTINGS_UPDATED: 'grocery.settings.updated',
  GROCERY_STORE_STATUS_CHANGED: 'grocery.store.status_changed',
  // ── hotel ──
  HOTEL_AMENITY_CREATED: 'hotel.amenity.created',
  HOTEL_APPROVED: 'hotel.approved',
  HOTEL_BOOKING_CREATED: 'hotel.booking.created',
  HOTEL_BOOKING_MODIFIED: 'hotel.booking.modified',
  HOTEL_BOOKING_NOSHOW: 'hotel.booking.noshow',
  HOTEL_OWNER_REGISTERED: 'hotel.owner.registered',
  HOTEL_PAYMENT_PROCESSED: 'hotel.payment.processed',
  HOTEL_REFUND_PROCESSED: 'hotel.refund.processed',
  HOTEL_REVIEW_MODERATED: 'hotel.review.moderated',
  HOTEL_REVIEW_SUBMITTED: 'hotel.review.submitted',
  HOTEL_SETTINGS_UPDATED: 'hotel.settings.updated',
  HOTEL_SUSPENDED: 'hotel.suspended',
  // ── hsn ──
  HSN_CREATED: 'hsn.created',
  HSN_UPDATED: 'hsn.updated',
  // ── india ──
  INDIA_OPS_UPDATED: 'india-ops.updated',
  // ── listing ──
  LISTING_APPROVED: 'listing.approved',
  LISTING_REJECTED: 'listing.rejected',
  // ── marketplace ──
  MARKETPLACE_ORDER_DELIVERED: 'marketplace.order.delivered',
  MARKETPLACE_PRICE_DROPPED: 'marketplace.price.dropped',
  MARKETPLACE_PRODUCT_REPORTED: 'marketplace.product.reported',
  // ── notification ──
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_SENT: 'notification.sent',
  // ── order ──
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_PACKED: 'order.packed',
  ORDER_PLACED: 'order.placed',
  ORDER_REJECTED: 'order.rejected',
  ORDER_SHIPPED: 'order.shipped',
  // ── page ──
  PAGE_LAYOUT_UPDATED: 'page-layout.updated',
  // ── payment ──
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_ESCROW_HELD: 'payment.escrow.held',
  PAYMENT_ESCROW_RELEASED: 'payment.escrow.released',
  // ── payout ──
  PAYOUT_APPROVED: 'payout.approved',
  // ── pharmacy ──
  PHARMACY_CATEGORY_CREATED: 'pharmacy.category.created',
  PHARMACY_PRODUCT_APPROVED: 'pharmacy.product.approved',
  PHARMACY_SETTINGS_UPDATED: 'pharmacy.settings.updated',
  PHARMACY_STORE_LICENCE_VERIFIED: 'pharmacy.store.licence.verified',
  // ── product ──
  PRODUCT_CORRECTION_REQUESTED: 'product.correction_requested',
  PRODUCT_CREATED: 'product.created',
  PRODUCT_QUESTION_ANSWERED: 'product.question.answered',
  PRODUCT_QUESTION_ASKED: 'product.question.asked',
  PRODUCT_REVIEW_CREATED: 'product.review.created',
  // ── promotion ──
  PROMOTION_UPDATED: 'promotion.updated',
  // ── qa ──
  QA_ANSWER_CREATED: 'qa.answer-created',
  QA_MODERATED: 'qa.moderated',
  QA_QUESTION_CREATED: 'qa.question-created',
  // ── restaurant ──
  // The two admin decisions M4 gave a handler. Approving a menu item and closing
  // a complaint each change something a restaurant owner or a customer is
  // waiting on, and neither had anywhere to announce it — the menu moderation
  // queue and the complaints queue did not exist at all before M4. Here rather
  // than in KAFKA_TOPICS because nothing consumes them yet: this half of the
  // registry is the producer-only names, and the provisioner creates both.
  RESTAURANT_COMPLAINT_RESOLVED: 'restaurant.complaint.resolved',
  RESTAURANT_MENU_ITEM_APPROVED: 'restaurant.menu_item.approved',
  RESTAURANT_ORDER_CANCELLED: 'restaurant.order.cancelled',
  RESTAURANT_ORDER_PLACED: 'restaurant.order.placed',
  RESTAURANT_ORDER_STATUS_CHANGED: 'restaurant.order.status_changed',
  // ── return ──
  RETURN_APPROVED: 'return.approved',
  RETURN_CREATED: 'return.created',
  RETURN_PICKUP_ASSIGNED: 'return.pickup-assigned',
  RETURN_REJECTED: 'return.rejected',
  RETURN_STATUS_UPDATED: 'return.status-updated',
  // ── review ──
  REVIEW_CREATED: 'review.created',
  REVIEW_FLAGGED: 'review.flagged',
  REVIEW_HIDDEN: 'review.hidden',
  // ── seller ──
  SELLER_COUPON_CREATED: 'seller-coupon.created',
  SELLER_WALLET_ADJUSTED: 'seller-wallet.adjusted',
  SELLER_BANK_ACCOUNT_ADDED: 'seller.bank_account.added',
  SELLER_FLASH_DEAL_JOINED: 'seller.flash_deal.joined',
  SELLER_LISTING_CREATED: 'seller.listing.created',
  SELLER_LISTING_UPDATED: 'seller.listing.updated',
  SELLER_PRODUCT_DELETED: 'seller.product.deleted',
  SELLER_PRODUCT_UPDATED: 'seller.product.updated',
  SELLER_PRODUCTS_BULK_CREATED: 'seller.products.bulk_created',
  SELLER_PROMOTION_CREATED: 'seller.promotion.created',
  SELLER_STAFF_INVITED: 'seller.staff.invited',
  SELLER_SUPPORT_TICKET_CREATED: 'seller.support.ticket_created',
  SELLER_WALLET_CREDITED: 'seller.wallet.credited',
  // ── seo ──
  SEO_UPDATED: 'seo.updated',
  // ── settings ──
  SETTINGS_UPDATED: 'settings.updated',
  // ── sponsored ──
  SPONSORED_UPDATED: 'sponsored.updated',
  // ── subcategory ──
  SUBCATEGORY_CREATED: 'subcategory.created',
  SUBCATEGORY_DEACTIVATED: 'subcategory.deactivated',
  SUBCATEGORY_DELETED: 'subcategory.deleted',
  // ── support ──
  SUPPORT_TICKET_CREATED: 'support.ticket.created',
  // ── taxi ──
  TAXI_DRIVER_APPROVED: 'taxi.driver.approved',
  TAXI_DRIVER_DOCUMENT_RESUBMITTED: 'taxi.driver.document.resubmitted',
  TAXI_DRIVER_DOCUMENT_SUBMITTED: 'taxi.driver.document.submitted',
  TAXI_DRIVER_ONBOARDING_COMPLETE: 'taxi.driver.onboarding.complete',
  TAXI_DRIVER_REGISTERED: 'taxi.driver.registered',
  TAXI_DRIVER_SUSPENDED: 'taxi.driver.suspended',
  TAXI_PAYOUT_BATCH_APPROVED: 'taxi.payout.batch.approved',
  TAXI_PAYOUT_GENERATED: 'taxi.payout.generated',
  TAXI_PAYOUT_SETTLED: 'taxi.payout.settled',
  TAXI_RIDE_DRIVER_ARRIVED: 'taxi.ride.driver_arrived',
  TAXI_RIDE_RATED: 'taxi.ride.rated',
  TAXI_RIDE_STARTED: 'taxi.ride.started',
  TAXI_VENDOR_APPROVED: 'taxi.vendor.approved',
  TAXI_VENDOR_BLOCKED: 'taxi.vendor.blocked',
  TAXI_VENDOR_REACTIVATED: 'taxi.vendor.reactivated',
  TAXI_VENDOR_REGISTERED: 'taxi.vendor.registered',
  TAXI_VENDOR_REJECTED: 'taxi.vendor.rejected',
  TAXI_VENDOR_SUSPENDED: 'taxi.vendor.suspended',
  // ── tracking ──
  TRACKING_EVENT_ADDED: 'tracking.event-added',
  // ── variant ──
  VARIANT_CREATED: 'variant.created',
  VARIANT_LOW_STOCK: 'variant.low-stock',
  VARIANT_UPDATED: 'variant.updated',
  // ── wallet ──
  WALLET_CREDIT_PLATFORM: 'wallet.credit.platform',
  WALLET_CREDIT_SELLER: 'wallet.credit.seller',
} as const;

export type PublishedTopic = (typeof PUBLISHED_TOPICS)[keyof typeof PUBLISHED_TOPICS];
