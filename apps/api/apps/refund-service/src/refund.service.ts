import { Injectable, Logger } from '@nestjs/common';
import { marketPredicate, normaliseMarket, requireMarket } from '@app/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

// ─── Refund Status ───────────────────────────────────────────────────────────
export enum RefundStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
  EXPIRED = 'EXPIRED',
}

export enum RefundReason {
  WRONG_ITEM = 'WRONG_ITEM',
  DAMAGED = 'DAMAGED',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  LATE_DELIVERY = 'LATE_DELIVERY',
  MISSING_ITEMS = 'MISSING_ITEMS',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  CANCELLED_BY_SELLER = 'CANCELLED_BY_SELLER',
  OTHER = 'OTHER',
}

export interface RefundRequest {
  id: string;
  orderId: string;
  /**
   * The market the refunded order was placed in.
   *
   * Without it the pending queue was the whole platform's, which is why the
   * gateway blunt-refused every region-locked admin rather than show one market
   * another's refunds under its own heading.
   *
   * Taken from the CALLER'S PAYLOAD at request time, not read from the order —
   * this service holds no order and speaks to no one who does. Nothing on the
   * platform calls `request_refund` yet, so nothing supplies it yet either;
   * whichever route eventually creates a refund has to resolve the order's
   * market and send it. Until then, and on any refund written before this field
   * existed, it is absent — and an unattributable refund is not a scoped
   * admin's to see.
   */
  regionCode?: string | null;
  userId: string;
  amount: number;
  reason: RefundReason | string;
  description?: string;
  items?: { itemId: string; quantity: number; amount: number }[];
  status: RefundStatus;
  isPartial: boolean;
  requestedAt: string;
  processedBy?: string;
  processedAt?: string;
  remarks?: string;
  expiresAt: string;
  statusHistory: { status: string; timestamp: string; actor?: string }[];
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private readonly REFUND_TTL = 86400 * 30; // 30 days
  private readonly EXPIRY_DAYS = 7;

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async healthCheck() {
    return { service: 'refund-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Request Full Refund ────────────────────────────────────────────────────
  async requestRefund(dto: {
    orderId: string;
    userId: string;
    amount: number;
    reason: RefundReason | string;
    description?: string;
    items?: { itemId: string; quantity: number; amount: number }[];
    /** The refunded order's market, resolved by the caller. */
    regionCode?: string | null;
  }) {
    // Check for duplicate refund request
    const existingRefunds = await this.getRefundsByOrder(dto.orderId);
    const pendingDuplicate = existingRefunds.refunds.find((r) =>
      [RefundStatus.PENDING, RefundStatus.UNDER_REVIEW].includes(r.status as RefundStatus),
    );
    if (pendingDuplicate) {
      return {
        success: false,
        reason: 'A pending refund request already exists for this order',
        existingRefundId: pendingDuplicate.id,
      };
    }

    const refundId = `RFD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isPartial = !!(dto.items && dto.items.length > 0);
    const expiresAt = new Date(Date.now() + this.EXPIRY_DAYS * 86400 * 1000).toISOString();

    const refund: RefundRequest = {
      id: refundId,
      orderId: dto.orderId,
      // Normalised on the way in, so the queue filter below is a plain
      // comparison and 'in', 'IN' and 'IN-MH' are not three markets in the
      // store. `null` when the caller resolved none: an unattributed refund is
      // an honest absence, and inventing a market here would put one market's
      // refund in another market's queue for good.
      regionCode: normaliseMarket(dto.regionCode ?? undefined) ?? null,
      userId: dto.userId,
      amount: isPartial
        ? dto.items!.reduce((sum, item) => sum + item.amount * item.quantity, 0)
        : dto.amount,
      reason: dto.reason,
      description: dto.description ?? '',
      items: dto.items ?? [],
      status: RefundStatus.PENDING,
      isPartial,
      requestedAt: new Date().toISOString(),
      expiresAt,
      statusHistory: [{ status: RefundStatus.PENDING, timestamp: new Date().toISOString() }],
    };

    // Store refund record
    await this.redis.setJson(`refund:${refundId}`, refund, this.REFUND_TTL);

    // Index by order ID for lookups
    await this.addToOrderRefundIndex(dto.orderId, refundId);

    // Index by user ID for user's refund history
    await this.addToUserRefundIndex(dto.userId, refundId);

    // Publish Kafka event
    await this.kafka.publish('refund.requested', {
      id: refundId,
      orderId: dto.orderId,
      userId: dto.userId,
      amount: refund.amount,
      isPartial,
    });

    this.logger.log(
      `Refund requested: ${refundId} for order ${dto.orderId} — ${refund.amount} (${isPartial ? 'partial' : 'full'})`,
    );
    return { success: true, refund };
  }

  // ── Process Refund (Admin) ─────────────────────────────────────────────────
  async processRefund(
    refundId: string,
    adminId: string,
    decision: 'APPROVED' | 'REJECTED',
    remarks?: string,
  ) {
    const refund = await this.redis.getJson<RefundRequest>(`refund:${refundId}`);
    if (!refund) {
      return { success: false, reason: 'Refund not found' };
    }

    if (refund.status !== RefundStatus.PENDING && refund.status !== RefundStatus.UNDER_REVIEW) {
      return { success: false, reason: `Cannot process refund in ${refund.status} status` };
    }

    // Check expiry
    if (new Date(refund.expiresAt) < new Date()) {
      await this.expireRefund(refundId);
      return { success: false, reason: 'Refund request has expired' };
    }

    const status = decision === 'APPROVED' ? RefundStatus.APPROVED : RefundStatus.REJECTED;
    const updated: RefundRequest = {
      ...refund,
      status,
      processedBy: adminId,
      processedAt: new Date().toISOString(),
      remarks: remarks ?? '',
      statusHistory: [
        ...refund.statusHistory,
        { status, timestamp: new Date().toISOString(), actor: adminId },
      ],
    };

    await this.redis.setJson(`refund:${refundId}`, updated, this.REFUND_TTL);

    if (decision === 'APPROVED') {
      // Trigger wallet credit via Kafka
      await this.kafka.publish('refund.approved', {
        id: refundId,
        orderId: refund.orderId,
        userId: refund.userId,
        amount: refund.amount,
      });
      this.logger.log(
        `Refund APPROVED: ${refundId} — ${refund.amount} credited to user ${refund.userId}`,
      );
    } else {
      await this.kafka.publish('refund.rejected', {
        id: refundId,
        orderId: refund.orderId,
        userId: refund.userId,
        remarks: remarks ?? '',
      });
      this.logger.log(`Refund REJECTED: ${refundId} — ${remarks}`);
    }

    return { success: true, refundId, status: decision };
  }

  // ── Escalate to Review ─────────────────────────────────────────────────────
  async escalateToReview(refundId: string, adminId: string, notes?: string) {
    const refund = await this.redis.getJson<RefundRequest>(`refund:${refundId}`);
    if (!refund) return { success: false, reason: 'Refund not found' };

    const updated = {
      ...refund,
      status: RefundStatus.UNDER_REVIEW,
      statusHistory: [
        ...refund.statusHistory,
        { status: RefundStatus.UNDER_REVIEW, timestamp: new Date().toISOString(), actor: adminId },
      ],
    };
    await this.redis.setJson(`refund:${refundId}`, updated, this.REFUND_TTL);
    return { success: true, refundId, status: RefundStatus.UNDER_REVIEW };
  }

  // ── Get Refund by ID ───────────────────────────────────────────────────────
  async getRefundById(refundId: string) {
    const refund = await this.redis.getJson<RefundRequest>(`refund:${refundId}`);
    if (!refund) return { success: false, reason: 'Refund not found' };
    return { success: true, ...refund };
  }

  // ── Get Refunds by Order ───────────────────────────────────────────────────
  async getRefundsByOrder(orderId: string) {
    const refundIds = (await this.redis.getJson<string[]>(`refund:index:order:${orderId}`)) ?? [];
    const refunds: RefundRequest[] = [];

    for (const id of refundIds) {
      const refund = await this.redis.getJson<RefundRequest>(`refund:${id}`);
      if (refund) refunds.push(refund);
    }

    return { orderId, refunds, total: refunds.length };
  }

  // ── Get Refunds by User ────────────────────────────────────────────────────
  async getRefundsByUser(userId: string, page = 1, limit = 20) {
    const refundIds = (await this.redis.getJson<string[]>(`refund:index:user:${userId}`)) ?? [];
    const refunds: RefundRequest[] = [];

    for (const id of refundIds) {
      const refund = await this.redis.getJson<RefundRequest>(`refund:${id}`);
      if (refund) refunds.push(refund);
    }

    // Sort by most recent
    refunds.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    const start = (page - 1) * limit;

    return {
      userId,
      data: refunds.slice(start, start + limit),
      total: refunds.length,
      page,
      limit,
      hasMore: refunds.length > start + limit,
    };
  }

  // ── Get Pending Refunds (Admin) ────────────────────────────────────────────
  /**
   * The admin refund queue, narrowed to the caller's market.
   *
   * `scope` is the gateway's lock, taken from the signed token; `region` is what
   * a global admin asked to filter on. BOTH are applied, by the same rule every
   * other admin list uses — the lock wins, and a requested market that is not a
   * market this platform knows is refused rather than dropped. Dropping either
   * one adds no filter at all: for a locked caller that is every market's
   * refunds behind their own market's heading, and for a global caller who
   * picked Qatar in the console it is every market's refunds under a Qatar
   * heading. The second is not a leak, but it is the same lie, and this handler
   * did exactly that — the gateway sent `region` and it was discarded by
   * construction.
   *
   * `status` narrows to one state. Absent, the answer is the decision queue:
   * PENDING and UNDER_REVIEW, the two an admin can still act on.
   *
   * Every filter sits inside the scan, before pagination: filtering a page after
   * slicing it returns a short page that reads as "this market has nothing".
   */
  async getPendingRefunds(page = 1, limit = 20, scope?: string, region?: string, status?: string) {
    const market = marketPredicate(
      scope,
      requireMarket(region, 'those refunds', this.logger),
      this.logger,
    );
    const wanted = status
      ? [String(status).trim().toUpperCase()]
      : [RefundStatus.PENDING as string, RefundStatus.UNDER_REVIEW as string];
    const decidable = new Set<string>([RefundStatus.PENDING, RefundStatus.UNDER_REVIEW]);
    const allKeys = await this.redis.scanKeys('refund:RFD-*');
    const pending: RefundRequest[] = [];

    for (const key of allKeys) {
      const refund = await this.redis.getJson<RefundRequest>(key);
      if (refund && wanted.includes(refund.status)) {
        // Auto-expire if past due — but only a refund still awaiting a decision.
        // Sweeping one that has already been approved or rejected would rewrite
        // a decision somebody took, which a read has no business doing.
        if (decidable.has(refund.status) && new Date(refund.expiresAt) < new Date()) {
          await this.expireRefund(refund.id);
          continue;
        }
        // A refund with no market belongs to no market: invisible to a scoped
        // admin, still there for a global one.
        if (market && normaliseMarket(refund.regionCode ?? undefined) !== market) continue;
        pending.push(refund);
      }
    }

    pending.sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
    const start = (page - 1) * limit;

    return {
      data: pending.slice(start, start + limit),
      total: pending.length,
      page,
      limit,
    };
  }

  // ── Refund Statistics (Admin Dashboard) ────────────────────────────────────
  async getRefundStats() {
    const allKeys = await this.redis.scanKeys('refund:RFD-*');
    let total = 0,
      pending = 0,
      approved = 0,
      rejected = 0,
      expired = 0;
    let totalAmount = 0,
      approvedAmount = 0;

    for (const key of allKeys) {
      const refund = await this.redis.getJson<RefundRequest>(key);
      if (!refund) continue;
      total++;
      totalAmount += refund.amount;
      if (refund.status === RefundStatus.PENDING || refund.status === RefundStatus.UNDER_REVIEW)
        pending++;
      if (refund.status === RefundStatus.APPROVED || refund.status === RefundStatus.PROCESSED) {
        approved++;
        approvedAmount += refund.amount;
      }
      if (refund.status === RefundStatus.REJECTED) rejected++;
      if (refund.status === RefundStatus.EXPIRED) expired++;
    }

    return {
      total,
      pending,
      approved,
      rejected,
      expired,
      totalAmount: Math.round(totalAmount * 100) / 100,
      approvedAmount: Math.round(approvedAmount * 100) / 100,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Private: Expire a Refund ───────────────────────────────────────────────
  private async expireRefund(refundId: string) {
    const refund = await this.redis.getJson<RefundRequest>(`refund:${refundId}`);
    if (!refund) return;

    const updated = {
      ...refund,
      status: RefundStatus.EXPIRED,
      statusHistory: [
        ...refund.statusHistory,
        { status: RefundStatus.EXPIRED, timestamp: new Date().toISOString(), actor: 'system' },
      ],
    };
    await this.redis.setJson(`refund:${refundId}`, updated, this.REFUND_TTL);
    this.logger.log(`Refund expired: ${refundId}`);
  }

  // ── Private: Order Refund Index ────────────────────────────────────────────
  private async addToOrderRefundIndex(orderId: string, refundId: string) {
    const key = `refund:index:order:${orderId}`;
    const ids = (await this.redis.getJson<string[]>(key)) ?? [];
    if (!ids.includes(refundId)) {
      ids.push(refundId);
      await this.redis.setJson(key, ids, this.REFUND_TTL);
    }
  }

  // ── Private: User Refund Index ─────────────────────────────────────────────
  private async addToUserRefundIndex(userId: string, refundId: string) {
    const key = `refund:index:user:${userId}`;
    const ids = (await this.redis.getJson<string[]>(key)) ?? [];
    ids.unshift(refundId);
    await this.redis.setJson(key, ids.slice(0, 200), this.REFUND_TTL);
  }
}
