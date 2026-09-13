import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { requireId, RpcAwareExceptionsFilter } from '@app/common';
import { RestaurantAdminService } from './admin.service';
import { RestaurantService } from '../restaurant.service';
import type {
  AdminAnalyticsMsg,
  AdminCommissionMsg,
  AdminCuisineMsg,
  AdminIdMsg,
  AdminListMsg,
  AdminOrderListMsg,
  AdminResolveComplaintMsg,
  AdminSuspendMsg,
  AdminZoneMsg,
} from './dto/admin.dto';

/**
 * Every `admin.restaurant.*` command the gateway sends, in one file.
 *
 * The census that produced this list (M4): `admin-restaurant.controller.ts`
 * sends SEVENTEEN distinct commands. Four had a `@MessagePattern` — `list`,
 * `approve`, `suspend` and `cuisines`, which used to sit at the bottom of
 * `restaurant.controller.ts`. The other thirteen had none anywhere in the
 * module, so every restaurant console screen but Restaurants and Cuisines
 * answered 503 (and, before M2 removed the gateway's fallbacks, a fabricated
 * empty success). The four that existed moved here, so the file a reader opens
 * to check the contract holds all seventeen rather than four of them.
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
 * There is no `@Get`/`@Post` in this class: the base path exists so the module's
 * route table reads sensibly, and the only transport is TCP.
 *
 * ── Where each command is served ────────────────────────────────────────────
 *
 * Four delegate to `RestaurantService` because a correct, market-asserting
 * implementation already existed there and a second copy of a decision is how
 * two code paths come to disagree about who may make it: `approve`, `suspend`,
 * `cuisines`, and the restaurant list's predicate (reached through
 * `RestaurantAdminService.listRestaurants`, which adds the market RESOLUTION the
 * old pattern's `d?.scope ?? d?.countryCode` collapsed into one slot). The rest
 * are new work and live in `RestaurantAdminService`.
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller('admin')
export class RestaurantAdminController {
  constructor(
    private readonly admin: RestaurantAdminService,
    private readonly svc: RestaurantService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.dashboard' })
  dashboard(@Payload() d: AdminListMsg) {
    return this.admin.getDashboard({ region: d?.countryCode, scope: d?.scope });
  }

  // ── Restaurants ────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.list' })
  list(@Payload() d: AdminListMsg) {
    return this.admin.listRestaurants({
      page: d?.page,
      limit: d?.limit,
      status: d?.status,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.restaurant.get' })
  get(@Payload() d: AdminIdMsg) {
    return this.admin.getRestaurant(requireId(d?.id, 'restaurant'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.restaurant.approve' })
  approve(@Payload() d: AdminIdMsg) {
    return this.svc.approveRestaurant(
      requireId(d?.id, 'restaurant'),
      requireId(d?.actorId, 'admin'),
      d?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin.restaurant.suspend' })
  suspend(@Payload() d: AdminSuspendMsg) {
    return this.svc.suspendRestaurant(requireId(d?.id, 'restaurant'), d?.scope, {
      reason: d?.reason,
      actorId: d?.actorId,
    });
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.orders' })
  orders(@Payload() d: AdminOrderListMsg) {
    return this.admin.listOrders({
      page: d?.page,
      limit: d?.limit,
      status: d?.status,
      type: d?.type,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  // ── Menu approvals ─────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.menuApprovals' })
  menuApprovals(@Payload() d: AdminListMsg) {
    return this.admin.listMenuApprovals({
      page: d?.page,
      limit: d?.limit,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.restaurant.approveMenu' })
  approveMenu(@Payload() d: AdminIdMsg) {
    return this.admin.approveMenuItem(requireId(d?.id, 'menu item'), d?.actorId, d?.scope);
  }

  // ── Complaints ─────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.complaints' })
  complaints(@Payload() d: AdminListMsg) {
    return this.admin.listComplaints({
      page: d?.page,
      limit: d?.limit,
      status: d?.status,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.restaurant.resolveComplaint' })
  resolveComplaint(@Payload() d: AdminResolveComplaintMsg) {
    return this.admin.resolveComplaint(
      requireId(d?.id, 'complaint'),
      d?.resolution ?? '',
      d?.actorId,
      d?.scope,
    );
  }

  // ── Money ──────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.commissions' })
  commissions(@Payload() d: AdminListMsg) {
    return this.admin.getCommissions({
      page: d?.page,
      limit: d?.limit,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.restaurant.updateCommissions' })
  updateCommissions(@Payload() d: AdminCommissionMsg) {
    return this.admin.updateCommissions(
      { restaurantId: d?.restaurantId, commissionRate: d?.commissionRate },
      d?.actorId,
      d?.scope,
    );
  }

  // ── Cuisines ───────────────────────────────────────────────────────────────

  /**
   * Deliberately unfiltered: the cuisine catalogue is one list for the whole
   * platform, and it is `RestaurantService.getCuisines` — the same method the
   * storefront calls — so the admin screen and the shopper's filter can never
   * be looking at two different lists.
   */
  @MessagePattern({ cmd: 'admin.restaurant.cuisines' })
  cuisines() {
    return this.svc.getCuisines();
  }

  @MessagePattern({ cmd: 'admin.restaurant.createCuisine' })
  createCuisine(@Payload() d: AdminCuisineMsg) {
    const { scope, actorId, ...body } = d ?? {};
    return this.admin.createCuisine(body, actorId, scope);
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.analytics' })
  analytics(@Payload() d: AdminAnalyticsMsg) {
    return this.admin.getAnalytics({
      period: d?.period,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  // ── Delivery zones ─────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.restaurant.zones' })
  zones(@Payload() d: AdminListMsg) {
    return this.admin.listZones({
      page: d?.page,
      limit: d?.limit,
      region: d?.countryCode,
      scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin.restaurant.createZone' })
  createZone(@Payload() d: AdminZoneMsg) {
    // `countryCode` is stripped out of the body alongside `scope` and `actorId`:
    // it names the MARKET the zone belongs to, not a column the body may set,
    // and the service resolves it against the caller's lock before writing.
    const { scope, actorId, countryCode, ...body } = d ?? {};
    return this.admin.createZone(body, actorId, scope, countryCode);
  }
}
