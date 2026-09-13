/**
 * The payloads `TaxiAdminController` receives over TCP, written down where the
 * handlers read them.
 *
 * ── Why these are interfaces and not class-validator classes ────────────────
 *
 * Because the client boundary is the GATEWAY, and it is already covered there.
 * Every body and query on the seven `/admin/taxi/*` routes M7 implements is a
 * class-validator DTO under `GatewayValidationPipe` (`whitelist`,
 * `forbidNonWhitelisted`, `transform` with implicit conversion) —
 * `apps/api-gateway/src/dto/admin-taxi.dto.ts`. That is the only surface a
 * client can address, so that is where a 400 belongs and where the plan's
 * "every body/query is a class-validator DTO" is satisfied.
 *
 * Nothing on THIS side of the wire is client input. `scope` and `actorId` are
 * written by the gateway from the signed token and can be set by nobody else;
 * the rest has already been validated one hop earlier. What is left to check
 * here is not shape but meaning, and the handlers do it themselves: `requireUuid`
 * for identifiers, `requireMarket` for the market filter, and `requireValue` for
 * a suspension's reason — each of which refuses in a way a class-validator
 * decorator on this side could not express.
 *
 * ── What is NOT the reason, and a hazard if that ever changes ───────────────
 *
 * A global pipe does not reach these handlers at all. `main.ts` calls
 * `app.connectMicroservice({ transport: TCP, … })` with no
 * `{ inheritAppConfig: true }`, so the global `ValidationPipe` is bound to the
 * HTTP application only and never sees a `@MessagePattern`.
 *
 * If someone later adds `inheritAppConfig: true`, `whitelist: true` would begin
 * stripping every property a payload CLASS does not declare. A class that forgot
 * `scope` would have it silently removed, the handler would read
 * `scope === undefined`, and a region-locked administrator would be served every
 * market's rows. Interfaces have no metatype for a pipe to act on, so they are
 * immune either way — a reason to keep them, not the reason they were chosen.
 * (The same note stands in doctor's, hotel's and restaurant's copies of this
 * file; it is one ruling, recorded at each of its sites.)
 *
 * ── `countryCode` IS this module's market column ────────────────────────────
 *
 * Unlike the other five verticals, taxi needs no translation between the wire
 * and the column: `taxi_vendors.countryCode`, `taxi_drivers.countryCode` and
 * `taxi_payout_records.countryCode` are the market, ISO-2, NOT NULL, and the
 * gateway's query parameter has the same name. The register of modules that
 * spell the market `countryCode` rather than `region_code` is kept above
 * `normaliseMarket` in `libs/common/src/market/market-scope.ts`, which is what
 * every check here passes through, so one rule serves both spellings.
 *
 * ── `scope` and `actorId` ───────────────────────────────────────────────────
 *
 * `scope` is the caller's market, set only for a region-locked administrator,
 * written only by the gateway and only from the signed token. It is never read
 * from a request body — `AdminTaxiController.scopeOf` is the only thing that
 * produces it.
 *
 * `actorId` is the acting administrator, likewise from the verified token. It is
 * recorded on every decision and published with every event so a write can be
 * traced to a person. The gateway used to send this as `adminId`; the seven
 * commands M7 owns take the platform's `actorId` spelling, which is what the
 * other five module admin surfaces already receive.
 */

/** Every admin message carries these two; neither ever comes from a client. */
export interface AdminScopedMsg {
  readonly scope?: string;
  readonly actorId?: string;
}

/** A read or decision addressed at one record. `id` is a path parameter, never a body field. */
export interface AdminIdMsg extends AdminScopedMsg {
  readonly id?: string;
}

/** Suspending one vendor. The reason is stored on the row and shown to the operator. */
export interface AdminSuspendVendorMsg extends AdminIdMsg {
  readonly reason?: string;
}

/**
 * The onboarding queue: the market it covers and how much of it to return.
 *
 * `countryCode` is a REQUESTED market — the lock for a region-locked
 * administrator, the `?countryCode=` filter for a global one. `requireMarket`
 * wraps it in the handler so an unreadable value is a refusal rather than an
 * absent predicate; absent means every market, which is the direction that
 * leaks.
 */
export interface AdminPendingApprovalsMsg extends AdminScopedMsg {
  readonly countryCode?: string;
  readonly limit?: number;
}
