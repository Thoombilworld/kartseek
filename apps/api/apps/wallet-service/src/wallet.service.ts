import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(WalletTransaction)
    private readonly txnRepo: Repository<WalletTransaction>,
  ) {}

  async healthCheck() {
    return { service: 'wallet-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * A user's wallet balance, derived from the durable transaction ledger.
   *
   * This used to hold the balance **only in Redis under a 300-second TTL**, and
   * on a cache miss it invented one:
   *
   *     // TODO: query wallet table once entity exists; for now seed a default
   *     const wallet = { userId, balance: 500.00, … };
   *
   * So every wallet in the platform reported ₹500 it did not have, and any
   * credit or debit written against it silently reverted to ₹500 five minutes
   * later. `wallet_transactions` is in Postgres and already records
   * `balanceAfter` on every row, which makes the ledger — not a cache — the
   * source of truth. Redis stays in front of it as a cache only.
   *
   * @param regionCurrency ISO code for the market the request came from, used
   *   only when the wallet has no transactions to take a currency from.
   */
  async getWallet(userId: string, regionCurrency?: string) {
    const cached = await this.redis.getJson<any>(`wallet:${userId}`);
    if (cached) return cached;

    // The running balance is whatever the most recent transaction left behind;
    // a user with no transactions has nothing, not ₹500.
    const latest = await this.txnRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    }).catch((): null => null);

    const frozen = (await this.redis.getJson<boolean>(`wallet:frozen:${userId}`)) === true;

    const wallet = {
      userId,
      balance: latest ? Number(latest.balanceAfter) : 0,
      /**
       * A wallet that holds money is denominated by its own ledger — the
       * currency on the last transaction, whatever that is. Relabelling stored
       * money would misstate what the customer has.
       *
       * A wallet with no transactions has nothing to be denominated in, and this
       * fell back to a hard-coded `'INR'`. On a platform whose home market is
       * Qatar that meant every new customer's wallet reported rupees, and the
       * account pages faithfully rendered "INR 0.00". An empty wallet now takes
       * the currency of the market the request came from, so the first top-up is
       * recorded in it too.
       */
      currency: latest?.currency ?? regionCurrency ?? 'INR',
      status: frozen ? 'FROZEN' : 'ACTIVE',
      frozen,
      createdAt: latest?.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };

    await this.redis.setJson(`wallet:${userId}`, wallet, 300);
    return wallet;
  }

  // ── Credit (refund, top-up, cashback, admin adjustment) ─────────────────
  /**
   * The largest single movement the wallet will accept.
   *
   * Not a business rule so much as a blast radius: without a ceiling a single
   * request set a balance to 99,999,999,749.
   */
  private static readonly MAX_AMOUNT = 1_000_000;

  /**
   * Validate a money amount before it touches a balance.
   *
   * Neither `credit` nor `debit` checked `amount` at all, and all three failure
   * modes were reachable through the gateway with an ordinary customer token on
   * their own wallet:
   *
   *  • `credit(-500)` ran `balance + -500` — a debit, with no balance check and
   *    no authorisation, recorded in the ledger as a CREDIT.
   *  • `debit(-500)` passed `balance < -500` and then ran `balance - -500` — a
   *    credit. Money from nothing, in the direction the caller chose.
   *  • `credit("1000")` ran `balance + "1000"`, which in JavaScript concatenates:
   *    a balance of 999999997491 became the *string* `"999999997491000"`, and
   *    every later arithmetic operation inherited it.
   *
   * `amount` arrives from a JSON body, so it must be proved to be a number here
   * rather than assumed to be one from the TypeScript signature.
   */
  private static assertAmount(amount: unknown): number {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new BadRequestException('amount must be a number');
    }
    if (amount <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }
    if (amount > WalletService.MAX_AMOUNT) {
      throw new BadRequestException(`amount may not exceed ${WalletService.MAX_AMOUNT}`);
    }
    // Money is two decimal places; anything finer is a rounding error waiting to
    // be argued about.
    return Math.round(amount * 100) / 100;
  }

  async credit(userId: string, rawAmount: number, reason: string, referenceId?: string, module?: string, regionCurrency?: string) {
    const amount = WalletService.assertAmount(rawAmount);
    const wallet = await this.getWallet(userId, regionCurrency);

    // Block credits to frozen wallets only if the reason is NOT a refund
    // (Per spec Q3: frozen wallets still receive refunds)
    if (wallet.frozen && reason !== 'Refund' && reason !== 'Admin Adjustment') {
      return { success: false, reason: 'Wallet is frozen' };
    }

    // `Number(...)` because a balance restored from a cache written by an older
    // build can be a string; `+` on a string concatenates rather than adds.
    const balanceBefore = Number(wallet.balance) || 0;
    const newBalance = Math.round((balanceBefore + amount) * 100) / 100;
    const updated = { ...wallet, balance: newBalance };
    await this.redis.setJson(`wallet:${userId}`, updated, 300);

    const txId = `TXN-${Date.now()}`;

    // Persist transaction to PostgreSQL
    await this.persistTransaction({
      id: txId,
      userId,
      type: 'CREDIT',
      amount,
      reason,
      referenceId: referenceId ?? null,
      balanceBefore,
      balanceAfter: newBalance,
      currency: wallet.currency,
      module: module ?? null,
    });

    await this.kafka.publish('wallet.credited', {
      id: txId, userId, amount, reason, referenceId, module, newBalance,
    });

    this.logger.log(`Wallet credited: ${userId} +${amount} (${reason}) → Balance: ${newBalance}`);
    return { success: true, transactionId: txId, newBalance };
  }

  // ── Debit (order payment, admin adjustment) ─────────────────────────────
  async debit(userId: string, rawAmount: number, reason: string, referenceId?: string, module?: string) {
    const amount = WalletService.assertAmount(rawAmount);
    const wallet = await this.getWallet(userId);

    if (wallet.frozen) {
      return { success: false, reason: 'Wallet is frozen — debits are blocked' };
    }

    const balanceBefore = Number(wallet.balance) || 0;
    if (balanceBefore < amount) {
      return { success: false, reason: 'Insufficient wallet balance' };
    }

    const newBalance = Math.round((balanceBefore - amount) * 100) / 100;
    const updated = { ...wallet, balance: newBalance };
    await this.redis.setJson(`wallet:${userId}`, updated, 300);

    const txId = `TXN-${Date.now()}`;

    // Persist transaction to PostgreSQL
    await this.persistTransaction({
      id: txId,
      userId,
      type: 'DEBIT',
      amount,
      reason,
      referenceId: referenceId ?? null,
      balanceBefore,
      balanceAfter: newBalance,
      currency: wallet.currency,
      module: module ?? null,
    });

    await this.kafka.publish('wallet.debited', {
      id: txId, userId, amount, reason, referenceId, module, newBalance,
    });

    return { success: true, transactionId: txId, newBalance };
  }

  // ── Transaction History (now backed by PostgreSQL) ──────────────────────
  async getTransactions(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.txnRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, hasMore: total > page * limit };
  }

  // ── Admin: Search transactions across all users ─────────────────────────
  async searchTransactions(filters: {
    userId?: string;
    type?: 'CREDIT' | 'DEBIT';
    module?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const qb = this.txnRepo.createQueryBuilder('txn');

    if (filters.userId) qb.andWhere('txn.userId = :userId', { userId: filters.userId });
    if (filters.type) qb.andWhere('txn.type = :type', { type: filters.type });
    if (filters.module) qb.andWhere('txn.module = :module', { module: filters.module });
    if (filters.startDate) qb.andWhere('txn.createdAt >= :start', { start: new Date(filters.startDate) });
    if (filters.endDate) qb.andWhere('txn.createdAt <= :end', { end: new Date(filters.endDate) });

    qb.orderBy('txn.createdAt', 'DESC');

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Freeze / Unfreeze ───────────────────────────────────────────────────
  /**
   * Freeze a wallet.
   *
   * The flag gets its own key with no TTL. It used to be written into the cached
   * wallet object, which expires after 300 seconds — so a wallet an admin froze
   * for fraud silently unfroze itself five minutes later, and every debit block
   * that depended on it lapsed with it.
   */
  async freezeWallet(userId: string, reason: string, adminId: string) {
    await this.redis.setJson(`wallet:frozen:${userId}`, true);
    // Drop the cached wallet so the next read reflects the freeze immediately.
    await this.redis.del(`wallet:${userId}`);
    await this.kafka.publish('wallet.frozen', { userId, reason, adminId, frozenAt: new Date().toISOString() });
    this.logger.warn(`Wallet FROZEN: ${userId} by admin ${adminId} — ${reason}`);
    return { success: true, userId, frozen: true };
  }

  async unfreezeWallet(userId: string, reason: string, adminId: string) {
    await this.redis.del(`wallet:frozen:${userId}`);
    await this.redis.del(`wallet:${userId}`);
    await this.kafka.publish('wallet.unfrozen', { userId, reason, adminId, unfrozenAt: new Date().toISOString() });
    this.logger.log(`Wallet UNFROZEN: ${userId} by admin ${adminId} — ${reason}`);
    return { success: true, userId, frozen: false };
  }

  // ── Kafka: Auto-credit wallet on refund approval ────────────────────────
  async handleRefundApproved(payload: { orderId: string; userId: string; amount: number }) {
    this.logger.log(`Refund approved for order ${payload.orderId} — crediting wallet ${payload.userId} +${payload.amount}`);
    return this.credit(
      payload.userId,
      payload.amount,
      'Refund',
      payload.orderId,
      'refund',
    );
  }

  // ── Private: persist transaction to DB ──────────────────────────────────
  private async persistTransaction(data: {
    id: string; userId: string; type: 'CREDIT' | 'DEBIT';
    amount: number; reason: string; referenceId: string | null;
    balanceBefore: number; balanceAfter: number; currency: string; module: string | null;
  }) {
    try {
      const txn = this.txnRepo.create(data);
      await this.txnRepo.save(txn);
    } catch (err: any) {
      // Log but don't fail the wallet operation if DB write fails
      this.logger.error(`Failed to persist transaction ${data.id}: ${err.message}`);
    }
  }
}
