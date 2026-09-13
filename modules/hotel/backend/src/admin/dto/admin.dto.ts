/**
 * The payloads `AdminHotelController` (api-gateway) sends over TCP, written down
 * where the handlers read them.
 *
 * ── Why these are interfaces and not class-validator classes ────────────────
 *
 * Because the client boundary is the GATEWAY, and it is already covered there.
 * Every body and query on `/admin/hotel/*` is a class-validator DTO under
 * `GatewayValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) —
 * `apps/api-gateway/src/dto/admin-hotel.dto.ts`. That is the only surface a
 * client can address, so that is where a 400 belongs and where the plan's "every
 * body/query is a class-validator DTO" is satisfied.
 *
 * Nothing on THIS side of the wire is client input. `scope` and `actorId` are
 * written by the gateway from the signed token and can be set by nobody else;
 * the rest has already been validated one hop earlier. What is left to check
 * here is not shape but meaning, and the handlers do it themselves: `requireUuid`
 * for identifiers, `requireMarket` for market filters, and the period and action
 * whitelists in `HotelAdminService` — each of which refuses in a way a
 * class-validator decorator could not express.
 *
 * ── What is NOT the reason, and a hazard if that ever changes ───────────────
 *
 * A global pipe does not reach these handlers at all. `main.ts` calls
 * `app.connectMicroservice({ transport: TCP, … })` with no
 * `{ inheritAppConfig: true }`, so the global `ValidationPipe` is bound to the
 * HTTP application only and never sees a `@MessagePattern`. (No service in this
 * repository passes `inheritAppConfig` today.)
 *
 * The hazard is real but CONDITIONAL, and worth stating so it is not
 * rediscovered the hard way: if someone later adds `inheritAppConfig: true`,
 * `whitelist: true` would begin stripping every property a payload class does
 * not declare. A class that forgot `scope` would have it silently removed, the
 * handler would read `scope === undefined`, and a region-locked administrator
 * would be served every market's rows. Interfaces have no metatype for a pipe to
 * act on, so they are immune either way — a reason to keep them, not the reason
 * they were chosen.
 *
 * ── `scope` and `actorId` ───────────────────────────────────────────────────
 *
 * `scope` is the caller's market, set only for a region-locked administrator,
 * written only by the gateway and only from the signed token. It is never read
 * from a request body — `AdminHotelController.scopeOf` is the only thing that
 * produces it.
 *
 * `actorId` is the acting administrator, likewise from the verified token. It is
 * recorded on every decision and published with every event so a write can be
 * traced to a person. Until M5 this module received it (as `adminId`) and threw
 * it away on both decisions it had.
 */

/** Every admin message carries these two; neither ever comes from a client. */
export interface AdminScopedMsg {
  readonly scope?: string;
  readonly actorId?: string;
}

/**
 * A list read: page controls and the market.
 *
 * Named `countryCode` on the wire because that is what the gateway's
 * `?countryCode=` query parameter is called, and because it is also the name of
 * the COLUMN it resolves to — `hotels.countryCode`, this module's ISO-2 market
 * (the platform's `region_code` under the name hotel predates it by; the
 * exception is registered in `libs/common/src/market/market-scope.ts`).
 */
export interface AdminListMsg extends AdminScopedMsg {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: string;
  readonly countryCode?: string;
}

/** The rooms list, which may also be narrowed to one property. */
export interface AdminRoomListMsg extends AdminListMsg {
  readonly hotelId?: string;
}

/** A read or decision addressed at one record. */
export interface AdminIdMsg extends AdminScopedMsg {
  readonly id?: string;
}

/** The hotel decisions, which address the property by `hotelId`. */
export interface AdminHotelDecisionMsg extends AdminScopedMsg {
  readonly hotelId?: string;
  readonly reason?: string;
}

/** Adding one entry to the global amenity catalogue. */
export interface AdminAmenityMsg extends AdminScopedMsg {
  readonly name?: string;
  readonly icon?: string;
  readonly category?: string;
  readonly isActive?: boolean;
}

/** The report window, and the market it covers. */
export interface AdminReportMsg extends AdminScopedMsg {
  readonly period?: string;
  readonly countryCode?: string;
}

/** Moderating one review. `action` is whitelisted in the handler. */
export interface AdminModerateReviewMsg extends AdminIdMsg {
  readonly action?: string;
  readonly reason?: string;
}

/**
 * The pricing half of a market's settings row.
 *
 * `countryCode` is the market the gateway RESOLVED for this caller — the lock
 * for a region-locked administrator, the requested `?countryCode=` for a global
 * one. It is not a market read from a client's body: `scopeOf` refuses a locked
 * caller who names another market before the RPC is made, and the handler
 * asserts the resolved value again.
 */
export interface AdminPricingMsg extends AdminScopedMsg {
  readonly countryCode?: string;
  readonly platformFeePercent?: number;
  readonly serviceTaxPercent?: number;
  readonly cleaningFee?: number;
  readonly freeCancellationWindowHours?: number;
}

/** The operational half of the same row — see the entity for why it is one row. */
export interface AdminSettingsMsg extends AdminScopedMsg {
  readonly countryCode?: string;
  readonly autoApproveHotels?: boolean;
  readonly maxRoomsPerHotel?: number;
  readonly defaultCommissionRate?: number;
}
