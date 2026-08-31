import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async healthCheck() {
    return { service: 'loyalty-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * The customer's balance, creating an empty one on first read.
   *
   * Two bugs lived here, and both moved spendable value.
   *
   * A customer with no record was handed 750 points at Silver with 1,200
   * "earned" — points nobody granted, on a balance `redeemPoints` converts to a
   * checkout discount at 10 pts per unit of currency. Every account on the
   * platform opened with 75 units of free credit and a tier multiplier of 1.5×
   * on everything it subsequently earned. A new account starts empty.
   *
   * Worse, the balance was the value of a key with a 300-second TTL, and every
   * writer below re-set it with the same TTL. Five minutes after the last write
   * the record was evicted and the next read minted the fixture again: points
   * earned on a real order disappeared, points spent at checkout came back, and
   * `totalEarned` — which decides the tier — reset with them. The balance is a
   * record, not a cache, so it is stored without expiry.
   */
  async getPoints(userId: string) {
    const cached = await this.redis.getJson<any>(`loyalty:${userId}`);
    if (cached) return cached;
    const tierInfo = this.getTierInfo('Bronze');
    const data = {
      userId,
      points: 0,
      tier: 'Bronze',
      nextTier: tierInfo.nextTier,
      pointsToNextTier: tierInfo.pointsToNextTier,
      totalEarned: 0,
      totalReversed: 0,
      lastUpdated: new Date().toISOString(),
    };
    await this.redis.setJson(`loyalty:${userId}`, data);
    return data;
  }

  // ── Award Points ────────────────────────────────────────────────────────
  /**
   * Grant points.
   *
   * The gateway used to implement *redemption* by calling this with a negative
   * `points`, which skipped `redeemPoints`'s balance check: redeeming 50 against
   * a balance of 0 answered `success: true` and left the customer on −50 points,
   * with `totalEarned` reduced by 50 as well, so the tier calculation moved too.
   * Redemption now has its own pattern; the floor here means no future caller can
   * reintroduce a negative balance through this path either.
   */
  async awardPoints(userId: string, points: number, reason: string, orderId?: string) {
    const current = await this.getPoints(userId);
    const newPoints = Math.max(0, current.points + points);
    const earnedDelta = Math.max(0, points);
    const updated = { ...current, points: newPoints, totalEarned: (current.totalEarned || 0) + earnedDelta, lastUpdated: new Date().toISOString() };

    // Update tier based on total earned
    updated.tier = this.calculateTier(updated.totalEarned);
    const tierInfo = this.getTierInfo(updated.tier);
    updated.nextTier = tierInfo.nextTier;
    updated.pointsToNextTier = tierInfo.pointsToNextTier - updated.totalEarned;
    if (updated.pointsToNextTier < 0) updated.pointsToNextTier = 0;

    await this.redis.setJson(`loyalty:${userId}`, updated);

    // Store order→points mapping for reversibility
    if (orderId) {
      await this.redis.setJson(`loyalty:order:${orderId}`, {
        userId,
        pointsAwarded: points,
        awardedAt: new Date().toISOString(),
        reversed: false,
      }, 86400 * 90); // 90-day TTL for order mapping
    }

    await this.kafka.publish('loyalty.points.awarded', {
      userId, points, reason, orderId: orderId ?? '', newTotal: newPoints,
    });
    this.logger.log(`Awarded ${points} pts to ${userId} for ${reason}`);
    return { success: true, pointsAwarded: points, newTotal: newPoints, tier: updated.tier };
  }

  // ── Redeem Points ───────────────────────────────────────────────────────
  async redeemPoints(userId: string, points: number) {
    const current = await this.getPoints(userId);
    if (current.points < points) return { success: false, reason: 'Insufficient loyalty points' };
    const newPoints = current.points - points;
    const updated = { ...current, points: newPoints };
    await this.redis.setJson(`loyalty:${userId}`, updated);
    await this.kafka.publish('loyalty.points.redeemed', { userId, points, newTotal: newPoints });
    const discountAmount = Math.floor(points / 10); // 10 points = INR 1
    return { success: true, pointsRedeemed: points, discountAmount, newTotal: newPoints };
  }

  // ── Reverse Points (on order cancellation / refund) ─────────────────────
  async reversePoints(userId: string, orderId: string, reason: string) {
    // Look up the order→points mapping
    const mapping = await this.redis.getJson<any>(`loyalty:order:${orderId}`);
    if (!mapping) {
      this.logger.warn(`No loyalty mapping found for order ${orderId} — cannot reverse`);
      return { success: false, reason: 'No points found for this order' };
    }
    if (mapping.reversed) {
      this.logger.warn(`Points for order ${orderId} already reversed`);
      return { success: false, reason: 'Points already reversed' };
    }

    const current = await this.getPoints(userId);
    const pointsToReverse = mapping.pointsAwarded;
    const newPoints = Math.max(0, current.points - pointsToReverse);
    const updated = {
      ...current,
      points: newPoints,
      totalReversed: (current.totalReversed || 0) + pointsToReverse,
      lastUpdated: new Date().toISOString(),
    };

    // Recalculate tier
    const effectiveEarned = (updated.totalEarned || 0) - (updated.totalReversed || 0);
    updated.tier = this.calculateTier(effectiveEarned);
    const tierInfo = this.getTierInfo(updated.tier);
    updated.nextTier = tierInfo.nextTier;
    updated.pointsToNextTier = tierInfo.pointsToNextTier - effectiveEarned;
    if (updated.pointsToNextTier < 0) updated.pointsToNextTier = 0;

    await this.redis.setJson(`loyalty:${userId}`, updated);

    // Mark order mapping as reversed
    await this.redis.setJson(`loyalty:order:${orderId}`, {
      ...mapping,
      reversed: true,
      reversedAt: new Date().toISOString(),
      reversalReason: reason,
    }, 86400 * 90);

    await this.kafka.publish('loyalty.points.reversed', {
      userId, orderId, pointsReversed: pointsToReverse, reason, newTotal: newPoints,
    });

    this.logger.log(`Reversed ${pointsToReverse} pts from ${userId} for order ${orderId} (${reason})`);
    return { success: true, pointsReversed: pointsToReverse, newTotal: newPoints };
  }

  /**
   * The programme settings an admin has configured, with the built-in defaults
   * behind them.
   *
   * The admin panel writes these to `admin:loyalty:config` and nothing read
   * them — the earn rate below was hardcoded — so changing the rate in the
   * console altered the number shown on the settings page and nothing else.
   */
  private async loyaltyConfig() {
    const stored = await this.redis.getJson<any>('admin:loyalty:config');
    const earn = stored?.earning ?? stored?.earn ?? {};
    const redemption = stored?.redemption ?? {};
    return {
      // Currency spent per point earned. 100 keeps the previous behaviour for
      // any deployment that has never opened the settings page.
      spendPerPoint: Number(earn.spendPerPoint ?? earn.perUnit ?? 100) || 100,
      maxPointsPerOrder: Number(earn.maxPointsPerOrder ?? 0) || 0,
      // Points needed for one unit of currency when redeeming.
      pointsPerUnit: Number(redemption.pointsPerUnit ?? 10) || 10,
    };
  }

  // ── Points Preview (for checkout display) ───────────────────────────────
  async calculatePointsPreview(orderTotal: number, userId?: string) {
    const config = await this.loyaltyConfig();
    let basePoints = Math.floor(orderTotal / config.spendPerPoint);
    if (config.maxPointsPerOrder > 0) basePoints = Math.min(basePoints, config.maxPointsPerOrder);

    // Get tier multiplier if userId provided
    let multiplier = 1;
    let tier = 'Bronze';
    if (userId) {
      const profile = await this.getPoints(userId);
      tier = profile.tier;
      multiplier = this.getTierMultiplier(tier);
    }

    const totalPoints = Math.floor(basePoints * multiplier);
    return {
      basePoints,
      tierMultiplier: multiplier,
      tier,
      totalPoints,
      // Redemption rate comes from the same configured settings, so the value
      // shown at checkout matches what the programme actually pays out.
      estimatedValue: Math.floor(totalPoints / config.pointsPerUnit),
    };
  }

  // ── Get points awarded for a specific order ─────────────────────────────
  async getPointsForOrder(orderId: string) {
    return this.redis.getJson<any>(`loyalty:order:${orderId}`);
  }

  // ── Admin: Manual adjustment ────────────────────────────────────────────
  async adjustPoints(userId: string, points: number, reason: string, adminId: string) {
    const current = await this.getPoints(userId);
    const newPoints = Math.max(0, current.points + points); // points can be negative (revoke)
    const updated = { ...current, points: newPoints, lastUpdated: new Date().toISOString() };

    if (points > 0) {
      updated.totalEarned = (current.totalEarned || 0) + points;
    } else {
      updated.totalReversed = (current.totalReversed || 0) + Math.abs(points);
    }

    await this.redis.setJson(`loyalty:${userId}`, updated);

    const eventType = points > 0 ? 'loyalty.points.awarded' : 'loyalty.points.reversed';
    await this.kafka.publish(eventType, {
      userId, points: Math.abs(points), reason: `Admin (${adminId}): ${reason}`, newTotal: newPoints,
    });

    this.logger.log(`Admin ${adminId} adjusted ${userId} points by ${points} (${reason})`);
    return { success: true, adjustment: points, newTotal: newPoints };
  }

  // ── Private helpers ─────────────────────────────────────────────────────
  private calculateTier(totalEarned: number): string {
    if (totalEarned >= 5000) return 'Platinum';
    if (totalEarned >= 1000) return 'Gold';
    if (totalEarned >= 200) return 'Silver';
    return 'Bronze';
  }

  private getTierMultiplier(tier: string): number {
    switch (tier) {
      case 'Platinum': return 3;
      case 'Gold': return 2;
      case 'Silver': return 1.5;
      default: return 1;
    }
  }

  private getTierInfo(tier: string): { nextTier: string | null; pointsToNextTier: number } {
    switch (tier) {
      case 'Bronze': return { nextTier: 'Silver', pointsToNextTier: 200 };
      case 'Silver': return { nextTier: 'Gold', pointsToNextTier: 1000 };
      case 'Gold': return { nextTier: 'Platinum', pointsToNextTier: 5000 };
      case 'Platinum': return { nextTier: null, pointsToNextTier: 0 };
      default: return { nextTier: 'Silver', pointsToNextTier: 200 };
    }
  }
}
