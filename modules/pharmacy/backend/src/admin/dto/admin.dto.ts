/**
 * The payloads `AdminPharmacyController` (api-gateway) sends over TCP, written
 * down where the handlers read them.
 *
 * ── Why these are interfaces and not class-validator classes ────────────────
 *
 * The request BODY is validated at the gateway, by a class-validator DTO under
 * the gateway's `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
 * — `apps/api-gateway/src/dto/admin-pharmacy.dto.ts`. That is the boundary the
 * client can reach, and it is where a 400 belongs.
 *
 * Declaring these as VALIDATED CLASSES would be actively dangerous here.
 * `main.ts` binds a global `ValidationPipe({ whitelist: true })`, and a global
 * pipe applies to microservice handlers as well as HTTP ones. `whitelist`
 * strips every property the class does not declare — so a DTO class that forgot
 * to declare `scope` would have it silently removed from the payload, the
 * handler would read `scope === undefined`, and a region-locked administrator
 * would be served every market's rows. A leak caused by a validator is a poor
 * trade for a boundary no client can address.
 *
 * A plain interface has no metatype for the pipe to act on, so the payload
 * arrives intact and the handlers validate what actually matters themselves:
 * `requireId` for identifiers, `requireMarket` for market filters, and the
 * whitelist in `PHARMACY_SETTING_DEFAULTS` for settings keys.
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
