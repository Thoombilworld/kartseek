/**
 * KARTSEEK Restaurant Module — Takeaway API Types & Contracts
 * 
 * Covers:
 * - Customer APIs
 * - Seller APIs
 * - Admin APIs
 * - Database entity shapes
 * - WebSocket event payloads
 * - Notification payloads
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type TakeawayStatus =
  | 'takeaway_created'
  | 'restaurant_pending'
  | 'restaurant_accepted'
  | 'restaurant_rejected'
  | 'preparing'
  | 'ready_for_pickup'
  | 'customer_arrived'
  | 'collected'
  | 'completed'
  | 'cancelled'
  | 'refund_requested'
  | 'refund_processed';

export type OrderType = 'delivery' | 'takeaway' | 'dine_in' | 'table_booking';
export type PaymentMethod = 'online' | 'cash_at_restaurant' | 'wallet' | 'loyalty_points';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE ENTITY SHAPES (mirrors NestJS TypeORM entities)
// ─────────────────────────────────────────────────────────────────────────────

/** Restaurant entity — takeaway-specific fields */
export interface RestaurantTakeawayConfig {
  id: string;
  takeawayEnabled: boolean;
  takeawayPaused: boolean;
  takeawayPauseReason?: string;
  takeawayPausedAt?: Date;
  takeawayOpeningTime: string;   // HH:mm (24h)
  takeawayClosingTime: string;   // HH:mm (24h)
  takeawayPreparationTime: number; // minutes
  takeawayPickupInstructions?: string;
  takeawayCashPaymentEnabled: boolean;
  maxTakeawayOrdersPerSlot: number;
  takeawaySlotDurationMinutes: number;
  updatedAt: Date;
}

/** Takeaway time slot */
export interface TakeawaySlot {
  id: string;
  restaurantId: string;
  date: string;           // ISO date YYYY-MM-DD
  startTime: string;      // HH:mm
  endTime: string;        // HH:mm
  maxOrders: number;
  currentOrders: number;
  isAvailable: boolean;
  createdAt: Date;
}

/** Restaurant order entity — takeaway fields */
export interface RestaurantOrder {
  id: string;
  orderType: OrderType;
  restaurantId: string;
  customerId: string;
  // Takeaway-specific
  pickupTime: string;       // ISO datetime or 'ASAP'
  pickupSlotId?: string;
  pickupAddress: string;    // Restaurant address (read-only copy)
  customerMobile: string;
  takeawayStatus: TakeawayStatus;
  preparationTime?: number; // minutes (set by seller)
  readyAt?: Date;
  collectedAt?: Date;
  completedAt?: Date;
  // Financials
  subtotal: number;
  packingCharge: number;
  tax: number;
  discount: number;
  walletAmountUsed: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  couponCode?: string;
  couponDiscount: number;
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/** Restaurant menu item — service mode availability */
export interface RestaurantMenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  isVeg: boolean;
  availableForDelivery: boolean;
  availableForTakeaway: boolean;
  availableForDineIn: boolean;
  availableForTableBooking: boolean;
  takeawayPackingCharge: number;
  isActive: boolean;
  isOutOfStock: boolean;
}

/** Takeaway cart item */
export interface TakeawayCartItem {
  menuItemId: string;
  name: string;
  qty: number;
  basePrice: number;
  packingCharge: number;
  selectedVariant?: string;
  addOns: Array<{ name: string; price: number }>;
  specialInstructions?: string;
  totalPrice: number;  // (basePrice + addOnTotal) * qty + packingCharge
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER API REQUEST / RESPONSE SHAPES
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/restaurants/:id/takeaway-settings */
export interface GetTakeawaySettingsResponse {
  enabled: boolean;
  paused: boolean;
  pauseReason?: string;
  openingTime: string;
  closingTime: string;
  preparationTime: number;
  pickupInstructions?: string;
  cashPaymentEnabled: boolean;
  currentlyOpen: boolean;    // computed from time + enabled + paused
  nextOpenAt?: string;       // ISO datetime if currently closed
}

/** GET /api/restaurants/:id/takeaway-slots?date=YYYY-MM-DD */
export interface GetTakeawaySlotsResponse {
  date: string;
  slots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    available: boolean;
    spotsLeft: number;
    label: string;            // "10:30 AM"
  }>;
  asapAvailable: boolean;
  asapEstimatedMinutes: number;
}

/** POST /api/restaurant-cart/add */
export interface AddToCartRequest {
  restaurantId: string;
  orderType: 'takeaway';
  menuItemId: string;
  qty: number;
  selectedVariant?: string;
  addOns?: Array<{ name: string; price: number }>;
  specialInstructions?: string;
}

