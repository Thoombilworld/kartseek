import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerWallet } from './entities/seller-wallet.entity';
import { Payout } from './entities/payout.entity';

// ─── Payout Status ───────────────────────────────────────────────────────────
export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PayoutMethod {
  BANK = 'bank',
    PAYPAL = 'paypal',
  UPI = 'upi',
}

export interface PayoutRecord {
  id: string;
  sellerId: string;
  amount: number;
  method: PayoutMethod;
  bankAccount?: string;
  ifscCode?: string;
  upiId?: string;
  status: PayoutStatus;
  requestedAt: string;
  processedBy?: string;
  processedAt?: string;
  failureReason?: string;
  transactionRef?: string;
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly PAYOUT_TTL = 86400 * 90; // 90 days

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(SellerWallet) private readonly walletRepo: Repository<SellerWallet>,
    // Payouts are financial records. They used to live only in Redis under a
    // 90-day TTL, so the history of money paid to a seller deleted itself.
    @InjectRepository(Payout) private readonly payoutRepo: Repository<Payout>,
  ) {}

  /** Present a row in the shape callers already expect. */
  private toRecord(row: Payout): PayoutRecord {
    return {
      id: row.id,
      sellerId: row.sellerId,
      amount: Number(row.amount),
      method: row.method as PayoutMethod,
      bankAccount: row.bankAccount ?? undefined,
      ifscCode: row.ifscCode ?? undefined,
      upiId: row.upiId ?? undefined,
      status: row.status as PayoutStatus,
      requestedAt: row.requestedAt?.toISOString?.() ?? String(row.requestedAt),
      processedBy: row.processedBy ?? undefined,
      processedAt: row.processedAt?.toISOString?.() ?? undefined,
      failureReason: row.failureReason ?? undefined,
      transactionRef: row.transactionRef ?? undefined,
    };
  }

  async healthCheck() {
    return { service: 'payout-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Create Payout Request ──────────────────────────────────────────────────
  async createPayoutRequest(dto: {
    sellerId: string;
    amount: number;
    bankAccount?: string;
    ifscCode?: string;
    upiId?: string;
    method: PayoutMethod;
  }) {
    // Verify seller has sufficient available balance
    const wallet = await this.getOrCreateWallet(dto.sellerId);
    if (Number(wallet.availableBalance) < dto.amount) {
      return {
        success: false,
        reason: `Insufficient available balance. Available: ${wallet.availableBalance}, Requested: ${dto.amount}`,
      };
    }

    // Check for minimum payout amount
    const minPayout = 100; // INR 100 minimum
    if (dto.amount < minPayout) {
      return { success: false, reason: `Minimum payout amount is ${minPayout}` };
    }

    const payoutId = `PAYOUT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const payout: PayoutRecord = {
      id: payoutId,
      sellerId: dto.sellerId,
      amount: dto.amount,
      method: dto.method,
      bankAccount: dto.bankAccount,
      ifscCode: dto.ifscCode,
      upiId: dto.upiId,
      status: PayoutStatus.PENDING,
      requestedAt: new Date().toISOString(),
    };

    // Deduct from available balance and hold in pending
    wallet.availableBalance = Number(wallet.availableBalance) - dto.amount;
    await this.walletRepo.save(wallet);

    // Durable record. The Redis keys and the two hand-maintained index keys
    // (`payout:index:seller:*`, `payout:queue:pending`) are gone: indexes on the
    // table do that job and cannot drift out of sync with the records.
    await this.payoutRepo.save(this.payoutRepo.create({
      id: payoutId,
      sellerId: dto.sellerId,
      amount: dto.amount,
      method: dto.method,
      bankAccount: dto.bankAccount ?? null,
      ifscCode: dto.ifscCode ?? null,
      upiId: dto.upiId ?? null,
      status: PayoutStatus.PENDING,
    }));

    // Publish event
    await this.kafka.publish('payout.requested', {
      id: payoutId,
      sellerId: dto.sellerId,
      amount: dto.amount,
      method: dto.method,
    });

    this.logger.log(`Payout requested: ${payoutId} for seller ${dto.sellerId} — ${dto.amount} via ${dto.method}`);
    return { success: true, payout };
  }

  // ── Approve Payout (Admin) ─────────────────────────────────────────────────
  async approvePayout(payoutId: string, adminId: string) {
    const row = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!row) return { success: false, reason: 'Payout not found' };
    if (row.status !== PayoutStatus.PENDING) {
      return { success: false, reason: `Cannot approve payout in ${row.status} status` };
    }

    row.status = PayoutStatus.APPROVED;
    row.processedBy = adminId;
    await this.payoutRepo.save(row);

    await this.kafka.publish('payout.approved', { id: payoutId, adminId });
    return { success: true, payoutId, status: PayoutStatus.APPROVED };
  }

  // ── Process Payout (Execute Payment) ───────────────────────────────────────
  async processPayout(payoutId: string, adminId?: string) {
    const row = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!row) return { success: false, reason: 'Payout not found' };
    if (row.status !== PayoutStatus.APPROVED) {
      return { success: false, reason: `Cannot process payout in ${row.status} status` };
    }
    const payout = this.toRecord(row);

    row.status = PayoutStatus.PROCESSING;
    await this.payoutRepo.save(row);

    try {
      // Execute payment based on method
      const txnRef = await this.executePayment(payout);

      row.status = PayoutStatus.PROCESSED;
      row.processedAt = new Date();
      row.transactionRef = txnRef;
      row.failureReason = null;
      await this.payoutRepo.save(row);

      await this.kafka.publish('payout.processed', {
        id: payoutId,
        sellerId: payout.sellerId,
        amount: payout.amount,
        transactionRef: txnRef,
      });

      // Send notification to seller
      await this.kafka.publish('notification.send', {
        userId: payout.sellerId,
        title: 'Payout Processed',
        body: `Your payout of ${payout.amount} has been processed. Reference: ${txnRef}`,
        type: 'payment',
      });

      this.logger.log(`Payout PROCESSED: ${payoutId} — ${payout.amount} → ${payout.sellerId} (by ${adminId ?? 'system'})`);
      return { success: true, payoutId, status: PayoutStatus.PROCESSED, transactionRef: txnRef };
    } catch (err) {
      // Mark as failed and return balance to seller
      row.status = PayoutStatus.FAILED;
      row.failureReason = (err as Error).message;
      row.processedAt = new Date();
      await this.payoutRepo.save(row);

      // Return balance to seller
      const wallet = await this.getOrCreateWallet(payout.sellerId);
      wallet.availableBalance = Number(wallet.availableBalance) + payout.amount;
      await this.walletRepo.save(wallet);

      this.logger.error(`Payout FAILED: ${payoutId} — ${(err as Error).message}`);
      return { success: false, payoutId, status: PayoutStatus.FAILED, reason: (err as Error).message };
    }
  }

  // ── Batch Approve Payouts ──────────────────────────────────────────────────
  async approvePayoutBatch(payoutIds: string[], adminId: string) {
    const results: any[] = [];
    for (const id of payoutIds) {
      const result = await this.approvePayout(id, adminId);
      results.push({ payoutId: id, ...result });
    }
    return { success: true, processed: results.length, results };
  }

  // ── Batch Process Payouts ──────────────────────────────────────────────────
  async processPayoutBatch(payoutIds: string[]) {
    const results: any[] = [];
    for (const id of payoutIds) {
      const result = await this.processPayout(id);
      results.push({ payoutId: id, ...result });
    }
    return { success: true, processed: results.length, results };
  }

  // ── Retry Failed Payout ────────────────────────────────────────────────────
  async retryPayout(payoutId: string) {
    const row = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!row) return { success: false, reason: 'Payout not found' };
    if (row.status !== PayoutStatus.FAILED) {
      return { success: false, reason: 'Only failed payouts can be retried' };
    }
    const payout = this.toRecord(row);

    row.status = PayoutStatus.APPROVED;
    row.failureReason = null;
    await this.payoutRepo.save(row);

    // Re-deduct from wallet (was returned on failure)
    const wallet = await this.getOrCreateWallet(payout.sellerId);
    wallet.availableBalance = Number(wallet.availableBalance) - payout.amount;
    await this.walletRepo.save(wallet);

    return this.processPayout(payoutId);
  }

  // ── Get Payout by ID ───────────────────────────────────────────────────────
  async getPayoutById(payoutId: string) {
    const row = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!row) return { success: false, reason: 'Payout not found' };
    return { success: true, ...this.toRecord(row) };
  }

  /**
   * A seller's payout history.
   *
   * Was: read a Redis list of ids, then one `GET` per id, then sort and
   * paginate in memory — so a seller with 400 payouts cost 401 round trips, and
   * any record whose 90-day TTL had elapsed silently vanished from their
   * history while the id stayed in the index. One indexed query now.
   */
  async getSellerPayouts(sellerId: string, page = 1, limit = 20, status?: PayoutStatus) {
    const where: any = { sellerId };
    if (status) where.status = status;

    const [rows, total] = await this.payoutRepo.findAndCount({
      where,
      order: { requestedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const wallet = await this.getOrCreateWallet(sellerId);

    return {
      sellerId,
      wallet: {
        availableBalance: Number(wallet.availableBalance),
        escrowBalance: Number(wallet.escrowBalance),
      },
      data: rows.map((r) => this.toRecord(r)),
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  // ── Get Pending Payouts (Admin) ────────────────────────────────────────────
  async getPendingPayouts(page = 1, limit = 20) {
    const [rows, total] = await this.payoutRepo.findAndCount({
      where: { status: PayoutStatus.PENDING },
      // Oldest first: the admin queue is worked front to back.
      order: { requestedAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const { sum } = await this.payoutRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .getRawOne();

    return {
      data: rows.map((r) => this.toRecord(r)),
      total,
      totalAmount: Math.round(Number(sum ?? 0) * 100) / 100,
      page,
      limit,
    };
  }

  /**
   * Platform payout statistics.
   *
   * Was `KEYS payout:PAYOUT-*` followed by a `GET` per key — an O(n) scan that
   * blocks Redis for every other caller while it runs, and one that silently
   * under-counted as records aged out. Aggregated in the database instead.
   */
  async getPayoutStats() {
    const rows = await this.payoutRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'amount')
      .groupBy('p.status')
      .getRawMany();

    const countOf = (status: string) =>
      Number(rows.find((r) => r.status === status)?.count ?? 0);
    const amountOf = (status: string) =>
      Number(rows.find((r) => r.status === status)?.amount ?? 0);

    const total = rows.reduce((sum, r) => sum + Number(r.count ?? 0), 0);
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const processed = countOf(PayoutStatus.PROCESSED);

    return {
      total,
      pending: countOf(PayoutStatus.PENDING),
      processed,
      failed: countOf(PayoutStatus.FAILED),
      totalAmount: Math.round(totalAmount * 100) / 100,
      processedAmount: Math.round(amountOf(PayoutStatus.PROCESSED) * 100) / 100,
      successRate: total > 0 ? Math.round((processed / total) * 100) : 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Escrow Management ──────────────────────────────────────────────────────
  /**
   * The seller's wallet, created on first use.
   *
   * `findOne` then `save` is a check-then-act race: two calls for a seller with
   * no wallet yet both miss the SELECT and both INSERT, and the second dies on
   *
   *   QueryFailedError: duplicate key value violates unique constraint
   *   "PK_seller_wallets"
   *
   * Seen in the dev log when a portal opened two payout screens at once — every
   * caller here (payouts, escrow hold, release, payout request) funnels through
   * this method, so the whole payouts surface failed intermittently for exactly
   * the sellers who had never been paid.
   *
   * The insert is now idempotent: the database decides the winner, and a losing
   * race re-reads the row the winner wrote instead of throwing.
   */
  async getOrCreateWallet(sellerId: string) {
    const existing = await this.walletRepo.findOne({ where: { sellerId } });
    if (existing) return existing;

    await this.walletRepo
      .createQueryBuilder()
      .insert()
      .values({ sellerId, availableBalance: 0, escrowBalance: 0 })
      .orIgnore()          // ON CONFLICT DO NOTHING — the concurrent winner stands
      .execute();

    const wallet = await this.walletRepo.findOne({ where: { sellerId } });
    if (!wallet) {
      // Neither our insert nor a racing one produced a row: something else is
      // wrong (wrong schema, permissions), and silently returning a zeroed
      // wallet would misreport a seller's balance as nothing.
      throw new Error(`Could not create a wallet for seller ${sellerId}`);
    }
    return wallet;
  }

  async holdEscrowInSellerWallet(sellerId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(sellerId);
    wallet.escrowBalance = Number(wallet.escrowBalance) + Number(amount);
    await this.walletRepo.save(wallet);
    this.logger.log(`Escrow held for seller ${sellerId}: +${amount}`);
    return wallet;
  }

  /**
   * Move money out of escrow and into the seller's withdrawable balance.
   *
   * Takes the amount already net of commission. It used to deduct a **second**,
   * hard-coded 5% here (`DEFAULT_COMMISSION_RATE || '0.05'`) on top of whatever
   * commission-service had charged, so a seller was billed twice on the same
   * order — once at the real category rate and again at a flat 5% nobody could
   * see. Commission belongs to commission-service; this only moves money.
   */
  async releaseEscrowToSellerWallet(sellerId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(sellerId);
    const net = Math.round(Number(amount) * 100) / 100;

    wallet.escrowBalance = Math.max(Number(wallet.escrowBalance) - net, 0);
    wallet.availableBalance = Number(wallet.availableBalance) + net;

    await this.walletRepo.save(wallet);
    this.logger.log(`Escrow released for seller ${sellerId}: +${net} available`);
    return wallet;
  }

  /**
   * Credit a seller's withdrawable balance directly.
   *
   * Used to settle a delivered order once commission-service has worked out what
   * the seller is owed. This is the balance payouts debit, so it is the one that
   * has to move — crediting wallet-service instead left the seller's portal
   * showing the same balance after a sale as before it.
   */
  async creditSellerWallet(sellerId: string, amount: number, reason: string, referenceId?: string) {
    const net = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(net) || net <= 0) {
      return { success: false, reason: 'A positive amount is required' };
    }

    const wallet = await this.getOrCreateWallet(sellerId);
    wallet.availableBalance = Number(wallet.availableBalance) + net;
    await this.walletRepo.save(wallet);

    await this.kafka.publish('seller.wallet.credited', { sellerId, amount: net, reason, referenceId });
    this.logger.log(`Seller ${sellerId} credited ${net} — ${reason}`);

    return { success: true, sellerId, credited: net, availableBalance: Number(wallet.availableBalance) };
  }

  // ── Private: Execute Payment ───────────────────────────────────────────────
  private async executePayment(payout: PayoutRecord): Promise<string> {
    // Payment method routing
    switch (payout.method) {
      case PayoutMethod.BANK:
        return this.executeBankTransfer(payout);
      case PayoutMethod.UPI:
        return this.executeUpiPayout(payout);
      default:
        return `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  private async executeBankTransfer(payout: PayoutRecord): Promise<string> {
    // TODO: Integrate with bank transfer API (Razorpay Payouts / Flutterwave)
    this.logger.log(`Bank transfer: ${payout.amount} → ${payout.bankAccount} (${payout.ifscCode})`);
    return `BANK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async executeUpiPayout(payout: PayoutRecord): Promise<string> {
    // TODO: Integrate with UPI B2C API
    this.logger.log(`UPI payout: ${payout.amount} → ${payout.upiId}`);
    return `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // The three Redis index helpers that used to live here
  // (`addToSellerPayoutIndex`, `addToGlobalPendingQueue`,
  // `removeFromGlobalPendingQueue`) are gone. They maintained by hand what
  // `IDX_payouts_seller_requested` and `IDX_payouts_status` now do — and could
  // drift out of sync with the records they pointed at, since the ids outlived
  // the 90-day TTL on the payouts themselves.
}
