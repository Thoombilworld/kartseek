import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';

/**
 * AccountLockoutService — Progressive account lockout after failed authentication attempts.
 *
 * Unlike DDoS protection (which is IP-based), this service is account-based,
 * preventing credential stuffing attacks against individual user accounts.
 *
 * ┌───────────────────────────────────────────────────────────┐
 * │  Failed Attempts  │  Lockout Duration                     │
 * ├───────────────────┼───────────────────────────────────────┤
 * │       3           │  30 seconds                           │
 * │       5           │  5 minutes                            │
 * │       7           │  15 minutes                           │
 * │       10          │  1 hour                               │
 * │       15+         │  24 hours (admin reset required)      │
 * └───────────────────────────────────────────────────────────┘
 */
@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger('AccountLockout');

  private readonly LOCKOUT_TIERS: Array<{ threshold: number; durationSeconds: number }> = [
    { threshold: 3,  durationSeconds: 30 },
    { threshold: 5,  durationSeconds: 300 },
    { threshold: 7,  durationSeconds: 900 },
    { threshold: 10, durationSeconds: 3600 },
    { threshold: 15, durationSeconds: 86400 },
  ];

  /** Key TTL for tracking failed attempts (1 hour decay window). */
  private readonly ATTEMPT_DECAY_TTL = 3600;

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if an account is currently locked out.
   * Returns null if not locked, or the remaining seconds if locked.
   */
  async isLockedOut(accountIdentifier: string): Promise<number | null> {
    const lockKey = `auth:lockout:${accountIdentifier}`;
    const lockRaw = await this.redis.get(lockKey);
    if (lockRaw) {
      const ttl = await this.redis.ttl(lockKey);
      return ttl > 0 ? ttl : null;
    }
    return null;
  }

  /**
   * Record a failed authentication attempt and apply progressive lockout.
   * Returns the number of remaining attempts before next lockout, or 0 if locked.
   */
  async recordFailedAttempt(accountIdentifier: string): Promise<{
    locked: boolean;
    remainingAttempts: number;
    lockoutDuration: number;
    totalAttempts: number;
  }> {
    const attemptsKey = `auth:attempts:${accountIdentifier}`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, this.ATTEMPT_DECAY_TTL);
    }

    // Find applicable lockout tier
    const tier = this.findLockoutTier(attempts);
    if (tier) {
      const lockKey = `auth:lockout:${accountIdentifier}`;
      await this.redis.set(lockKey, JSON.stringify({
        reason: 'too_many_failed_attempts',
        attempts,
        lockedAt: new Date().toISOString(),
      }), tier.durationSeconds);

      this.logger.warn(
        `🔒 Account locked: "${accountIdentifier}" after ${attempts} failed attempts ` +
        `(${Math.round(tier.durationSeconds / 60)} min lockout)`
      );

      return {
        locked: true,
        remainingAttempts: 0,
        lockoutDuration: tier.durationSeconds,
        totalAttempts: attempts,
      };
    }

    // Calculate remaining attempts before next lockout
    const nextTier = this.LOCKOUT_TIERS.find(t => t.threshold > attempts);
    const remaining = nextTier ? nextTier.threshold - attempts : 0;

    return {
      locked: false,
      remainingAttempts: remaining,
      lockoutDuration: 0,
      totalAttempts: attempts,
    };
  }

  /**
   * Clear failed attempts on successful login.
   */
  async clearAttempts(accountIdentifier: string): Promise<void> {
    await this.redis.del(`auth:attempts:${accountIdentifier}`);
    await this.redis.del(`auth:lockout:${accountIdentifier}`);
  }

  /**
   * Admin: Force unlock an account.
   */
  async adminUnlock(accountIdentifier: string): Promise<void> {
    await this.clearAttempts(accountIdentifier);
    this.logger.log(`🔓 Admin unlocked account: "${accountIdentifier}"`);
  }

  private findLockoutTier(attempts: number): { threshold: number; durationSeconds: number } | null {
    // Find the highest tier that this attempt count has reached
    for (let i = this.LOCKOUT_TIERS.length - 1; i >= 0; i--) {
      if (attempts >= this.LOCKOUT_TIERS[i].threshold) {
        return this.LOCKOUT_TIERS[i];
      }
    }
    return null;
  }
}
