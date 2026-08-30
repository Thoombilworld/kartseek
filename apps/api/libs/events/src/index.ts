// Events — Kafka topic constants shared across all services
export const KAFKA_TOPICS = {
  // Auth
  USER_REGISTERED:    'user.registered',
  USER_LOGIN:         'user.login',
  // Orders
  ORDER_CREATED:      'order.created',
  ORDER_CONFIRMED:    'order.confirmed',
  ORDER_CANCELLED:    'order.cancelled',
  ORDER_DELIVERED:    'order.delivered',
  // Payments
  PAYMENT_INITIATED:  'payment.initiated',
  PAYMENT_SUCCESS:    'payment.success',
  PAYMENT_FAILED:     'payment.failed',
  // Delivery
  DELIVERY_ASSIGNED:  'delivery.assigned',
  DELIVERY_PICKED_UP: 'delivery.picked_up',
  DELIVERY_COMPLETED: 'delivery.completed',
  // Wallet / Payout
  WALLET_CREDITED:    'wallet.credited',
  PAYOUT_REQUESTED:   'payout.requested',
  PAYOUT_SETTLED:     'payout.settled',
  // Marketplace
  SELLER_APPROVED:    'seller.approved',
  PRODUCT_APPROVED:   'product.approved',
  BRAND_APPROVED:     'brand.approved',
  // Notifications
  NOTIFICATION_SEND:  'notification.send',
  EMAIL_SEND:         'email.send',
  SMS_SEND:           'sms.send',
  // Audit
  AUDIT_LOG:          'audit.log',
} as const;

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];
export * from './events.module';