/** GET /api/restaurant-cart */
export interface GetCartResponse {
  restaurantId: string;
  restaurantName: string;
  orderType: OrderType;
  items: TakeawayCartItem[];
  subtotal: number;
  packingCharge: number;
  tax: number;
  discount: number;
  total: number;
  appliedCoupon?: string;
  warnings: CartWarning[];
}

export type CartWarningType =
  | 'restaurant_closed'
  | 'takeaway_unavailable'
  | 'item_unavailable_for_takeaway'
  | 'item_out_of_stock'
  | 'price_changed'
  | 'pickup_time_unavailable';

export interface CartWarning {
  type: CartWarningType;
  message: string;
  itemId?: string;
}

/** POST /api/restaurant-checkout/calculate */
export interface CalculateCheckoutRequest {
  restaurantId: string;
  orderType: 'takeaway';
  items: Array<{ menuItemId: string; qty: number; addOns?: Array<{ name: string; price: number }> }>;
  couponCode?: string;
  walletAmountToUse?: number;
  loyaltyPointsToRedeem?: number;
}

export interface CalculateCheckoutResponse {
  subtotal: number;
  packingCharge: number;
  tax: number;
  couponDiscount: number;
  walletDiscount: number;
  loyaltyDiscount: number;
  total: number;
  breakdown: string[]; // human-readable line items
  valid: boolean;
  validationErrors: string[];
}

/** POST /api/restaurant-orders — Place takeaway order */
export interface PlaceTakeawayOrderRequest {
  restaurantId: string;
  orderType: 'takeaway';
  items: Array<{
    menuItemId: string; qty: number;
    selectedVariant?: string;
    addOns?: Array<{ name: string; price: number }>;
    specialInstructions?: string;
  }>;
  pickupTime: 'ASAP' | string;   // ISO datetime or 'ASAP'
  pickupSlotId?: string;
  customerMobile: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  walletAmountToUse?: number;
  loyaltyPointsToRedeem?: number;
  paymentTransactionId?: string; // required if paymentMethod === 'online'
}

export interface PlaceTakeawayOrderResponse {
  success: boolean;
  orderId: string;
  orderStatus: TakeawayStatus;
  estimatedPickupTime: string;
  paymentStatus: PaymentStatus;
  total: number;
  message: string;
}

/** POST /api/restaurant-orders/:id/cancel */
export interface CancelTakeawayOrderRequest {
  reason: string;
}

