/**
 * KARTSEEK — Domain Event Contracts
 *
 * Each module publishes events to its own Kafka topic namespace.
 * Gateway controllers and other services subscribe to these events
 * via KafkaConsumerService.
 *
 * Pattern: `{module}.{entity}.{action}`
 */

// ── Marketplace ─────────────────────────────────────────────────────────────
export const MARKETPLACE_EVENTS = {
  PRODUCT_CREATED:      'marketplace.product.created',
  PRODUCT_UPDATED:      'marketplace.product.updated',
  PRODUCT_DELETED:      'marketplace.product.deleted',
  PRODUCT_APPROVED:     'marketplace.product.approved',
  ORDER_PLACED:         'marketplace.order.placed',
  ORDER_SHIPPED:        'marketplace.order.shipped',
  ORDER_DELIVERED:      'marketplace.order.delivered',
  ORDER_CANCELLED:      'marketplace.order.cancelled',
  RETURN_REQUESTED:     'marketplace.return.requested',
  RETURN_APPROVED:      'marketplace.return.approved',
  SELLER_REGISTERED:    'marketplace.seller.registered',
  SELLER_APPROVED:      'marketplace.seller.approved',
  SELLER_SUSPENDED:     'marketplace.seller.suspended',
  REVIEW_CREATED:       'marketplace.review.created',
  STOCK_LOW:            'marketplace.stock.low',
  COUPON_REDEEMED:      'marketplace.coupon.redeemed',
} as const;

// ── Grocery ─────────────────────────────────────────────────────────────────
export const GROCERY_EVENTS = {
  ORDER_PLACED:         'grocery.order.placed',
  ORDER_CONFIRMED:      'grocery.order.confirmed',
  ORDER_PICKED:         'grocery.order.picked',
  ORDER_DELIVERED:      'grocery.order.delivered',
  ORDER_CANCELLED:      'grocery.order.cancelled',
  STOCK_LOW:            'grocery.stock.low',
  STORE_REGISTERED:     'grocery.store.registered',
  FLASH_DEAL_STARTED:   'grocery.flash_deal.started',
  FLASH_DEAL_ENDED:     'grocery.flash_deal.ended',
} as const;

// ── Restaurant ──────────────────────────────────────────────────────────────
export const RESTAURANT_EVENTS = {
  ORDER_PLACED:         'restaurant.order.placed',
  ORDER_CONFIRMED:      'restaurant.order.confirmed',
  ORDER_PREPARING:      'restaurant.order.preparing',
  ORDER_READY:          'restaurant.order.ready',
  ORDER_DELIVERED:      'restaurant.order.delivered',
  ORDER_CANCELLED:      'restaurant.order.cancelled',
  RESERVATION_CREATED:  'restaurant.reservation.created',
  RESERVATION_CONFIRMED: 'restaurant.reservation.confirmed',
  RESERVATION_CANCELLED: 'restaurant.reservation.cancelled',
  MENU_UPDATED:         'restaurant.menu.updated',
  RESTAURANT_REGISTERED: 'restaurant.registered',
} as const;

// ── Pharmacy ────────────────────────────────────────────────────────────────
export const PHARMACY_EVENTS = {
  ORDER_PLACED:         'pharmacy.order.placed',
  ORDER_VERIFIED:       'pharmacy.order.verified',
  ORDER_DISPENSED:       'pharmacy.order.dispensed',
  ORDER_DELIVERED:      'pharmacy.order.delivered',
  ORDER_CANCELLED:      'pharmacy.order.cancelled',
  PRESCRIPTION_UPLOADED: 'pharmacy.prescription.uploaded',
  PRESCRIPTION_VERIFIED: 'pharmacy.prescription.verified',
  PRESCRIPTION_REJECTED: 'pharmacy.prescription.rejected',
  STOCK_LOW:            'pharmacy.stock.low',
} as const;

