/**
 * The one place a marketplace order's status is interpreted for display.
 *
 * Three enums describe the same lifecycle and none of them agree:
 *
 *   - `order-service` persists SCREAMING_CASE (`PENDING`, `OUT_FOR_DELIVERY`)
 *   - `libs/common` declares lower_snake (`pending`, `dispatched`)
 *   - the seller projection and courier webhooks add their own spellings
 *     (`SHIPPED`, `PICKED_UP`, `OFD`, `RTO`)
 *
 * Every page that rendered a status invented its own subset of that list, so an
 * order sitting at `PENDING` matched none of the customer list's five buckets
 * and drew an unlabelled, uncoloured badge — the status simply vanished from
 * the UI. Normalising once, here, is what keeps the list, the detail page, the
 * tracking timeline and the seller queue telling the customer the same story.
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

/** Wire spellings → canonical status. Keys are compared upper-cased. */
const ALIASES: Record<string, OrderStatus> = {
  PENDING: 'pending',
  PLACED: 'pending',
  CREATED: 'pending',
  AWAITING_PAYMENT: 'pending',

  CONFIRMED: 'confirmed',
  ACCEPTED: 'confirmed',
  PAID: 'confirmed',

  PREPARING: 'processing',
  PROCESSING: 'processing',
  PACKED: 'processing',
  READY: 'processing',
  READY_FOR_PICKUP: 'processing',

  SHIPPED: 'shipped',
  DISPATCHED: 'shipped',
  PICKED_UP: 'shipped',
  IN_TRANSIT: 'shipped',
  HANDED_OVER: 'shipped',

  OUT_FOR_DELIVERY: 'out_for_delivery',
  OFD: 'out_for_delivery',
  NEARBY: 'out_for_delivery',

  DELIVERED: 'delivered',
  COMPLETED: 'delivered',

  CANCELLED: 'cancelled',
  CANCELED: 'cancelled',
  REJECTED: 'cancelled',
  FAILED: 'cancelled',

  RETURNED: 'returned',
  RETURN_REQUESTED: 'returned',
  REFUND_REQUESTED: 'returned',
  RTO: 'returned',

  REFUNDED: 'refunded',
};

/**
 * Canonical status for any wire value.
 *
 * Falls back to `pending` rather than to a made-up bucket: an order the backend
 * describes with a word this map has never seen is at the start of its life far
 * more often than at the end, and showing "Delivered" for an unknown status
 * would be a lie the customer acts on.
 */
export function normaliseOrderStatus(raw: unknown): OrderStatus {
  const key = String(raw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ALIASES[key] ?? 'pending';
}

export interface OrderStatusPresentation {
  /** Customer-facing label. */
  label: string;
  /** Tailwind classes for a badge — background, text and border together. */
  badgeClass: string;
  /** Bare colour for dots, rails and progress fills. */
  dotClass: string;
  /** True once the order can no longer move forward. */
  terminal: boolean;
}

export const ORDER_STATUS_UI: Record<OrderStatus, OrderStatusPresentation> = {
  pending:          { label: 'Order Placed',    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',       dotClass: 'bg-slate-400',   terminal: false },
  confirmed:        { label: 'Confirmed',       badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',             dotClass: 'bg-sky-500',     terminal: false },
  processing:       { label: 'Processing',      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',       dotClass: 'bg-amber-500',   terminal: false },
  shipped:          { label: 'Shipped',         badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',          dotClass: 'bg-blue-500',    terminal: false },
  out_for_delivery: { label: 'Out for Delivery',badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',    dotClass: 'bg-indigo-500',  terminal: false },
  delivered:        { label: 'Delivered',       badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500', terminal: true  },
  cancelled:        { label: 'Cancelled',       badgeClass: 'bg-red-50 text-red-700 border-red-200',             dotClass: 'bg-red-500',     terminal: true  },
  returned:         { label: 'Returned',        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',    dotClass: 'bg-violet-500',  terminal: true  },
  refunded:         { label: 'Refunded',        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',          dotClass: 'bg-teal-500',    terminal: true  },
};

/** Forward progression an order walks when nothing goes wrong. */
export const ORDER_PROGRESSION: readonly OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered',
] as const;

/** Position in {@link ORDER_PROGRESSION}, or -1 for the off-path statuses. */
export function orderProgressIndex(status: OrderStatus): number {
  return ORDER_PROGRESSION.indexOf(status);
}

/** Filter tabs the customer order list offers, in display order. */
export const ORDER_FILTERS = [
  { key: 'all',        label: 'All Orders', match: () => true },
  { key: 'processing', label: 'Processing', match: (s: OrderStatus) => s === 'pending' || s === 'confirmed' || s === 'processing' },
  { key: 'shipped',    label: 'Shipped',    match: (s: OrderStatus) => s === 'shipped' || s === 'out_for_delivery' },
  { key: 'delivered',  label: 'Delivered',  match: (s: OrderStatus) => s === 'delivered' },
  { key: 'cancelled',  label: 'Cancelled',  match: (s: OrderStatus) => s === 'cancelled' },
  { key: 'returned',   label: 'Returned',   match: (s: OrderStatus) => s === 'returned' || s === 'refunded' },
] as const;

export type OrderFilterKey = (typeof ORDER_FILTERS)[number]['key'];

/** An order can only be cancelled by the customer before it leaves the seller. */
export function isCancellable(status: OrderStatus): boolean {
  return status === 'pending' || status === 'confirmed' || status === 'processing';
}

/** Returns and reviews only make sense once the customer has the goods. */
export function isReturnable(status: OrderStatus): boolean {
  return status === 'delivered';
}

/**
 * Customer-facing wording for the payment line.
 *
 * The order carries `escrowStatus` (PENDING / HELD / RELEASED / REFUNDED),
 * which is an internal settlement state — printing it raw told a cash-on-
 * delivery customer their payment was "PENDING" in bold green, which reads as
 * a problem rather than as the normal state of an unpaid COD order.
 */
export function paymentStatusLabel(
  paymentMethod: string | null | undefined,
  rawStatus: string | null | undefined,
): { label: string; tone: 'positive' | 'neutral' | 'warning' } {
  const method = String(paymentMethod ?? '').toUpperCase();
  const status = String(rawStatus ?? '').toUpperCase();

  if (status === 'REFUNDED') return { label: 'Refunded', tone: 'neutral' };
  if (status === 'RELEASED' || status === 'PAID' || status === 'CAPTURED') return { label: 'Paid', tone: 'positive' };
  if (status === 'HELD') return { label: 'Payment secured', tone: 'positive' };
  if (status === 'FAILED') return { label: 'Payment failed', tone: 'warning' };
  if (method === 'COD') return { label: 'Pay on delivery', tone: 'neutral' };
  if (status === 'PENDING') return { label: 'Awaiting payment', tone: 'warning' };
  return { label: status ? status.charAt(0) + status.slice(1).toLowerCase() : '—', tone: 'neutral' };
}
