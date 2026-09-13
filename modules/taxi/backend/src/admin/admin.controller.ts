import { Controller, Logger, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RpcAwareExceptionsFilter } from '@app/common';
import { TaxiAdminService } from './admin.service';
import type { AdminIdMsg, AdminPendingApprovalsMsg, AdminSuspendVendorMsg } from './dto/admin.dto';

/**
 * The seven `admin.taxi.*` commands MODULES owns, in one place.
 *
 * ── Seven of thirty-seven, and why the other thirty are elsewhere ───────────
 *
 * `admin-taxi.controller.ts` (api-gateway) sends THIRTY-SEVEN distinct commands.
 * Sixteen already had a `@MessagePattern` on `taxi.controller.ts` — vendors,
 * drivers, documents, rate cards, configs, payouts, nearby drivers, surge — and
 * twenty-one had no handler anywhere in this module, so the gateway answered
 * "Taxi service unavailable", which reads as an outage rather than a contract
 * gap.
 *
 * These seven were the last unhandled taxi commands whose implementation
 * already existed: vendor and driver onboarding decisions and the payout
 * approval. The fourteen remaining `admin.taxi.*` commands are the operations
 * console (rides, fleet, surge, pricing, complaints, routes, compliance,
 * settings) and are the taxi plan's: they need entities this module does not
 * have yet. They are deliberately still unhandled rather than pointed at a
 * near-enough method that would answer with another market's fleet.
 *
 * Named, so the next reader does not have to re-derive the split —
 * `admin.taxi.` `dashboard`, `rides`, `rideDetail`, `fleet`, `pricing`,
 * `updatePricing`, `updateSurge`, `complaints`, `resolveComplaint`, `routes`,
 * `createRoute`, `compliance`, `settings`, `updateSettings`. The two census
 * specs in `apps/api/test` hold exactly those fourteen and nothing else under
 * taxi, and `apps/api/test/module-command-coverage.spec.ts` fails if an eighth
 * MODULES-owned taxi command ever appears without a handler.
 *
 * ── `@UseFilters` on the CONTROLLER, not the method ─────────────────────────
 *
 * A `@UseFilters` on a method does not reach a TCP handler's thrown exception;
 * only the controller-level binding does (`project_nest_rpc_filter_binding`).
 * `RpcAwareExceptionsFilter` is what turns a `ForbiddenException` here into a
 * 403 at the gateway rather than a 500 — which is the difference between "not
 * your market" and "the taxi service is broken".
 *
 * ── No `ValidationPipe` here ────────────────────────────────────────────────
 *
 * Deliberately: the payloads are interfaces, validated one hop earlier at the
 * gateway where a client can actually reach them, and `whitelist: true` on a
 * pipe bound here would silently STRIP any property a class forgot to declare —
 * `scope` among them, which would serve a region-locked administrator every
 * market's rows. See `dto/admin.dto.ts` for the whole ruling.
 *
 * `scope` is the caller's market when the gateway resolved one for a
 * region-locked administrator, and undefined for a global one. `actorId` is the
 * acting administrator, from the verified token. Neither is ever read from a
 * client body, and the market a decision acts in is read from the ROW, never
 * from the message.
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class TaxiAdminController {
  private readonly logger = new Logger(TaxiAdminController.name);

  constructor(private readonly admin: TaxiAdminService) {}

  // ── Vendors ────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.taxi.vendorDetail' })
  msgVendorDetail(@Payload() d: AdminIdMsg) {
    return this.admin.getVendorDetail(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.taxi.approveVendor' })
  msgApproveVendor(@Payload() d: AdminIdMsg) {
    return this.admin.approveVendor(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.taxi.suspendVendor' })
  msgSuspendVendor(@Payload() d: AdminSuspendVendorMsg) {
    return this.admin.suspendVendor(d ?? {});
  }

  // ── Drivers ────────────────────────────────────────────────────────────────

  /**
   * `driverDetail`, and not the storefront's read of the same row.
   *
   * `TaxiService` has its own driver lookups for the rider app; this one loads
   * the vendor and the polymorphic document set an approver needs to see, and
   * asserts the driver's own market before returning any of it.
   */
  @MessagePattern({ cmd: 'admin.taxi.driverDetail' })
  msgDriverDetail(@Payload() d: AdminIdMsg) {
    return this.admin.getDriverDetail(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.taxi.approveDriver' })
  msgApproveDriver(@Payload() d: AdminIdMsg) {
    return this.admin.approveDriver(d ?? {});
  }

  // ── Payouts ────────────────────────────────────────────────────────────────

  /**
   * The single-payout approval, which is NOT the batch one with one element.
   *
   * `approvePayoutBatch` is an `UPDATE … WHERE status = 'pending'` reporting a
   * count, so it answers "0" for a payout that was already settled — a silent
   * no-op the console renders as a successful approval. This one loads the row,
   * refuses a non-pending state with a 400 naming it, and returns what it
   * changed. See `TaxiPayoutService.approvePayout`.
   */
  @MessagePattern({ cmd: 'admin.taxi.approvePayout' })
  msgApprovePayout(@Payload() d: AdminIdMsg) {
    return this.admin.approvePayout(d ?? {});
  }

  // ── The onboarding queue ───────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.taxi.pendingApprovals' })
  msgPendingApprovals(@Payload() d: AdminPendingApprovalsMsg) {
    return this.admin.getPendingApprovals(d ?? {});
  }
}