export interface CancelTakeawayOrderResponse {
  success: boolean;
  refundInitiated: boolean;
  refundAmount: number;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER API REQUEST / RESPONSE SHAPES
// ─────────────────────────────────────────────────────────────────────────────

/** PATCH /api/seller/restaurant/service-settings/takeaway */
export interface UpdateTakeawaySettingsRequest {
  takeawayEnabled?: boolean;
  takeawayPaused?: boolean;
  takeawayPauseReason?: string;
  takeawayOpeningTime?: string;
  takeawayClosingTime?: string;
  takeawayPreparationTime?: number;
  takeawayPickupInstructions?: string;
  takeawayCashPaymentEnabled?: boolean;
  maxTakeawayOrdersPerSlot?: number;
  takeawaySlotDurationMinutes?: number;
}

/** PATCH /api/seller/restaurant/orders/:id/accept */
export interface AcceptTakeawayOrderRequest {
  preparationTime?: number;   // override default prep time
  pickupNote?: string;
}

/** PATCH /api/seller/restaurant/orders/:id/reject */
export interface RejectTakeawayOrderRequest {
  reason: string;
}

/** All seller order status update endpoints share this response */
export interface OrderStatusUpdateResponse {
  success: boolean;
  orderId: string;
  newStatus: TakeawayStatus;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN API REQUEST / RESPONSE SHAPES
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/restaurant/orders?orderType=takeaway */
export interface AdminTakeawayOrdersQuery {
  orderType: 'takeaway';
  status?: TakeawayStatus;
  restaurantId?: string;
  city?: string;
  dateFrom?: string;  // ISO date
  dateTo?: string;
  paymentStatus?: PaymentStatus;
  page?: number;
  limit?: number;
}

export interface AdminTakeawayOrdersResponse {
  orders: Array<RestaurantOrder & { restaurantName: string; customerName: string }>;
  total: number;
  page: number;
  limit: number;
}

/** PATCH /api/admin/restaurant/:id/takeaway-settings */
export interface AdminUpdateRestaurantTakeawayRequest {
  takeawayEnabled?: boolean;
  takeawayPaused?: boolean;
  takeawayPauseReason?: string;
  adminNote?: string;
}

/** GET /api/admin/restaurant/takeaway-reports */
export interface TakeawayReportQuery {
  restaurantId?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TakeawayReportResponse {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalRevenue: number;
  totalRefunds: number;
  avgOrderValue: number;
  avgPreparationTime: number;   // minutes
  peakPickupHour: string;        // e.g. "13:00"
  topRestaurants: Array<{ restaurantId: string; name: string; orders: number; revenue: number }>;
  topItems: Array<{ name: string; count: number; revenue: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export type WebSocketEvent =
  | 'restaurant.takeaway.created'
  | 'restaurant.takeaway.accepted'
  | 'restaurant.takeaway.rejected'
  | 'restaurant.takeaway.preparing'
  | 'restaurant.takeaway.ready_for_pickup'
  | 'restaurant.takeaway.customer_arrived'
  | 'restaurant.takeaway.collected'
  | 'restaurant.takeaway.completed'
  | 'restaurant.takeaway.cancelled';

export interface WebSocketPayload {
  event: WebSocketEvent;
  orderId: string;
  restaurantId: string;
  customerId: string;
  status: TakeawayStatus;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PAYLOADS
// ─────────────────────────────────────────────────────────────────────────────

export interface TakeawayNotification {
  recipientId: string;
  recipientType: 'customer' | 'seller' | 'admin';
  orderId: string;
  event: WebSocketEvent;
  title: string;
  body: string;
  channel: ('push' | 'sms' | 'email')[];
  data?: Record<string, string>;
}

/** Map of status → customer notification text */
export const CUSTOMER_NOTIFICATIONS: Record<TakeawayStatus, { title: string; body: string }> = {
  takeaway_created: { title: 'Order Placed! 🎉', body: 'Your takeaway order has been sent to the restaurant.' },
  restaurant_pending: { title: 'Waiting for Confirmation', body: 'Restaurant is reviewing your order...' },
  restaurant_accepted: { title: 'Order Accepted ✅', body: 'Your order has been accepted! Preparation has started.' },
  restaurant_rejected: { title: 'Order Rejected ❌', body: 'Unfortunately the restaurant could not accept your order. Refund initiated.' },
  preparing: { title: 'Chef is Cooking! 🍳', body: 'Your food is being freshly prepared.' },
  ready_for_pickup: { title: 'Ready for Pickup! 🛍️', body: 'Your order is ready! Please head to the restaurant counter.' },
  customer_arrived: { title: 'Welcome! 👋', body: 'Showing your order to the restaurant now.' },
  collected: { title: 'Order Collected 🎊', body: 'Enjoy your meal! Don\'t forget to rate your experience.' },
  completed: { title: 'Thank You! ⭐', body: 'Order completed. Rate your experience and earn loyalty points.' },
  cancelled: { title: 'Order Cancelled', body: 'Your takeaway order has been cancelled.' },
  refund_requested: { title: 'Refund Initiated', body: 'Your refund request has been submitted and is being processed.' },
  refund_processed: { title: 'Refund Processed ✅', body: 'Your refund of ₹{amount} has been credited to your original payment method.' },
};

/** Map of status → seller notification text */
export const SELLER_NOTIFICATIONS: Record<string, { title: string; body: string }> = {
  takeaway_created: { title: '🛍️ New Takeaway Order!', body: 'Order #{orderId} received. Please accept or reject within 3 minutes.' },
  ready_for_pickup: { title: 'Pickup Reminder', body: 'Customer for order #{orderId} should arrive soon.' },
  customer_arrived: { title: 'Customer Arrived! 👋', body: 'Customer is at the counter for order #{orderId}.' },
  cancelled: { title: 'Order Cancelled', body: 'Order #{orderId} has been cancelled by the customer.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION RULES (Backend — pre-order creation)
// ─────────────────────────────────────────────────────────────────────────────

export interface TakeawayValidationResult {
  valid: boolean;
  errors: TakeawayValidationError[];
}

export type TakeawayValidationErrorCode =
  | 'RESTAURANT_NOT_FOUND'
  | 'RESTAURANT_INACTIVE'
  | 'TAKEAWAY_NOT_ENABLED'
  | 'TAKEAWAY_PAUSED'
  | 'RESTAURANT_CLOSED'
  | 'SLOT_UNAVAILABLE'
  | 'SLOT_FULL'
  | 'ITEM_UNAVAILABLE_FOR_TAKEAWAY'
  | 'ITEM_OUT_OF_STOCK'
  | 'PRICE_MISMATCH'
  | 'CART_EMPTY'
  | 'INVALID_CUSTOMER_MOBILE'
  | 'PAYMENT_METHOD_NOT_ALLOWED'
  | 'COUPON_INVALID'
  | 'WALLET_INSUFFICIENT'
  | 'PAYMENT_VERIFICATION_FAILED';

export interface TakeawayValidationError {
  code: TakeawayValidationErrorCode;
  message: string;
  field?: string;
  itemId?: string;
}
