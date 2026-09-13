import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { requireId, RpcAwareExceptionsFilter } from '@app/common';
import { PharmacyAdminService } from './admin.service';
import { PharmacyService } from '../pharmacy.service';
import { PrescriptionStatus } from '../entities';
import type {
  AdminCategoryMsg,
  AdminIdMsg,
  AdminListMsg,
  AdminProductListMsg,
  AdminReportMsg,
  AdminScopedMsg,
  AdminSettingsMsg,
  AdminSuspendMsg,
  AdminVerifyLicenceMsg,
} from './dto/admin.dto';

/**
 * Every `admin.pharmacy.*` command the gateway sends, in one file.
 *
 * The census that produced this list (M3): `admin-pharmacy.controller.ts` sends
 * NINETEEN distinct commands. Two had a `@MessagePattern` — `stores` and
 * `categories`, which used to sit at the bottom of `pharmacy.controller.ts`.
 * The other seventeen had none anywhere in the module, so every other screen in
 * the pharmacy console answered 503 (and, before M2 removed the gateway's
 * fallbacks, a fabricated empty success). The two that existed moved here, so
 * the file a reader opens to check the contract holds all nineteen rather than
 * two of them.
 *
 * ── `@UseFilters` on the CLASS ──────────────────────────────────────────────
 *
 * This is the only binding that reaches a TCP handler. An `APP_FILTER` provider
 * silently does not, which collapses every RPC error into a 503 at the gateway
 * and loses the 403/404/400 the handler actually threw — precisely the
 * distinction this task's market denials depend on.
 *
 * ── `@Controller('admin')` publishes no HTTP route ──────────────────────────
 *
 * There is no `@Get`/`@Post` in this class: the base path exists so the
 * module's route table reads sensibly (the same shape hotel uses), and the only
 * transport is TCP. `HttpSurfaceGuard` closes this service's HTTP surface to
 * everything but the health probes in any case, and `context.getType() === 'rpc'`
 * means it never sees these handlers.
 *
 * ── Where each command is served ────────────────────────────────────────────
 *
 * Five delegate to `PharmacyService` because a correct, market-asserting
 * implementation already existed there and a second copy of a decision is how
 * two code paths come to disagree about who may make it: `stores`,
 * `categories`, `approve`, `suspend` and `approvePrescription`. The rest are
 * new work and live in `PharmacyAdminService`.
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller('admin')
export class PharmacyAdminController {
  constructor(
    private readonly admin: PharmacyAdminService,
    private readonly svc: PharmacyService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.dashboard' })
  dashboard(@Payload() d: AdminListMsg) {
    return this.admin.getDashboard({ region: d?.countryCode, scope: d?.scope });
  }

  // ── Stores ─────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.stores' })
  stores(@Payload() d: AdminListMsg) {
    return this.admin.listStores({
      page: d?.page,
      limit: d?.limit,
      status: d?.status,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.pharmacy.storeDetail' })
  storeDetail(@Payload() d: AdminIdMsg) {
    return this.admin.getStoreDetail(requireId(d?.id, 'pharmacy store'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.pharmacy.approve' })
  approve(@Payload() d: AdminIdMsg) {
    return this.svc.approveStore(requireId(d?.id, 'pharmacy store'), d?.scope, d?.actorId);
  }

  @MessagePattern({ cmd: 'admin.pharmacy.suspend' })
  suspend(@Payload() d: AdminSuspendMsg) {
    return this.svc.suspendStore(
      requireId(d?.id, 'pharmacy store'),
      d?.reason,
      d?.scope,
      d?.actorId,
    );
  }

  // ── Products ───────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.products' })
  products(@Payload() d: AdminProductListMsg) {
    return this.admin.listProducts({
      page: d?.page,
      limit: d?.limit,
      category: d?.category,
      available: d?.available,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.pharmacy.approveProduct' })
  approveProduct(@Payload() d: AdminIdMsg) {
    return this.admin.approveProduct(requireId(d?.id, 'pharmacy product'), d?.actorId, d?.scope);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.orders' })
  orders(@Payload() d: AdminListMsg) {
    return this.admin.listOrders({
      page: d?.page,
      limit: d?.limit,
      status: d?.status,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.prescriptions' })
  prescriptions(@Payload() d: AdminListMsg) {
    return this.admin.listPrescriptions({
      page: d?.page,
      limit: d?.limit,
      status: d?.status,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  /**
   * Approving a prescription is `verifyPrescription` with the approved status.
   *
   * It delegates rather than reimplementing because that method already does
   * three things this route needs and a fresh copy would have to repeat: it
   * attributes the prescription through its target pharmacy and refuses one in
   * another market, it refuses a locked admin a prescription with no target
   * pharmacy at all, and it advances the linked order to
   * `PRESCRIPTION_VERIFIED`. A prescription approved without the order moving
   * is a customer waiting on a checkout that will never proceed.
   */
  @MessagePattern({ cmd: 'admin.pharmacy.approvePrescription' })
  approvePrescription(@Payload() d: AdminIdMsg) {
    return this.svc.verifyPrescription(requireId(d?.id, 'prescription'), {
      status: PrescriptionStatus.VERIFIED_APPROVED,
      adminId: d?.actorId ?? 'unknown',
      scope: d?.scope,
    });
  }

  // ── Licence verification ───────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.verifications' })
  verifications(@Payload() d: AdminListMsg) {
    return this.admin.listVerifications({
      page: d?.page,
      limit: d?.limit,
      status: d?.status,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.pharmacy.verifyLicense' })
  verifyLicense(@Payload() d: AdminVerifyLicenceMsg) {
    return this.admin.verifyLicence(
      requireId(d?.id, 'pharmacy store'),
      { verified: d?.verified === true, notes: d?.notes },
      d?.actorId,
      d?.scope,
    );
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.categories' })
  categories() {
    return this.svc.getCategories();
  }

  @MessagePattern({ cmd: 'admin.pharmacy.createCategory' })
  createCategory(@Payload() d: AdminCategoryMsg) {
    const { scope, actorId, ...body } = d ?? {};
    return this.admin.createCategory(body, actorId, scope);
  }

  // ── Money ──────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.commissions' })
  commissions(@Payload() d: AdminListMsg) {
    return this.admin.getCommissions({ region: d?.countryCode, scope: d?.scope });
  }

  @MessagePattern({ cmd: 'admin.pharmacy.settlements' })
  settlements(@Payload() d: AdminListMsg) {
    return this.admin.getSettlements({
      page: d?.page,
      limit: d?.limit,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.pharmacy.reports' })
  reports(@Payload() d: AdminReportMsg) {
    return this.admin.getReports({
      period: d?.period,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.pharmacy.settings' })
  settings(@Payload() d: AdminScopedMsg & { countryCode?: string }) {
    return this.admin.getSettings({ region: d?.countryCode, scope: d?.scope });
  }

  @MessagePattern({ cmd: 'admin.pharmacy.updateSettings' })
  updateSettings(@Payload() d: AdminSettingsMsg) {
    // `countryCode` is stripped out of the body alongside `scope` and `actorId`:
    // it names the ROW to write, not a setting to store, and letting it through
    // would fail the unknown-key check on every market-scoped save.
    const { scope, actorId, countryCode, ...settings } = d ?? {};
    return this.admin.updateSettings(settings, actorId, scope, countryCode);
  }
}
