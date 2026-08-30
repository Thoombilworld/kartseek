import { BadRequestException } from '@nestjs/common';

/**
 * Payload shapes for TCP/gRPC message handlers.
 *
 * Handlers were written as `@Payload() d: any`, which removes exactly the
 * guarantee this boundary needs most. The gateway and the services are separate
 * compilation units, so the compiler cannot see that one sends `{ id }` while
 * the other reads `d.restaurantId` — the mismatch only appears at runtime, as a
 * query filtered on `undefined` returning an empty list. That is precisely how
 * the admin pharmacy screen reported no stores while six sat in the table.
 *
 * These aliases do not make the boundary type-safe end to end — nothing can,
 * short of a shared contract package — but they do three useful things:
 * they document what a handler expects, they make an unexpected field a
 * compile error rather than `undefined`, and they keep `any` out of the layer
 * where a silent `undefined` is most expensive.
 *
 * Every field is optional on purpose. A message arrives from another process
 * and may be malformed; `d?.id` narrowed to `string | undefined` forces the
 * handler (or the service it calls) to decide what to do about that, which is
 * the honest model of a network boundary.
 */

/**
 * A message this handler reads no fields from.
 *
 * Such a handler either takes no payload at all, or forwards it whole to a
 * service method that declares its own parameter type — and that method is
 * where the shape gets checked. Marking it here would duplicate the claim in
 * the weaker of the two places, so this deliberately asserts nothing.
 */
export type EmptyMessage = any;

/** Identifies one record. Most `get_x` / `delete_x` commands send only this. */
export interface IdMessage {
  readonly id?: string;
}

/**
 * Read a required identifier out of an RPC payload.
 *
 * `IdMessage.id` is optional because a malformed message genuinely may not
 * carry one. Handlers were written `this.svc.approveHotel(d?.id)`, which under
 * `strictNullChecks` is the error it looks like: `undefined` reaching a method
 * that queries on it. Postgres answers `WHERE id = NULL` with zero rows, so the
 * call did not throw — it reported "not found" for what was actually a
 * malformed request, and the caller could not tell the two apart.
 *
 * @param subject names the record in the error, e.g. `requireId(d?.id, 'hotel')`.
 */
export function requireId(id: string | undefined, subject = 'record'): string {
  if (!id) {
    throw new BadRequestException(`A ${subject} id is required.`);
  }
  return id;
}

/** Any of the UUID versions Postgres will accept into a `uuid` column. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Read a required identifier that will be used in a `uuid` column comparison.
 *
 * `requireId` only checks presence, which is not enough when the value reaches
 * a `WHERE id = $1` against a uuid column: Postgres rejects a malformed string
 * with `invalid input syntax for type uuid`, and that surfaced to the caller as
 * a 500 carrying the database's own error text. Wrong status — the request was
 * bad, not the server — and it disclosed the column's type to anyone probing.
 *
 * Validating the shape first turns the same input into a 400 that names the
 * subject and reveals nothing about storage.
 */
export function requireUuid(id: string | undefined, subject = 'record'): string {
  const value = requireId(id, subject);
  if (!UUID.test(value)) {
    throw new BadRequestException(`That is not a valid ${subject} id.`);
  }
  return value;
}

/**
 * Read a required non-identifier field out of an RPC payload.
 *
 * The sibling of [requireId] for arguments that are not ids — a status enum, a
 * quantity, a reason. Same failure without it: the field arrives `undefined`,
 * the service treats it as a value, and the caller gets a confusing result
 * instead of "you left this out".
 */
export function requireValue<T>(value: T | undefined | null, field: string): T {
  if (value === undefined || value === null) {
    throw new BadRequestException(`\`${field}\` is required.`);
  }
  return value;
}

/**
 * Carries a body alongside its identifiers.
 *
 * `dto` is optional because the gateway spreads body fields flat next to the id
 * (`{ restaurantId, ...dto }`) about as often as it nests them. Handlers use
 * `d?.dto ?? d` for that reason; the index signature is what allows the second
 * half of that expression to type-check.
 */
export interface DtoMessage<TBody = any> {
  readonly dto?: TBody;
  // Deliberately `any` rather than `unknown`. The named fields on the
  // interfaces here are the part worth checking; an index signature of
  // `unknown` additionally forces a cast at every incidental field a handler
  // forwards, which in practice produced 40-odd casts that assert rather than
  // verify — noise that makes the real contract harder to see, not easier.
  // Narrow a specific field by intersecting: `DtoMessage & { reason?: string }`.
  readonly [field: string]: any;
}

/** Standard list controls. `status` is included because nearly every list filters on it. */
export interface PaginatedMessage {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: string;
}

/** Scoped to one restaurant — the dominant shape in restaurant-service. */
export interface RestaurantScopedMessage {
  readonly restaurantId?: string;
}

/** Scoped to one seller. */
export interface SellerScopedMessage {
  readonly sellerId?: string;
}

/** Scoped to one store (grocery, pharmacy). */
export interface StoreScopedMessage {
  readonly storeId?: string;
}

/**
 * The general case: known fields where they matter, unknown ones tolerated.
 *
 * Prefer a specific interface above. Reach for this only when a handler forwards
 * a payload it does not itself inspect.
 */
export type RpcMessage<TKnown = Record<string, unknown>> = Partial<TKnown> & {
  readonly [field: string]: unknown;
};

/**
 * Read the record id from a message that may be either `{ id }` or a bare string.
 *
 * Some commands are sent both ways: `get_restaurant_by_id` receives `{ id }`
 * from the gateway, while older callers send the uuid alone. Handlers expressed
 * that as `d?.id ?? d`, which type-checks as `string | IdMessage` and then fails
 * wherever a `string` is required. One named function is clearer than repeating
 * the narrowing at every call site, and gives the two shapes a single place to
 * be documented.
 */
export function messageId(message: IdMessage | string | undefined): string | undefined {
  return typeof message === 'string' ? message : message?.id;
}
