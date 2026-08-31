/**
 * KARTSEEK Kafka Topic Registry
 * Centralised constants for all Kafka topic names.
 * Import from '@app/kafka' in any service that produces or consumes events.
 */
export const KAFKA_TOPICS = {
  // ── Order lifecycle ────────────────────────────────────────────────────────
  ORDER_CREATED:           'order.created',
  ORDER_STATUS_UPDATED:    'order.status_updated',
  ORDER_CANCELLED:         'order.cancelled',
  ORDER_COMPLETED:         'order.completed',

  // ── User Lifecycle ─────────────────────────────────────────────────────────
  USER_REGISTERED:         'user.registered',
  /** Carries a single-use reset link for notification-service to deliver. */
  PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',

  // ── Payment ────────────────────────────────────────────────────────────────
  PAYMENT_SUCCESS:         'payment.success',
  PAYMENT_FAILED:          'payment.failed',
  PAYMENT_REFUND_INITIATED:'payment.refund.initiated',

  // ── Wallet ─────────────────────────────────────────────────────────────────
  WALLET_CREDITED:         'wallet.credited',
  WALLET_DEBITED:          'wallet.debited',
  WALLET_TOPUP_COMPLETED:  'wallet.topup.completed',
  WALLET_FROZEN:           'wallet.frozen',
  WALLET_UNFROZEN:         'wallet.unfrozen',

  // ── Loyalty ────────────────────────────────────────────────────────────────
  LOYALTY_POINTS_AWARDED:  'loyalty.points.awarded',
  LOYALTY_POINTS_REDEEMED: 'loyalty.points.redeemed',
  LOYALTY_POINTS_REVERSED: 'loyalty.points.reversed',

  // ── Notifications ──────────────────────────────────────────────────────────
  NOTIFICATION_PUSH:       'notification.push',
  NOTIFICATION_SMS:        'notification.sms',
  NOTIFICATION_EMAIL:      'notification.email',
  NOTIFICATION_BROADCAST:  'notification.promo.broadcast',

  // ── Restaurant ─────────────────────────────────────────────────────────────
  RESTAURANT_APPROVED:          'restaurant.approved',
  RESTAURANT_STATUS_CHANGED:    'restaurant.status.changed',
  RESTAURANT_MENU_ITEM_CREATED: 'restaurant.menu_item.created',
  RESTAURANT_TABLE_BOOKED:      'restaurant.table.booked',

  // ── Grocery ────────────────────────────────────────────────────────────────
  GROCERY_ORDER_CREATED:          'grocery.order.created',
  GROCERY_ORDER_STATUS_UPDATED:   'grocery.order.status_updated',
  GROCERY_CATEGORY_UPDATED:       'grocery.category.updated',
  GROCERY_STORE_APPROVED:         'grocery.store.approved',
  GROCERY_STORE_SUSPENDED:        'grocery.store.suspended',
  GROCERY_INVENTORY_LOW:          'grocery.inventory.low_stock',
  GROCERY_DELIVERY_REQUESTED:     'grocery.delivery.requested',
  GROCERY_PRODUCT_CREATED:        'grocery.product.created',
  // Moderation outcomes. grocery.service publishes these on every decision;
  // they had no constant and no subscriber, so a seller was never told that
  // their listing had gone live or been rejected.
  GROCERY_PRODUCT_APPROVED:       'grocery.product.approved',
  GROCERY_PRODUCT_REJECTED:       'grocery.product.rejected',

  // ── Doctor ─────────────────────────────────────────────────────────────────
  DOCTOR_APPOINTMENT_BOOKED:    'doctor.appointment.booked',
  DOCTOR_APPOINTMENT_UPDATED:   'doctor.appointment.updated',
  DOCTOR_APPOINTMENT_CANCELLED: 'doctor.appointment.cancelled',
  DOCTOR_APPOINTMENT_COMPLETED: 'doctor.appointment.completed',
  DOCTOR_REGISTERED:            'doctor.registered',
  DOCTOR_STATUS_CHANGED:        'doctor.status_changed',
  DOCTOR_TOKEN_ADVANCED:        'doctor.token.advanced',
  DOCTOR_QUEUE_UPDATED:         'doctor.queue.updated',
  DOCTOR_APPOINTMENT_REMINDER:  'doctor.appointment.reminder',

  // ── Taxi Ride Lifecycle ─────────────────────────────────────────────────────
  TAXI_RIDE_REQUESTED:         'taxi.ride.requested',
  TAXI_RIDE_STATUS_UPDATED:    'taxi.ride.status_updated',
  TAXI_RIDE_COMPLETED:         'taxi.ride.completed',
  TAXI_RIDE_CANCELLED:         'taxi.ride.cancelled',
  TAXI_RIDE_NO_DRIVER:         'taxi.ride.no_driver',

  // ── Taxi Dispatch Pipeline ────────────────────────────────────────────────
  TAXI_RIDE_REQUEST_SENT:      'taxi.ride.request_sent',
  TAXI_RIDE_DRIVER_ACCEPTED:   'taxi.ride.driver_accepted',
  TAXI_RIDE_DRIVER_REJECTED:   'taxi.ride.driver_rejected',
  TAXI_RIDE_DRIVER_TIMEOUT:    'taxi.ride.driver_timeout',

  // ── Taxi Driver State ─────────────────────────────────────────────────────
  TAXI_DRIVER_STATUS_CHANGED:  'taxi.driver.status_changed',
  TAXI_DRIVER_LOCATION_UPDATED:'taxi.driver.location_updated',

  // ── Taxi Surge & Analytics ────────────────────────────────────────────────
  TAXI_SURGE_ACTIVATED:        'taxi.surge.activated',
  TAXI_SURGE_DEACTIVATED:      'taxi.surge.deactivated',

  // ── Delivery ───────────────────────────────────────────────────────────────
  DELIVERY_PARTNER_ASSIGNED: 'delivery.partner.assigned',
  DELIVERY_STATUS_UPDATED:   'delivery.status.updated',
  DELIVERY_REQUEST_CREATED:  'delivery.request.created',
  DELIVERY_PARTNER_LOCATION: 'delivery.partner.location',
  DELIVERY_PARTNER_ONLINE:   'delivery.partner.online',
  DELIVERY_PARTNER_OFFLINE:  'delivery.partner.offline',
  DELIVERY_FEE_CALCULATED:   'delivery.fee.calculated',

  // ── Flash Deals ─────────────────────────────────────────────────────────────
  FLASH_DEAL_CREATED:              'flash_deal.created',
  FLASH_DEAL_UPDATED:              'flash_deal.updated',
  FLASH_DEAL_STARTED:              'flash_deal.started',
  FLASH_DEAL_ENDED:                'flash_deal.ended',
  FLASH_DEAL_NOMINATION_SUBMITTED: 'flash_deal.nomination.submitted',
  FLASH_DEAL_NOMINATION_APPROVED:  'flash_deal.nomination.approved',
  FLASH_DEAL_NOMINATION_REJECTED:  'flash_deal.nomination.rejected',

  // ── Seller & Marketplace ───────────────────────────────────────────────────
  SELLER_REGISTERED:        'seller.registered',
  SELLER_APPROVED:          'seller.approved',
  SELLER_REJECTED:          'seller.rejected',
  SELLER_SUSPENDED:         'seller.suspended',
  SELLER_BLOCKED:           'seller.blocked',
  SELLER_REACTIVATED:       'seller.reactivated',
  SELLER_PRODUCT_CREATED:   'seller.product.created',

  /**
   * Marketplace catalogue moderation.
   *
   * marketplace-service has published these since it was written; they were
   * simply never declared here, so `create-kafka-topics.js` never created them
   * and the broker runs with auto-creation disabled. search-service consumes
   * all four to keep the index in step with what an admin has approved — an
   * undeclared topic meant its consumer could not even start.
   */
  PRODUCT_APPROVED:         'product.approved',
  PRODUCT_REJECTED:         'product.rejected',
  PRODUCT_UPDATED:          'product.updated',
  PRODUCT_SUSPENDED:        'product.suspended',
  INVENTORY_UPDATED:        'inventory.updated',
  MARKETPLACE_HOME_UPDATED: 'marketplace.home.updated',
  /**
   * A customer order has been split onto the seller who must fulfil it.
   * Distinct from `order.created`, which is the customer's whole basket and
   * carries no seller — this one is per seller and is what drives the seller
   * portal's live new-order toast and pending badge.
   */
  MARKETPLACE_ORDER_PLACED: 'marketplace.order.placed',

  // ── Franchise ──────────────────────────────────────────────────────────────
  FRANCHISE_REGISTERED:              'franchise.registered',
  FRANCHISE_COMPLIANCE_SUBMITTED:    'franchise.compliance.submitted',

  // ── Refund ─────────────────────────────────────────────────────────────────
  REFUND_REQUESTED: 'refund.requested',
  REFUND_APPROVED:  'refund.approved',
  REFUND_REJECTED:  'refund.rejected',

  // ── Commission & Payout ────────────────────────────────────────────────────
  COMMISSION_CALCULATED: 'commission.calculated',
  PAYOUT_REQUESTED:      'payout.requested',
  PAYOUT_PROCESSED:      'payout.processed',

  // ── Admin / Platform ───────────────────────────────────────────────────────
  ADMIN_USER_BANNED:  'admin.user.banned',
  ADMIN_KYC_APPROVED: 'admin.kyc.approved',
  ADMIN_KYC_SUBMITTED: 'admin.kyc.submitted',

  // ── Audit ──────────────────────────────────────────────────────────────────
  AUDIT_LOG: 'audit.log',

  // ── Search ─────────────────────────────────────────────────────────────────
  SEARCH_PERFORMED: 'search.performed',

  // ── GDPR & Privacy ────────────────────────────────────────────────────────
  GDPR_CONSENT_GRANTED:         'gdpr.consent.granted',
  GDPR_CONSENT_REVOKED:         'gdpr.consent.revoked',
  GDPR_DATA_EXPORT_REQUESTED:   'gdpr.data.export.requested',
  GDPR_DATA_EXPORT_COMPLETED:   'gdpr.data.export.completed',
  GDPR_DATA_ERASURE_REQUESTED:  'gdpr.data.erasure.requested',
  GDPR_DATA_ERASURE_COMPLETED:  'gdpr.data.erasure.completed',

  // ── Partner Lifecycle ─────────────────────────────────────────────────────
  PARTNER_REGISTERED:     'partner.registered',
  PARTNER_STATUS_CHANGED: 'partner.status.changed',
  PARTNER_LOCATION_UPDATED: 'partner.location.updated',

  // ── Safety & Emergency ────────────────────────────────────────────────────
  EMERGENCY_SOS_TRIGGERED:  'emergency.sos_triggered',
  TAXI_SOS_TRIGGERED:       'taxi.sos.triggered',

  // ── Franchise ─────────────────────────────────────────────────────────────
  FRANCHISE_SELLER_STATUS_UPDATED: 'franchise.marketplace.seller_status_updated',

  // ── Tier 6: Return Requests ────────────────────────────────────────────────
  RETURN_CREATED:          'marketplace.return.created',
  RETURN_STATUS_UPDATED:   'marketplace.return.status_updated',
  RETURN_PICKUP_ASSIGNED:  'marketplace.return.pickup_assigned',

  // ── Tier 6: Coupons ────────────────────────────────────────────────────────
  COUPON_REDEEMED:         'marketplace.coupon.redeemed',
  COUPON_EXPIRED:          'marketplace.coupon.expired',

  // ── Tier 6: Shipment Tracking ──────────────────────────────────────────────
  SHIPMENT_TRACKING_UPDATED: 'marketplace.shipment.tracking_updated',

  // ── Tier 6: Product Variants ───────────────────────────────────────────────
  VARIANT_LOW_STOCK:       'marketplace.variant.low_stock',

  // ── Tier 6: Product Q&A ────────────────────────────────────────────────────
  QA_QUESTION_POSTED:      'marketplace.qa.question_posted',
  QA_ANSWER_POSTED:        'marketplace.qa.answer_posted',

  // ── Tier 6: Delivery Assignment ────────────────────────────────────────────
  DELIVERY_ASSIGNMENT_CREATED: 'marketplace.delivery.assigned',

  // ── Pharmacy ────────────────────────────────────────────────────────────────
  PHARMACY_ORDER_CREATED:           'pharmacy.order.created',
  PHARMACY_ORDER_STATUS_UPDATED:    'pharmacy.order.status_updated',
  PHARMACY_ORDER_COMPLETED:         'pharmacy.order.completed',
  PHARMACY_PRESCRIPTION_UPLOADED:   'pharmacy.prescription.uploaded',
  PHARMACY_PRESCRIPTION_VERIFIED:   'pharmacy.prescription.verified',
  PHARMACY_STORE_APPROVED:          'pharmacy.store.approved',
  PHARMACY_STORE_SUSPENDED:         'pharmacy.store.suspended',
  PHARMACY_LOW_STOCK:               'pharmacy.low_stock',
  PHARMACY_DELIVERY_REQUESTED:      'pharmacy.delivery.requested',
  PHARMACY_DELIVERY_COMPLETED:      'pharmacy.delivery.completed',

  // ── Doctor Appointments (additional) ────────────────────────────────────────
  DOCTOR_APPOINTMENT_RESCHEDULED:    'doctor.appointment.rescheduled',

  // ── Doctor Prescriptions ────────────────────────────────────────────────────
  DOCTOR_PRESCRIPTION_ISSUED:        'doctor.prescription.issued',
  DOCTOR_PRESCRIPTION_DISPENSED:     'doctor.prescription.dispensed',
  DOCTOR_PRESCRIPTION_TO_PHARMACY:   'doctor.prescription.to_pharmacy',
  PHARMACY_ORDER_FROM_PRESCRIPTION:  'pharmacy.order.from_prescription',

  // ── Centralized Payment (v2) ───────────────────────────────────────────────
  PAYMENT_V2_INITIATED:              'payment.v2.initiated',
  PAYMENT_V2_PROCESSING:             'payment.v2.processing',
  PAYMENT_V2_COMPLETED:              'payment.v2.completed',
  PAYMENT_V2_FAILED:                 'payment.v2.failed',
  PAYMENT_V2_REFUND_REQUESTED:       'payment.v2.refund.requested',
  PAYMENT_V2_REFUND_COMPLETED:       'payment.v2.refund.completed',
  PAYMENT_V2_PREAUTH_CREATED:        'payment.v2.preauth.created',
  PAYMENT_V2_PREAUTH_CAPTURED:       'payment.v2.preauth.captured',
  PAYMENT_V2_PREAUTH_RELEASED:       'payment.v2.preauth.released',

  // ── Invoice ────────────────────────────────────────────────────────────────
  INVOICE_GENERATED:                 'invoice.generated',
  INVOICE_SENT:                      'invoice.sent',
  INVOICE_DOWNLOAD_REQUESTED:        'invoice.download.requested',

  // ── Settlement ─────────────────────────────────────────────────────────────
  SETTLEMENT_CREATED:                'settlement.created',
  SETTLEMENT_SETTLED:                'settlement.settled',
  SETTLEMENT_FAILED:                 'settlement.failed',

  // ── Taxi Real-Time Billing ─────────────────────────────────────────────────
  TAXI_BILLING_PREAUTH:              'taxi.billing.preauth',
  TAXI_BILLING_METER_UPDATED:        'taxi.billing.meter_updated',
  TAXI_BILLING_CAPTURED:             'taxi.billing.captured',
  TAXI_BILLING_CANCELLED:            'taxi.billing.cancelled',
  TAXI_BILLING_PREAUTH_FAILED:       'taxi.billing.preauth.failed',
  TAXI_BILLING_CAPTURE_FAILED:       'taxi.billing.capture.failed',

  // ── Hotel Bookings ─────────────────────────────────────────────────────────
  HOTEL_BOOKING_CONFIRMED:           'hotel.booking.confirmed',
  HOTEL_BOOKING_CANCELLED:           'hotel.booking.cancelled',
  HOTEL_GUEST_CHECKED_IN:            'hotel.guest.checked_in',
  HOTEL_GUEST_CHECKED_OUT:           'hotel.guest.checked_out',
  HOTEL_ROOM_AVAILABILITY_CHANGED:   'hotel.room.availability_changed',
  HOTEL_PRICE_CHANGED:               'hotel.price.changed',

  // ── Recommendation Engine ─────────────────────────────────────────────────
  USER_ACTIVITY_TRACKED:             'user.activity.tracked',
  RECOMMENDATION_GENERATED:          'recommendation.generated',
  RECOMMENDATION_CLICKED:            'recommendation.clicked',
  RECOMMENDATION_TRENDING_COMPUTED:  'recommendation.trending.computed',
} as const;

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];
