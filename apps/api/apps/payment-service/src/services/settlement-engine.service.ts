import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, type SelectQueryBuilder } from 'typeorm';
import { KafkaProducerService } from '@app/kafka';
import { RedisService } from '@app/redis';
import { assertInMarket, normaliseMarket, refuseUnattributable } from '@app/common';
import * as crypto from 'crypto';
import {
  SettlementRecord,
  SettlementStatus,
  SettlementRecipientType,
} from '../entities/settlement-record.entity';
import { Payment, PaymentModule, PaymentStatus } from '../entities/payment.entity';

/**
 * SettlementEngineService — Calculates commission splits, generates settlement
 * records, and feeds the Super Admin dashboard with real-time financial data.
 *
 * Settlement flow:
 *  1. Payment verified → commission calculated → settlement record created
 *  2. Escrow released (order delivered) → settlement marked SETTLED
 *  3. Super Admin can view real-time revenue, commissions, and seller balances
 *  4. Franchise earnings are tracked as separate settlement records
 *
 * Commission rates per module:
 *   Marketplace: 12%  |  Grocery: 8%   |  Restaurant: 15%
 *   Pharmacy: 10%     |  Hotel: 15%    |  Taxi: 20%
 *   Doctor: 20%       |  Wallet: 0%
 */
@Injectable()
export class SettlementEngineService {
  private readonly logger = new Logger(SettlementEngineService.name);

  /** Commission rates per module (can be made dynamic via DB config) */
  private readonly COMMISSION_RATES: Record<string, number> = {
    [PaymentModule.MARKETPLACE]: 0.12,
    [PaymentModule.GROCERY]: 0.08,
    [PaymentModule.RESTAURANT]: 0.15,
    [PaymentModule.PHARMACY]: 0.1,
    [PaymentModule.HOTEL]: 0.15,
    [PaymentModule.TAXI]: 0.2,
    [PaymentModule.DOCTOR]: 0.2,
    [PaymentModule.WALLET_TOPUP]: 0,
  };

  /** Default franchise commission share (franchise gets X% of platform commission) */
  private readonly DEFAULT_FRANCHISE_SHARE_RATE = 0.3;

  constructor(
    @InjectRepository(SettlementRecord)
    private readonly settlementRepo: Repository<SettlementRecord>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly kafka: KafkaProducerService,
    private readonly redis: RedisService,
  ) {}

  // ── Settlement Record Generation ──────────────────────────────────────────

