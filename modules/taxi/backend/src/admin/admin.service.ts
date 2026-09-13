import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  applyMarketFilter,
  marketPredicate,
  requireMarket,
  requireUuid,
  requireValue,
} from '@app/common';

import { TaxiVendorEntity } from '../entities/taxi-vendor.entity';
import { TaxiDriverEntity } from '../entities/taxi-driver.entity';
import { TaxiDocumentEntity } from '../entities/taxi-document.entity';
import { VendorManagementService } from '../services/vendor-management.service';
import { DriverOnboardingService } from '../services/driver-onboarding.service';
import { TaxiPayoutService } from '../services/taxi-payout.service';
import type { AdminIdMsg, AdminPendingApprovalsMsg, AdminSuspendVendorMsg } from './dto/admin.dto';

/** The vendor states that put an operator in the approvals queue. */
const VENDORS_AWAITING_DECISION = ['pending'] as const;

/**
 * The driver states that put a driver in the approvals queue.
 *
 * `onboarding` is in the list and `pending` is not enough on its own:
 * `recalculateOnboardingProgress` moves a driver from `pending` to `onboarding`
 * the moment their last required document is approved, and THAT is the state in
 * which a human decision is owed. A queue that showed only `pending` would hide
 * every driver who had finished their paperwork — the ones actually waiting.
 */
const DRIVERS_AWAITING_DECISION = ['pending', 'onboarding'] as const;

/** Document states that are still somebody's to review. */
const DOCUMENTS_AWAITING_REVIEW = ['pending', 'under_review'] as const;

/**
 * The taxi admin console's backend — the seven commands M7 owns.
 *
 * ── What this service is, and what it deliberately is not ───────────────────
 *
 * It is the SCOPE boundary and nothing else. The implementations these seven
 * commands need already existed — `VendorManagementService`,
 * `DriverOnboardingService` and `TaxiPayoutService` have held them since the
 * module was extracted — so this class does not reimplement them. What was
 * missing was a `@MessagePattern` to reach them by and a market check on the
 * way, which is exactly the situation hotel was in at M5.
 *
 * Each method here resolves the caller's market, turns an RPC payload into the
 * arguments a service method takes, and delegates. The assertion itself lives
 * INSIDE those service methods (`getVendorOrFail`, `approveDriver`,
 * `getDriverById`, `approvePayout`), not here, so that every path into a taxi
 * decision is covered by one check — the TCP handlers M7 added AND the
 * `/admin/*` routes on this service's own HTTP port, which are a second,
 * unscoped admin surface until M8 closes it.
 *
 * `getPendingApprovals` is the one genuinely new read: nothing in this module
 * answered "who is waiting on a decision in my market", and assembling it from
 * three separate lists in the console would have meant three chances to forget
 * the predicate.
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * `countryCode`, ISO-2, NOT NULL on all three tables — this is the one vertical
 * in the plan that needed no market column added. A driver carries their own
 * market rather than inheriting the vendor's, which matters because an
 * independent driver has no vendor: there is nothing to fall back to and
 * nothing to widen.
 *
 * ── Why the predicate, never a post-filter ──────────────────────────────────
 *
 * Filtering after `take(limit)` returns a short page that reads as "this market
 * has nobody waiting", which is indistinguishable from a leak in the other
 * direction. Every market clause here is written by `applyMarketFilter`
 * (`@app/common`), the single implementation of that clause on the platform.
 */
@Injectable()
export class TaxiAdminService {
  private readonly logger = new Logger(TaxiAdminService.name);

  constructor(
    @InjectRepository(TaxiVendorEntity)
    private readonly vendorRepo: Repository<TaxiVendorEntity>,
    @InjectRepository(TaxiDriverEntity)
    private readonly driverRepo: Repository<TaxiDriverEntity>,
    @InjectRepository(TaxiDocumentEntity)
    private readonly documentRepo: Repository<TaxiDocumentEntity>,
    private readonly vendors: VendorManagementService,
    private readonly onboarding: DriverOnboardingService,
    private readonly payouts: TaxiPayoutService,
  ) {}

  // ── Shared scope plumbing ──────────────────────────────────────────────────
  //
  // Every handler below is `async` even where it does nothing but delegate.
  // `requireUuid`/`requireValue` throw SYNCHRONOUSLY, and a sync throw out of a
  // method whose caller is awaiting a promise is a rejection the caller never
  // sees as one — the spec that asserts "a malformed id is a 400" would fail on
  // the call expression rather than on the assertion. `async` turns all of them
  // into rejections, which is also what `RpcAwareExceptionsFilter` expects.

  /**
   * The market this request may read, resolved once.
   *
   * The LOCK (`scope`, written only by the gateway, only from the token) wins
   * over whatever the request asked for. `requireMarket` wraps the requested
   * slot so an unreadable `?countryCode=` is a refusal rather than an absent
   * predicate — absent means every market, which is the direction that leaks.
   */
  private market(scope?: string, requested?: string, what = 'market'): string | undefined {
    return marketPredicate(scope, requireMarket(requested, what, this.logger), this.logger);
  }

  /** A queue page size: at least one row, at most a hundred. */
  private queueLimit(limit?: number): number {
    return Math.min(Math.max(Number(limit) || 20, 1), 100);
  }

  // ── Vendors ────────────────────────────────────────────────────────────────

  /**
   * One vendor, with the fleet and document figures the console shows beside it.
   *
   * `getVendorDashboard` is the existing read and it returns `{ vendor, stats }`
   * — the vendor row (with its drivers and its polymorphic documents attached)
   * and the seven counts. The market is asserted on the loaded row inside it, so
   * a vendor in another market is a 403 carrying the backend copy, a vendor id
   * that is not here is a 404, and a malformed one is a 400.
   */
  async getVendorDetail(d: AdminIdMsg) {
    return this.vendors.getVendorDashboard(requireUuid(d?.id, 'vendor'), d?.scope);
  }

