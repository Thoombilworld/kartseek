/**
 * KARTSEEK Restaurant Module — Dine-in Type Definitions
 * Full production-grade types for dine-in order lifecycle management.
 *
 * Consolidated from: src/types/restaurant-dine-in.types.ts → src/lib/types/
 */

// ── Dine-in Order Status ─────────────────────────────────────────────────────

export type DineInStatus =
  | 'dine_in_created'
  | 'restaurant_pending'
  | 'restaurant_accepted'
  | 'restaurant_rejected'
  | 'table_assigned'
  | 'preparing'
  | 'ready_to_serve'
  | 'served'
  | 'completed'
  | 'cancelled'
  | 'refund_requested'
  | 'refund_processed';

export const DINE_IN_STATUS_LABELS: Record<DineInStatus, { customer: string; seller: string; admin: string }> = {
  dine_in_created:      { customer: 'Order Placed',                          seller: 'New Dine-in Order',               admin: 'Dine-in Order Placed' },
  restaurant_pending:   { customer: 'Waiting for restaurant confirmation',   seller: 'Accept / Reject',                 admin: 'Pending Restaurant Action' },
  restaurant_accepted:  { customer: 'Restaurant accepted your dine-in order',seller: 'Order Accepted',                  admin: 'Accepted by Restaurant' },
  restaurant_rejected:  { customer: 'Restaurant rejected your order',        seller: 'Order Rejected',                  admin: 'Rejected by Restaurant' },
  table_assigned:       { customer: 'Your table has been assigned',          seller: 'Table Assigned',                  admin: 'Table Assigned' },
  preparing:            { customer: 'Food is being prepared',                seller: 'Preparing',                       admin: 'Preparing' },
  ready_to_serve:       { customer: 'Ready to serve 🍽️',                   seller: 'Ready to Serve',                  admin: 'Ready to Serve' },
  served:               { customer: 'Food served — enjoy your meal!',       seller: 'Served',                          admin: 'Served' },
  completed:            { customer: 'Order completed — thank you!',         seller: 'Completed',                       admin: 'Completed' },
  cancelled:            { customer: 'Order cancelled',                       seller: 'Cancelled',                       admin: 'Cancelled' },
  refund_requested:     { customer: 'Refund requested',                      seller: 'Refund Request Pending',          admin: 'Refund Requested' },
  refund_processed:     { customer: 'Refund processed',                      seller: 'Refund Processed',                admin: 'Refund Processed' },
};

// ── WebSocket Events ─────────────────────────────────────────────────────────

export type DineInWebSocketEvent =
  | 'restaurant.dine_in.created'
  | 'restaurant.dine_in.accepted'
  | 'restaurant.dine_in.rejected'
  | 'restaurant.dine_in.table_assigned'
  | 'restaurant.dine_in.preparing'
  | 'restaurant.dine_in.ready_to_serve'
  | 'restaurant.dine_in.served'
  | 'restaurant.dine_in.completed'
  | 'restaurant.dine_in.cancelled';

// ── Table & Area Entities ────────────────────────────────────────────────────

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'inactive';
export type TableAssignMode = 'customer_selects' | 'auto_assign';

export interface RestaurantTableArea {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  isIndoor: boolean;
  isAC?: boolean;
  smokingAllowed?: boolean;
  isFamilySection?: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  areaId: string;
  area?: RestaurantTableArea;
  tableNumber: string;
  capacity: number;
  minGuests?: number;
  maxGuests?: number;
  isActive: boolean;
  isAvailable: boolean;
  status: TableStatus;
  currentOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Dine-in Settings ─────────────────────────────────────────────────────────

export interface RestaurantDineInSettings {
  restaurantId: string;
  dineInEnabled: boolean;
  dineInPaused: boolean;
  dineInPausedReason?: string;
  dineInOpeningTime: string;
  dineInClosingTime: string;
  tableAssignMode: TableAssignMode;
  tableSelectionEnabled: boolean;
  payAtRestaurantEnabled: boolean;
  serviceChargeEnabled: boolean;
  serviceChargeType: 'percentage' | 'fixed';
  serviceChargeValue: number;
  dineInInstructions?: string;
  minOrderAmount?: number;
  maxGuestsPerOrder?: number;
  requireCustomerMobile: boolean;
  updatedAt: string;
}

// ── Dine-in Order ────────────────────────────────────────────────────────────

export type DineInPaymentMethod = 'online' | 'wallet' | 'pay_at_restaurant' | 'split';

export interface DineInOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: { label: string; value: string; priceAdd: number }[];
  addOns?: { name: string; price: number }[];
  specialInstruction?: string;
  availableForDineIn: boolean;
}