  /**
   * Generate settlement records for a completed payment.
   * Creates separate records for seller, platform, and franchise (if applicable).
   */
  async generateSettlementForPayment(paymentId: string): Promise<SettlementRecord[]> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found for settlement`);
      return [];
    }

    if (payment.module === PaymentModule.WALLET_TOPUP) {
      this.logger.log(`Skipping settlement for wallet top-up ${paymentId}`);
      return [];
    }

    const records: SettlementRecord[] = [];
    const amount = Number(payment.amount);
    const commissionRate = this.COMMISSION_RATES[payment.module] ?? 0.1;
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
    const taxOnCommission = Math.round(commissionAmount * 0.18 * 100) / 100; // GST on commission
    const period = this.getCurrentSettlementPeriod();

    // 1. Seller settlement record
    if (payment.sellerId) {
      let franchiseShareAmount = 0;
      let franchiseRate: number | null = null;

      // If franchise model, platform shares commission with franchise
      if (payment.franchiseId) {
        franchiseRate = this.DEFAULT_FRANCHISE_SHARE_RATE;
        franchiseShareAmount = Math.round(commissionAmount * franchiseRate * 100) / 100;
      }

      const netSellerAmount = Math.round((amount - commissionAmount) * 100) / 100;

      const sellerRecord = this.settlementRepo.create({
        settlementNumber: `STL-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        module: payment.module,
        orderId: payment.orderId ?? undefined,
        recipientType: this.getRecipientType(payment.module),
        recipientId: payment.sellerId,
        grossAmount: amount,
        commissionRate,
        commissionAmount,
        taxDeducted: taxOnCommission,
        netAmount: netSellerAmount,
        currency: payment.currency,
        countryCode: payment.countryCode,
        franchiseId: payment.franchiseId ?? undefined,
        // `DeepPartial` expresses absence as `undefined`, not `null`.
        franchiseCommissionRate: franchiseRate ?? undefined,
        franchiseShareAmount,
        status: SettlementStatus.PENDING,
        settlementPeriod: period,
      });
      records.push(await this.settlementRepo.save(sellerRecord));

      // 2. Franchise settlement record (if applicable)
      if (payment.franchiseId && franchiseShareAmount > 0) {
        const franchiseRecord = this.settlementRepo.create({
          settlementNumber: `STL-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          module: payment.module,
          orderId: payment.orderId ?? undefined,
          recipientType: SettlementRecipientType.FRANCHISE,
          recipientId: payment.franchiseId, // guarded by the `if` above
          grossAmount: commissionAmount,
          commissionRate: franchiseRate ?? undefined,
          commissionAmount: 0,
          taxDeducted: 0,
          netAmount: franchiseShareAmount,
          currency: payment.currency,
          countryCode: payment.countryCode,
          franchiseId: payment.franchiseId ?? undefined,
          franchiseCommissionRate: franchiseRate ?? undefined,
          franchiseShareAmount,
          status: SettlementStatus.PENDING,
          settlementPeriod: period,
        });
        records.push(await this.settlementRepo.save(franchiseRecord));
      }
    }

    // Publish settlement event
    await this.kafka.publish('settlement.created', {
      paymentId: payment.id,
      module: payment.module,
      records: records.map((r) => ({
        id: r.id,
        recipientType: r.recipientType,
        recipientId: r.recipientId,
        netAmount: r.netAmount,
      })),
    });

    // Update real-time dashboard cache
    await this.updateDashboardCache(payment);

    this.logger.log(
      `Settlement generated for ${payment.paymentNumber}: ` +
        `${records.length} record(s) | Commission: ${payment.currency} ${commissionAmount}`,
    );

    return records;
  }

  // ── Settlement Status Updates ─────────────────────────────────────────────

  async markSettled(paymentId: string): Promise<void> {
    await this.settlementRepo.update(
      { paymentId, status: SettlementStatus.PENDING },
      { status: SettlementStatus.SETTLED, settledAt: new Date() },
    );
    this.logger.log(`Settlement marked SETTLED for payment ${paymentId}`);
  }

  async markOnHold(paymentId: string, reason: string): Promise<void> {
    await this.settlementRepo.update(
      { paymentId },
      { status: SettlementStatus.ON_HOLD, failureReason: reason },
    );
  }

  // ── Admin Dashboard Queries ───────────────────────────────────────────────
  //
  // `countryCode` is the market the gateway resolved for the caller — their own
  // when they are region-locked, whatever they asked for when they are not.
  // Every leg of every query below applies it. Three of the four legs here used
  // to build a fresh query builder that ignored the filter entirely, so a
  // "Qatar" settlement dashboard showed Qatar totals above a module breakdown,
  // a status breakdown and a top-seller table drawn from every market.

  async getDashboardSummary(filters: {
    startDate?: string;
    endDate?: string;
    countryCode?: string;
  }) {
    const market = normaliseMarket(filters.countryCode);
    /** The market predicate, or a no-op for a global caller asking for all markets. */
    const inMarket = (qb: SelectQueryBuilder<SettlementRecord>) =>
      market ? qb.andWhere('s.countryCode = :cc', { cc: market }) : qb;

    const qb = this.settlementRepo
      .createQueryBuilder('s')
      .where('s.status != :excluded', { excluded: SettlementStatus.REVERSED });

    if (filters.startDate)
      qb.andWhere('s.createdAt >= :start', { start: new Date(filters.startDate) });
    if (filters.endDate) qb.andWhere('s.createdAt <= :end', { end: new Date(filters.endDate) });
    inMarket(qb);

    // Overall revenue
    const totals = await qb
      .clone()
      .select('COALESCE(SUM(s."grossAmount"), 0)', 'grossRevenue')
      .addSelect('COALESCE(SUM(s."commissionAmount"), 0)', 'totalCommission')
      .addSelect('COALESCE(SUM(s."netAmount"), 0)', 'totalSellerPayouts')
      .addSelect('COALESCE(SUM(s."franchiseShareAmount"), 0)', 'totalFranchisePayouts')
      .addSelect('COALESCE(SUM(s."taxDeducted"), 0)', 'totalTax')
      .addSelect('COUNT(s.id)', 'totalSettlements')
      .getRawOne();

    // Per-module breakdown
    const moduleBreakdown = await inMarket(
      this.settlementRepo
        .createQueryBuilder('s')
        .select('s.module', 'module')
        .addSelect('COALESCE(SUM(s."grossAmount"), 0)', 'grossRevenue')
        .addSelect('COALESCE(SUM(s."commissionAmount"), 0)', 'commission')
        .addSelect('COALESCE(SUM(s."netAmount"), 0)', 'sellerPayouts')
        .addSelect('COALESCE(SUM(s."franchiseShareAmount"), 0)', 'franchisePayouts')
        .addSelect('COUNT(s.id)', 'settlements')
        .where('s."recipientType" != :platform', { platform: SettlementRecipientType.PLATFORM }),
    )
      .groupBy('s.module')
      .getRawMany();

    // Pending vs settled
    const statusBreakdown = await inMarket(
      this.settlementRepo
        .createQueryBuilder('s')
        .select('s.status', 'status')
        .addSelect('COUNT(s.id)', 'count')
        .addSelect('COALESCE(SUM(s."netAmount"), 0)', 'amount'),
    )
      .groupBy('s.status')
      .getRawMany();

    // Top sellers by commission
    const topSellers = await inMarket(
      this.settlementRepo
        .createQueryBuilder('s')
        .select('s."recipientId"', 'sellerId')
        .addSelect('s."recipientName"', 'sellerName')
        .addSelect('COALESCE(SUM(s."grossAmount"), 0)', 'grossRevenue')
        .addSelect('COALESCE(SUM(s."commissionAmount"), 0)', 'commission')
        .addSelect('COALESCE(SUM(s."netAmount"), 0)', 'netPayout')
        .where('s."recipientType" IN (:...types)', {
          types: [
            SettlementRecipientType.SELLER,
            SettlementRecipientType.DOCTOR,
            SettlementRecipientType.HOTEL_OWNER,
          ],
        }),
    )
      .groupBy('s."recipientId"')
      .addGroupBy('s."recipientName"')
      .orderBy('COALESCE(SUM(s."grossAmount"), 0)', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      totals: {
        grossRevenue: Number(totals.grossRevenue),
        totalCommission: Number(totals.totalCommission),
        totalSellerPayouts: Number(totals.totalSellerPayouts),
        totalFranchisePayouts: Number(totals.totalFranchisePayouts),
        totalTax: Number(totals.totalTax),
        netPlatformRevenue: Number(totals.totalCommission) - Number(totals.totalFranchisePayouts),
        totalSettlements: Number(totals.totalSettlements),
      },
      moduleBreakdown,
      statusBreakdown,
      topSellers,
    };
  }

  /**
   * One recipient's balance, in one market.
   *
   * The market is not a display filter here — it is the authorisation. A
   * settlement recipient has no row of its own in this service, so "is this
   * seller in the caller's market?" is answered by the markets their own
   * settlement rows carry. A region-locked admin asking about a recipient with
   * no row in their market is refused (audit V8, §13 X-24) rather than handed a
   * zeroed balance, which reads as "this seller has earned nothing" instead of
   * "this seller is not yours". A recipient with no rows at all cannot be
   * attributed to any market yet, and fails closed the same way.
   */
  async getSellerBalance(sellerId: string, market?: string, scope?: string) {
    const lock = normaliseMarket(scope);
    if (lock) await this.assertRecipientInMarket('recipientId', sellerId, scope, 'seller balance');

    const qb = this.settlementRepo
      .createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('COALESCE(SUM(s."netAmount"), 0)', 'total')
      .where('s."recipientId" = :sellerId', { sellerId });
    const cc = normaliseMarket(market);
    if (cc) qb.andWhere('s.countryCode = :cc', { cc });
    const stats = await qb.groupBy('s.status').getRawMany();

    const pending = Number(stats.find((s) => s.status === SettlementStatus.PENDING)?.total || 0);
    const settled = Number(stats.find((s) => s.status === SettlementStatus.SETTLED)?.total || 0);
    const onHold = Number(stats.find((s) => s.status === SettlementStatus.ON_HOLD)?.total || 0);

    return { sellerId, pending, settled, onHold, totalEarned: pending + settled + onHold };
  }

  /** One franchise's earnings, in one market — authorised exactly as the balance above. */
  async getFranchiseEarnings(franchiseId: string, market?: string, scope?: string) {
    const lock = normaliseMarket(scope);
    if (lock) {
      await this.assertRecipientInMarket('franchiseId', franchiseId, scope, 'franchise earnings');
    }

    const qb = this.settlementRepo
      .createQueryBuilder('s')
      .select('s.module', 'module')
      .addSelect('COALESCE(SUM(s."franchiseShareAmount"), 0)', 'earnings')
      .addSelect('COUNT(s.id)', 'transactions')
      .where('s."franchiseId" = :franchiseId', { franchiseId })
      .andWhere('s."recipientType" = :type', { type: SettlementRecipientType.FRANCHISE });
    const cc = normaliseMarket(market);
    if (cc) qb.andWhere('s.countryCode = :cc', { cc });
    const earnings = await qb.groupBy('s.module').getRawMany();

    const total = earnings.reduce((sum: number, e: any) => sum + Number(e.earnings), 0);

    return { franchiseId, total, byModule: earnings };
  }

  /**
   * One day's payments against one day's settlements, in one market.
   *
   * Both legs take the market or neither does: a discrepancy computed from one
   * market's payments and every market's settlements is not a discrepancy, it
   * is arithmetic on unrelated numbers.
   */
  async getReconciliationReport(date: string, market?: string) {
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59Z`);
    const cc = normaliseMarket(market);

    const payments = await this.paymentRepo.find({
      where: {
        createdAt: Between(startOfDay, endOfDay),
        status: PaymentStatus.ESCROW_HOLD,
        ...(cc ? { countryCode: cc } : {}),
      },
    });

    const settlements = await this.settlementRepo.find({
      where: {
        createdAt: Between(startOfDay, endOfDay),
        ...(cc ? { countryCode: cc } : {}),
      },
    });

    const paymentTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const settlementTotal = settlements.reduce((sum, s) => sum + Number(s.grossAmount), 0);
    const discrepancy = Math.abs(paymentTotal - settlementTotal);

    return {
      date,
      payments: { count: payments.length, total: paymentTotal },
      settlements: { count: settlements.length, total: settlementTotal },
      discrepancy,
      isBalanced: discrepancy < 0.01,
      countryCode: cc ?? null,
    };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Refuse a region-locked caller a settlement recipient that is not theirs.
   *
   * `column` is `recipientId` or `franchiseId` — both are literals written here,
   * never caller input, because they are interpolated into the SQL identifier.
   * The markets come from the recipient's own rows: this service owns no seller
   * or franchise table, so the rows it settled for them are the record of where
   * they trade. Every market they appear in must be the caller's; a recipient
   * spanning two markets is refused rather than partially disclosed, and one
   * with no rows at all is unattributable and refused too.
   */
  private async assertRecipientInMarket(
    column: 'recipientId' | 'franchiseId',
    id: string,
    scope: string | undefined,
    what: string,
  ): Promise<void> {
    const rows = await this.settlementRepo
      .createQueryBuilder('s')
      .select('DISTINCT s."countryCode"', 'countryCode')
      .where(`s."${column}" = :id`, { id })
      .getRawMany<{ countryCode: string | null }>();

    if (rows.length === 0) {
      refuseUnattributable(scope, what, this.logger);
      return;
    }
    for (const row of rows) {
      assertInMarket(row.countryCode, scope, what, this.logger);
    }
  }

  private getRecipientType(module: PaymentModule): SettlementRecipientType {
    const map: Record<string, SettlementRecipientType> = {
      [PaymentModule.DOCTOR]: SettlementRecipientType.DOCTOR,
      [PaymentModule.HOTEL]: SettlementRecipientType.HOTEL_OWNER,
      [PaymentModule.TAXI]: SettlementRecipientType.DRIVER,
    };
    return map[module] || SettlementRecipientType.SELLER;
  }

  private getCurrentSettlementPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getISOWeek(now);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  private getISOWeek(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    );
  }

  private async updateDashboardCache(payment: Payment): Promise<void> {
    try {
      const key = `dashboard:revenue:${payment.module}`;
      const cached = await this.redis.getJson<{ total: number; count: number }>(key);
      const current = cached || { total: 0, count: 0 };
      current.total += Number(payment.platformCommission);
      current.count += 1;
      await this.redis.setJson(key, current, 300);
    } catch (err) {
      this.logger.warn(`Dashboard cache update failed: ${(err as any).message}`);
    }
  }
}