// ── Taxi ────────────────────────────────────────────────────────────────────
export const TAXI_EVENTS = {
  RIDE_REQUESTED:       'taxi.ride.requested',
  RIDE_ACCEPTED:        'taxi.ride.accepted',
  RIDE_STARTED:         'taxi.ride.started',
  RIDE_COMPLETED:       'taxi.ride.completed',
  RIDE_CANCELLED:       'taxi.ride.cancelled',
  DRIVER_ONLINE:        'taxi.driver.online',
  DRIVER_OFFLINE:       'taxi.driver.offline',
  DRIVER_LOCATION:      'taxi.driver.location_updated',
  SOS_TRIGGERED:        'taxi.sos.triggered',
  DISPUTE_RAISED:       'taxi.dispute.raised',
  SURGE_ACTIVATED:      'taxi.surge.activated',
} as const;

// ── Hotel ───────────────────────────────────────────────────────────────────
export const HOTEL_EVENTS = {
  BOOKING_CREATED:      'hotel.booking.created',
  BOOKING_CONFIRMED:    'hotel.booking.confirmed',
  BOOKING_CANCELLED:    'hotel.booking.cancelled',
  BOOKING_CHECKED_IN:   'hotel.booking.checked_in',
  BOOKING_CHECKED_OUT:  'hotel.booking.checked_out',
  ROOM_UPDATED:         'hotel.room.updated',
  REVIEW_SUBMITTED:     'hotel.review.submitted',
  PAYOUT_PROCESSED:     'hotel.payout.processed',
} as const;

// ── Doctor ──────────────────────────────────────────────────────────────────
export const DOCTOR_EVENTS = {
  APPOINTMENT_BOOKED:   'doctor.appointment.booked',
  APPOINTMENT_CONFIRMED: 'doctor.appointment.confirmed',
  APPOINTMENT_CANCELLED: 'doctor.appointment.cancelled',
  APPOINTMENT_COMPLETED: 'doctor.appointment.completed',
  TOKEN_CALLED:         'doctor.token.called',
  PRESCRIPTION_ISSUED:  'doctor.prescription.issued',
  REVIEW_SUBMITTED:     'doctor.review.submitted',
} as const;

// ── Wallet ──────────────────────────────────────────────────────────────────
export const WALLET_EVENTS = {
  TOPPED_UP:            'wallet.topped_up',
  DEBITED:              'wallet.debited',
  REFUNDED:             'wallet.refunded',
  TRANSFER_SENT:        'wallet.transfer.sent',
  TRANSFER_RECEIVED:    'wallet.transfer.received',
} as const;

// ── Loyalty ─────────────────────────────────────────────────────────────────
export const LOYALTY_EVENTS = {
  POINTS_AWARDED:       'loyalty.points.awarded',
  POINTS_REDEEMED:      'loyalty.points.redeemed',
  POINTS_REVERSED:      'loyalty.points.reversed',
  TIER_UPGRADED:        'loyalty.tier.upgraded',
  TIER_DOWNGRADED:      'loyalty.tier.downgraded',
} as const;

// ── Franchise ───────────────────────────────────────────────────────────────
export const FRANCHISE_EVENTS = {
  SELLER_REGISTERED:    'franchise.seller.registered',
  SELLER_APPROVED:      'franchise.seller.approved',
  SELLER_SUSPENDED:     'franchise.seller.suspended',
  CONFIG_UPDATED:       'franchise.config.updated',
  COMMISSION_CHANGED:   'franchise.commission.changed',
  PAYOUT_PROCESSED:     'franchise.payout.processed',
} as const;

// ── Recommendation Engine ──────────────────────────────────────────────────
export const RECOMMENDATION_EVENTS = {
  ACTIVITY_TRACKED:       'user.activity.tracked',
  RECOMMENDATION_GENERATED: 'recommendation.generated',
  RECOMMENDATION_CLICKED: 'recommendation.clicked',
  PROFILE_UPDATED:        'recommendation.profile.updated',
  TRENDING_COMPUTED:      'recommendation.trending.computed',
} as const;