export interface DineInOrderPricing {
  subtotal: number;
  serviceCharge: number;
  serviceChargeType: 'percentage' | 'fixed';
  tax: number;
  couponDiscount: number;
  walletDiscount: number;
  loyaltyDiscount: number;
  platformFee: number;
  totalPayable: number;
}

export interface DineInOrder {
  id: string;
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  orderType: 'dine_in';
  dineInStatus: DineInStatus;
  tableAssignMode: TableAssignMode;
  tableId?: string;
  tableNumber?: string;
  tableAreaId?: string;
  tableAreaName?: string;
  guestCount: number;
  assignedTableNumber?: string;
  items: DineInOrderItem[];
  pricing: DineInOrderPricing;
  paymentMethod: DineInPaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  paymentTransactionId?: string;
  payAtRestaurant: boolean;
  couponCode?: string;
  couponId?: string;
  walletAmountUsed: number;
  loyaltyPointsUsed: number;
  specialInstructions?: string;
  createdAt: string;
  acceptedAt?: string;
  tableAssignedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  servedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  estimatedPreparationTime?: number;
}

// ── API Types ────────────────────────────────────────────────────────────────

export interface CreateDineInOrderRequest {
  restaurantId: string;
  orderType: 'dine_in';
  tableAssignMode: TableAssignMode;
  tableId?: string;
  guestCount: number;
  items: {
    menuItemId: string;
    quantity: number;
    customizations?: { optionId: string }[];
    addOnIds?: string[];
    specialInstruction?: string;
  }[];
  customerMobile: string;
  specialInstructions?: string;
  couponCode?: string;
  walletAmountToUse?: number;
  loyaltyPointsToUse?: number;
  paymentMethod: DineInPaymentMethod;
}

export interface DineInCheckoutCalculateRequest {
  restaurantId: string;
  items: { menuItemId: string; quantity: number }[];
  couponCode?: string;
  walletAmountToUse?: number;
  loyaltyPointsToUse?: number;
}

export interface DineInCheckoutCalculateResponse {
  subtotal: number;
  serviceCharge: number;
  tax: number;
  couponDiscount: number;
  walletDiscount: number;
  loyaltyDiscount: number;
  platformFee: number;
  totalPayable: number;
  isValid: boolean;
  validationErrors?: string[];
}

export interface SellerAssignTableRequest {
  orderId: string;
  tableId: string;
  tableNumber: string;
  tableAreaId: string;
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface DineInValidationResult {
  isValid: boolean;
  errors: DineInValidationError[];
}

export type DineInValidationErrorCode =
  | 'RESTAURANT_NOT_FOUND'
  | 'RESTAURANT_INACTIVE'
  | 'DINE_IN_NOT_SUPPORTED'
  | 'DINE_IN_PAUSED'
  | 'RESTAURANT_CLOSED'
  | 'TABLE_NOT_FOUND'
  | 'TABLE_UNAVAILABLE'
  | 'ITEM_UNAVAILABLE_FOR_DINE_IN'
  | 'ITEM_OUT_OF_STOCK'
  | 'PRICE_CHANGED'
  | 'INVALID_MOBILE'
  | 'INVALID_PAYMENT_METHOD'
  | 'COUPON_INVALID'
  | 'WALLET_INSUFFICIENT'
  | 'CART_RESTAURANT_MISMATCH';

export interface DineInValidationError {
  code: DineInValidationErrorCode;
  message: string;
  field?: string;
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface DineInReportSummary {
  restaurantId?: string;
  dateRange: { from: string; to: string };
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  serviceChargeCollected: number;
  taxCollected: number;
  refundsIssued: number;
  topItems: { name: string; count: number; revenue: number }[];
  popularAreas: { area: string; orders: number }[];
  peakHours: { hour: number; orders: number }[];
  averagePreparationTime: number;
  customerSatisfactionScore?: number;
}

// ── Notification Payloads ────────────────────────────────────────────────────

export interface DineInNotificationPayload {
  type: DineInWebSocketEvent;
  orderId: string;
  restaurantId: string;
  customerId: string;
  data: {
    status: DineInStatus;
    tableNumber?: string;
    tableArea?: string;
    message: string;
    timestamp: string;
  };
}
