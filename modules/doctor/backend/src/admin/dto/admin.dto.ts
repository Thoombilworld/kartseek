/**
 * The payloads `AdminDoctorController` (api-gateway) sends over TCP, written
 * down where the handlers read them.
 *
 * ── Why these are interfaces and not class-validator classes ────────────────
 *
 * Because the client boundary is the GATEWAY, and it is already covered there.
 * Every body and query on `/admin/doctor/*` is a class-validator DTO under
 * `GatewayValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform` with
 * implicit conversion) — `apps/api-gateway/src/dto/admin-doctor.dto.ts`. That is
 * the only surface a client can address, so that is where a 400 belongs and
 * where the plan's "every body/query is a class-validator DTO" is satisfied.
 *
 * Nothing on THIS side of the wire is client input. `scope` and `actorId` are
 * written by the gateway from the signed token and can be set by nobody else;
 * the rest has already been validated one hop earlier. What is left to check
 * here is not shape but meaning, and the handlers do it themselves: `requireUuid`
 * for identifiers, `requireMarket` for market filters, and the period, status
 * and action whitelists in `DoctorAdminService` — each of which refuses in a way
 * a class-validator decorator could not express.
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
 * (The same note stands in hotel's and restaurant's copies of this file; it is
 * one ruling, recorded at each of its sites.)
 *
 * ── `scope` and `actorId` ───────────────────────────────────────────────────
 *
 * `scope` is the caller's market, set only for a region-locked administrator,
 * written only by the gateway and only from the signed token. It is never read
 * from a request body — `AdminDoctorController.scopeOf` is the only thing that
 * produces it.
 *
 * `actorId` is the acting administrator, likewise from the verified token. It is
 * recorded on every decision and published with every event so a write can be
 * traced to a person. Until M6 this module received it (as `adminId`) and threw
 * it away on every decision it had.
 *
 * ── `countryCode` is the wire name for `region_code` ────────────────────────
 *
 * The gateway's query parameter is `?countryCode=`, and this module's market
 * COLUMN is `region_code` (on `clinics`, and as of M6 on `doctors`). The wire
 * keeps the gateway's name so one payload shape serves all six admin
 * controllers; every handler resolves it to the column in one place
 * (`DoctorAdminService.market`).
 */

/** Every admin message carries these two; neither ever comes from a client. */
export interface AdminScopedMsg {
  readonly scope?: string;
  readonly actorId?: string;
}

/** A list read: page controls, a status filter and the market. */
export interface AdminListMsg extends AdminScopedMsg {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: string;
  readonly countryCode?: string;
}

/** The practitioner directory, which may also be narrowed to one specialty. */
export interface AdminDoctorListMsg extends AdminListMsg {
  readonly specialty?: string;
}

/**
 * A read or decision addressed at one record — a clinic detail, a clinic
 * approval, a practitioner detail.
 *
 * There is deliberately no `AdminApproveClinicMsg` alias beside it: it was one
 * declared and never used, because `msgApproveClinic` types its payload as this
 * interface directly. A name that only a docstring reaches is a name that goes
 * stale (M6 review M-9). `id` is the PATH parameter and never a body field — a
 * body carrying one used to retarget a decision at a record in another market.
 */
export interface AdminIdMsg extends AdminScopedMsg {
  readonly id?: string;
}

/** The appointments queue: page controls, a status filter, a date and the market. */
export interface AdminAppointmentListMsg extends AdminListMsg {
  readonly date?: string;
}

/**
 * The verification decision on one practitioner.
 *
 * `verified` is the decision itself — `true` verifies, `false` records a refusal
 * — and `notes` is what the administrator wrote with it. Both are stored; before
 * M6 the whole decision was a `status` move with nothing recorded.
 */
export interface AdminVerifyDoctorMsg extends AdminIdMsg {
  readonly verified?: boolean;
  readonly notes?: string;
}

/** Suspending one practitioner. The reason reaches them, so the handler requires it. */
export interface AdminSuspendDoctorMsg extends AdminIdMsg {
  readonly reason?: string;
}

/** Adding one entry to the global specialty catalogue. No market: it is shared. */
export interface AdminSpecialtyMsg extends AdminScopedMsg {
  readonly name?: string;
  readonly icon?: string;
  readonly description?: string;
}

/** The report window, and the market it covers. */
export interface AdminReportMsg extends AdminScopedMsg {
  readonly period?: string;
  readonly countryCode?: string;
}

/** Just the market — for the reads that take no page and no filter. */
export interface AdminMarketMsg extends AdminScopedMsg {
  readonly countryCode?: string;
}

/**
 * One market's doctor configuration.
 *
 * `countryCode` is the market the gateway RESOLVED for this caller — the lock
 * for a region-locked administrator, the requested `?countryCode=` for a global
 * one. It is not a market read from a client's body: `scopeOf` refuses a locked
 * caller who names another market before the RPC is made, and the handler
 * asserts the resolved value again.
 */
export interface AdminSettingsMsg extends AdminMarketMsg {
  readonly platformFeePercent?: number;
  readonly commissionPercent?: number;
  readonly autoApproveClinics?: boolean;
  readonly maxAppointmentsPerDoctorPerDay?: number;
  readonly cancellationWindowHours?: number;
  readonly prescriptionValidityDays?: number;
}
