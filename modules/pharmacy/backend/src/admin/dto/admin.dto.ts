/**
 * The payloads `AdminPharmacyController` (api-gateway) sends over TCP, written
 * down where the handlers read them.
 *
 * ── Why these are interfaces and not class-validator classes ────────────────
 *
 * Because the client boundary is the GATEWAY, and it is already covered there.
 * Every body and query on `/admin/pharmacy/*` is a class-validator DTO under
 * `GatewayValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) —
 * `apps/api-gateway/src/dto/admin-pharmacy.dto.ts`. That is the only surface a
 * client can address, so that is where a 400 belongs and where the plan's
 * "every body/query is a class-validator DTO" is satisfied.
 *
 * Nothing on THIS side of the wire is client input. `scope` and `actorId` are
 * written by the gateway from the signed token and can be set by nobody else;
 * the rest has already been validated one hop earlier. What is left to check
 * here is not shape but meaning, and the handlers do that themselves:
 * `requireId` for identifiers, `requireMarket` for market filters, and the
 * whitelist in `PHARMACY_SETTING_DEFAULTS` for settings keys — each of which
 * refuses in a way a class-validator decorator could not express.
 *
 * ── What is NOT the reason, and a hazard if that ever changes ───────────────
 *
 * A global pipe does not reach these handlers at all. `main.ts` calls
 * `app.connectMicroservice({ transport: TCP, … })` with no
 * `{ inheritAppConfig: true }`, so neither the global `ValidationPipe` nor the
 * global `HttpSurfaceGuard` applies to a `@MessagePattern` — they are bound to
 * the HTTP application only. (No service in this repository passes
 * `inheritAppConfig` today.) An earlier version of this comment argued from the
 * opposite premise; it was wrong, and M4-M7 should not copy it.
 *
 * The hazard it described is real but CONDITIONAL, and worth stating so it is
 * not rediscovered the hard way: if someone later adds `inheritAppConfig: true`
 * here, `whitelist: true` would begin stripping every property a payload class
 * does not declare. A class that forgot `scope` would have it silently removed,
 * the handler would read `scope === undefined`, and a region-locked
 * administrator would be served every market's rows. Interfaces have no
 * metatype for a pipe to act on, so they are immune to that either way — which
 * is a reason to keep them, not the reason they were chosen.
 *
 * ── `scope` and `actorId` ───────────────────────────────────────────────────
 *
 * `scope` is the caller's market, set only for a region-locked administrator,
 * written only by the gateway and only from the signed token. It is never read
 * from a request body — `AdminPharmacyController.scopeOf` is the only thing
 * that produces it.
 *
 * `actorId` is the acting administrator, likewise from the verified token. It
 * is recorded on every decision and published with every event so a write can
 * be traced to a person.
 */

/** Every admin message carries these two; neither ever comes from a client. */
export interface AdminScopedMsg {
  readonly scope?: string;
  readonly actorId?: string;
}

/** A list read: page controls, an optional status filter, and the market. */
export interface AdminListMsg extends AdminScopedMsg {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: string;
  /**
   * The market the caller asked to see. Named `countryCode` on the wire because
   * that is what the gateway's `?countryCode=` query parameter is called; the
   * COLUMN it resolves to is `pharmacy_stores.region_code`, this platform's
   * ISO-2 market identifier.
   */
  readonly countryCode?: string;
}

/** A read or decision addressed at one record. */
export interface AdminIdMsg extends AdminScopedMsg {
  readonly id?: string;
}

/** Suspending a pharmacy: the reason is shown to the store owner. */
export interface AdminSuspendMsg extends AdminIdMsg {
  readonly reason?: string;
}

/** The product list additionally filters by catalogue category. */
export interface AdminProductListMsg extends AdminListMsg {
  readonly category?: string;
  readonly available?: boolean;
}

/** A licence decision, with the reviewer's note. */
export interface AdminVerifyLicenceMsg extends AdminIdMsg {
  readonly verified?: boolean;
  readonly notes?: string;
}

/** Creating a catalogue category. Property names are the entity's columns. */
export interface AdminCategoryMsg extends AdminScopedMsg {
  readonly name?: string;
  readonly slug?: string;
  readonly description?: string;
  readonly emoji?: string;
  readonly parentId?: string;
  readonly sortOrder?: number;
  readonly requiresPrescription?: boolean;
}

/** The reporting screen's period selector. */
export interface AdminReportMsg extends AdminListMsg {
  readonly period?: string;
}

/**
 * A settings write. Everything except the three reserved keys below is a
 * setting; each is checked against `PHARMACY_SETTING_DEFAULTS` before it is
 * stored.
 */
export interface AdminSettingsMsg extends AdminScopedMsg {
  readonly countryCode?: string;
  readonly [setting: string]: unknown;
}
