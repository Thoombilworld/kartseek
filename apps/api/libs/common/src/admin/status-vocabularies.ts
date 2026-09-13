/**
 * The status words the admin console may filter on, and the one rule that turns
 * what a human clicked into the value the wire carries.
 *
 * Three surfaces spell the same state three ways. `order.orders.status` is
 * UPPER_SNAKE; the orders console's dropdown sends `processing`, `delivered`,
 * `pending`, `cancelled`; the returns and refunds consoles send title case with
 * spaces — `Picked Up`, `Refund Initiated`. Nothing reconciled them, because
 * until M1 the routes answered a literal and the parameter never reached a
 * database. The moment they became real reads, a filter was either a silent
 * no-match ("this market has no orders in that state" — the same lie M1 exists
 * to remove) or an enum cast error from Postgres.
 *
 * So the gateway normalises once, at the edge, and validates the NORMALISED
 * value against the owning service's own vocabulary. A word that is not a state
 * the platform has is a 400 naming the set, never an empty page.
 */

/**
 * Fold one status filter into the wire's UPPER_SNAKE.
 *
 * Spaces and hyphens become underscores, so `Picked Up` and `picked-up` are
 * both `PICKED_UP`. An empty string becomes `undefined` — every one of these
 * consoles uses `''` for "All", and `@IsOptional` only skips a value that is
 * absent, so without this "All" would be validated as a status and refused.
 */
export function normaliseStatusFilter(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  if (!v) return undefined;
  return v.toUpperCase().replace(/[\s-]+/g, '_');
}

/**
 * `order.orders.status`, in the order the fulfilment path moves through it.
 *
 * Lives here rather than in order-service so the gateway DTO that validates the
 * query and the service DTO that validates the RPC payload read one list. A
 * second copy in the gateway is how a status comes to be accepted at the edge
 * and rejected one hop later.
 *
 * It is still a copy, though — of `OrderStatus` in
 * `apps/order-service/src/entities/order.entity.ts`, which is what the column
 * is declared as and therefore what Postgres will accept. The same spec pins it
 * member-for-member, as it does the other three. Re-exporting the constant into
 * order-service's DTO removed the *second list*, not the fact that this one
 * restates an enum it cannot import.
 */
export const ADMIN_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUND_REQUESTED',
  'REFUNDED',
] as const;
export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

/**
 * `marketplace.return_requests.status`.
 *
 * A copy of an enum that is declared on the entity, in another package the
 * gateway cannot import — `apps/api-gateway/src/dto/admin-orders.dto.spec.ts`
 * reads that entity's source and fails when the two lists drift, which is the
 * only thing that keeps a copy honest. (This named a file that has never
 * existed, `admin-marketplace.query.spec.ts`, which is a worse kind of comment
 * than none: it says a guard exists and tells you where not to look for it.)
 */
export const ADMIN_RETURN_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PICKUP_ASSIGNED',
  'PICKED_UP',
  'RECEIVED',
  'QC_PASSED',
  'QC_FAILED',
  'REFUNDED',
  'REPLACEMENT_SHIPPED',
  'CLOSED',
  'CANCELLED',
] as const;
export type AdminReturnStatus = (typeof ADMIN_RETURN_STATUSES)[number];

/** `RefundStatus` in refund-service — checked against that source by the same spec. */
export const ADMIN_REFUND_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PROCESSED',
  'EXPIRED',
] as const;
export type AdminRefundStatus = (typeof ADMIN_REFUND_STATUSES)[number];

/** `PaymentStatus` in payment-service — checked against that source by the same spec. */
export const ADMIN_PAYMENT_STATUSES = [
  'INITIATED',
  'PROCESSING',
  'PREAUTHORIZED',
  'SUCCESS',
  'FAILED',
  'ESCROW_HOLD',
  'ESCROW_RELEASED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type AdminPaymentStatus = (typeof ADMIN_PAYMENT_STATUSES)[number];

/**
 * Make a search term mean what it looks like.
 *
 * `ILike('%' + term + '%')` treats `%` and `_` in the term as wildcards, so a
 * customer id containing an underscore matched far more than the box implied.
 * The value is parameterised either way — this is a correctness fix, not an
 * injection one. `\` is escaped first, or escaping the others would re-open it.
 */
export function escapeLikeTerm(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
