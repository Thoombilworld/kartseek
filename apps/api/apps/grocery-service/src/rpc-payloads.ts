/**
 * Payload shapes for grocery-service's TCP/gRPC handlers.
 *
 * The generic aliases in `@app/common/rpc` cover the common shapes; these are the
 * grocery-specific ones. The point, as that file explains, is that the gateway and
 * this service are separate compilation units — nothing catches the gateway
 * sending `{ id }` where the handler reads `d.storeId` except a runtime query
 * filtered on `undefined`, which returns an empty list rather than an error.
 *
 * Every field is optional because a message arrives from another process and may
 * be malformed. Handlers that pass a payload straight to a validated DTO cast at
 * that boundary and the service's ValidationPipe rejects what does not fit — the
 * cast is the honest marker of where trust begins.
 */

/** Nearly every seller-scoped command carries the store. */
export interface StoreMsg {
  readonly storeId?: string;
}

/** Store + product, the shape behind the product CRUD commands. */
export interface StoreProductMsg extends StoreMsg {
  readonly productId?: string;
}

/** Standard list controls. */
export interface PageMsg {
  readonly page?: number;
  readonly limit?: number;
}

export interface StoreListMsg extends StoreMsg, PageMsg {
  readonly category?: string;
  readonly status?: string;
}

export interface SearchMsg extends PageMsg {
  readonly query?: string;
  readonly storeId?: string;
  readonly categoryId?: string;
}

/** Order commands. `requesterId`/`requesterRole` drive the visibility check. */
export interface OrderMsg {
  readonly orderId?: string;
  readonly requesterId?: string;
  readonly requesterRole?: string;
  readonly actorId?: string;
  readonly actorRole?: string;
}

export interface CustomerOrdersMsg extends PageMsg {
  readonly customerId?: string;
}

export interface FlashDealMsg {
  readonly dealId?: string;
  readonly approvedBy?: string;
  readonly storeId?: string;
  readonly status?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface WishlistMsg extends PageMsg {
  readonly customerId?: string;
  readonly productId?: string;
  readonly storeId?: string;
}

export interface CategoryMsg {
  readonly id?: string;
}

export interface FranchiseMsg extends PageMsg {
  readonly franchiseId?: string;
  readonly search?: string;
  readonly status?: string;
  readonly category?: string;
  readonly period?: string;
  readonly storeId?: string;
}

/** Admin console commands, which mostly address one record or one list. */
export interface AdminIdMsg {
  readonly id?: string;
  readonly reason?: string;
  readonly actorId?: string;
}

export interface AdminListMsg extends PageMsg {
  readonly status?: string;
  readonly search?: string;
  readonly storeId?: string;
  readonly category?: string;
  readonly regionCode?: string;
}

/**
 * A payload forwarded whole into a class-validated DTO.
 *
 * The gateway spreads body fields flat next to the route params, so the message
 * *is* the DTO plus a couple of identifiers. The handler cannot prove that
 * statically; the ValidationPipe in `main.ts` is what actually enforces it.
 */
export type DtoPayload = Record<string, any>;