  /** Approve one vendor, in the caller's own market, with the actor recorded. */
  async approveVendor(d: AdminIdMsg) {
    return this.vendors.approveVendor(
      requireUuid(d?.id, 'vendor'),
      requireValue(d?.actorId, 'actorId'),
      d?.scope,
    );
  }

  /**
   * Suspend one vendor.
   *
   * The reason is required rather than defaulted: it is stored on the row and it
   * is the only explanation an operator taken off the road ever sees, so a
   * suspension with an empty one is a decision nobody can answer for. The actor
   * is required for the same reason and is stored beside it as of M7
   * (`taxi_vendors.suspendedBy`).
   */
  async suspendVendor(d: AdminSuspendVendorMsg) {
    return this.vendors.suspendVendor(
      requireUuid(d?.id, 'vendor'),
      requireValue(d?.actorId, 'actorId'),
      requireValue(d?.reason, 'reason'),
      d?.scope,
    );
  }

  // ── Drivers ────────────────────────────────────────────────────────────────

  /** One driver, with their vendor and their documents. */
  async getDriverDetail(d: AdminIdMsg) {
    return this.onboarding.getDriverById(requireUuid(d?.id, 'driver'), d?.scope);
  }

  /** Approve one driver, in the caller's own market, with the actor recorded. */
  async approveDriver(d: AdminIdMsg) {
    return this.onboarding.approveDriver(
      requireUuid(d?.id, 'driver'),
      requireValue(d?.actorId, 'actorId'),
      d?.scope,
    );
  }

  // ── Payouts ────────────────────────────────────────────────────────────────

  /**
   * Approve one payout — and refuse rather than report a no-op.
   *
   * See `TaxiPayoutService.approvePayout` for why this is not the batch method
   * with a one-element array: that one answers "0 rows changed" for a payout
   * that was already settled, which the console renders as a successful approval
   * of money that never moved.
   */
  async approvePayout(d: AdminIdMsg) {
    return this.payouts.approvePayout(
      requireUuid(d?.id, 'payout'),
      requireValue(d?.actorId, 'actorId'),
      d?.scope,
    );
  }

  // ── The onboarding queue ───────────────────────────────────────────────────

  /**
   * Everyone waiting on a decision in the caller's market.
   *
   * Three queues in one read — vendors awaiting approval, drivers awaiting
   * approval, and the documents behind them — because that is how the console
   * screen is laid out and because assembling it from three separate calls is
   * three chances to forget the predicate.
   *
   * Each leg carries the market clause independently. Vendors and drivers filter
   * on their own `countryCode`; documents have no market column of their own
   * (polymorphic ownership — see `TaxiDocumentEntity`) and are attributed
   * through whichever driver or vendor owns them, joined through the ENTITY
   * classes rather than a bare table string, which would silently match one of
   * the `public.*` decoy tables instead of the real `taxi.*` ones. `d.ownerId`
   * is `character varying` while `drv.id`/`ven.id` are `uuid`, so the uuid side
   * is cast to text: comparing them directly is a Postgres type error, not a
   * silent non-match.
   *
   * A half-scoped queue is worse than none — it looks like the market's own
   * backlog while one of the three counts is every market's.
   */
  async getPendingApprovals(d: AdminPendingApprovalsMsg) {
    const market = this.market(d?.scope, d?.countryCode, 'that queue');
    const limit = this.queueLimit(d?.limit);

    const vendorsQb = this.vendorRepo
      .createQueryBuilder('v')
      .where('v.status IN (:...awaiting)', { awaiting: [...VENDORS_AWAITING_DECISION] });
    applyMarketFilter(vendorsQb, 'v.countryCode', market);

    const driversQb = this.driverRepo
      .createQueryBuilder('d')
      .leftJoin('d.vendor', 'vendor')
      .addSelect(['vendor.id', 'vendor.name'])
      .where('d.status IN (:...awaiting)', { awaiting: [...DRIVERS_AWAITING_DECISION] });
    applyMarketFilter(driversQb, 'd.countryCode', market);

    const documentsQb = this.documentRepo
      .createQueryBuilder('doc')
      .leftJoin(TaxiDriverEntity, 'drv', "doc.ownerType = 'driver' AND drv.id::text = doc.ownerId")
      .leftJoin(TaxiVendorEntity, 'ven', "doc.ownerType = 'vendor' AND ven.id::text = doc.ownerId")
      .where('doc.status IN (:...awaiting)', { awaiting: [...DOCUMENTS_AWAITING_REVIEW] });
    applyMarketFilter(documentsQb, 'COALESCE(drv.countryCode, ven.countryCode)', market);

    const [[vendors, vendorCount], [drivers, driverCount], documentCount] = await Promise.all([
      vendorsQb
        .orderBy('v.createdAt', 'ASC') // Oldest first: this is a queue, not a feed.
        // Ties broken on the primary key so two vendors registered in the same
        // millisecond cannot swap places between two reads of the same page.
        .addOrderBy('v.id', 'ASC')
        .take(limit)
        .getManyAndCount(),
      driversQb
        .orderBy('d.createdAt', 'ASC')
        .addOrderBy('d.id', 'ASC')
        .take(limit)
        .getManyAndCount(),
      documentsQb.getCount(),
    ]);

    return {
      market: market ?? null,
      limit,
      vendors,
      drivers,
      counts: {
        vendors: vendorCount,
        drivers: driverCount,
        documents: documentCount,
        total: vendorCount + driverCount,
      },
    };
  }
}
