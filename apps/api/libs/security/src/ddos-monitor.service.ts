import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '@app/redis';

/**
 * DDoS Monitor Service — Real-time threat analytics, alerting, and admin controls.
 *
 * Scheduled tasks:
 *  - Every 30s: Detect active attacks, trigger attack-mode escalation
 *  - Every 5min: Purge stale connection counters
 *  - Every hour: Log summary report
 *  - Every night: Rotate daily counters
 *
 * Admin API methods (called by DdosAdminController):
 *  - getThreatStatus()   — current threat level, active bans, attack mode
 *  - getBannedIps()      — full list of banned IPs with details
 *  - getTopOffenders()   — IPs with highest strike counts
 *  - getEndpointStats()  — request counts per endpoint for last 24h
 *  - banIp()             — manual IP ban
 *  - unbanIp()           — unban IP + clear strikes
 *  - whitelistIp()       — add IP to bypass list
 *  - removeFromWhitelist() — remove IP from bypass list
 *  - resetAttackMode()   — manually clear elevated attack mode
 */
@Injectable()
export class DdosMonitorService {
  private readonly logger = new Logger('DDoS-Monitor');

  // Thresholds for attack mode escalation
  private readonly HTTP_BANS_ELEVATED_THRESHOLD = 25;
  private readonly HTTP_BANS_CRITICAL_THRESHOLD = 100;
  private readonly WS_BANS_ELEVATED_THRESHOLD = 10;
  private readonly WS_BANS_CRITICAL_THRESHOLD = 50;

  constructor(private readonly redis: RedisService) {}

  // ── Scheduled Health Checks ──────────────────────────────────────────────

  /** Every 30 seconds — detect active attacks and escalate protection. */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAttackPatterns(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const httpBans = +((await this.redis.get(`stats:bans:${today}`)) || 0);
    const wsBans = +((await this.redis.get(`stats:ws:bans:${today}`)) || 0);

    // Determine threat level
    const httpCritical = httpBans >= this.HTTP_BANS_CRITICAL_THRESHOLD;
    const httpElevated = httpBans >= this.HTTP_BANS_ELEVATED_THRESHOLD;
    const wsCritical = wsBans >= this.WS_BANS_CRITICAL_THRESHOLD;
    const wsElevated = wsBans >= this.WS_BANS_ELEVATED_THRESHOLD;

    // HTTP attack mode
    if (httpCritical) {
      await this.redis.set('ddos:attack_mode', 'elevated', 600); // 10min
      this.logger.error(
        `🚨 CRITICAL HTTP ATTACK: ${httpBans} bans today — attack mode ACTIVE (600s)`,
      );
    } else if (httpElevated) {
      await this.redis.set('ddos:attack_mode', 'elevated', 300); // 5min
      this.logger.warn(
        `⚠️ ELEVATED HTTP THREAT: ${httpBans} bans today — attack mode active (300s)`,
      );
    }

    // WebSocket attack mode
    if (wsCritical) {
      await this.redis.set('ddos:ws_attack_mode', 'elevated', 600);
      this.logger.error(`🚨 CRITICAL WS ATTACK: ${wsBans} WS bans today — WS attack mode ACTIVE`);
    } else if (wsElevated) {
      await this.redis.set('ddos:ws_attack_mode', 'elevated', 300);
      this.logger.warn(`⚠️ ELEVATED WS THREAT: ${wsBans} WS bans today — WS attack mode active`);
    }
  }

  /** Every 5 minutes — purge stale/zero connection counters to free Redis memory. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async purgeStaleCounters(): Promise<void> {
    try {
      const connKeys = await this.redis.scanKeys('ws:connections:*');
      let purged = 0;
      for (const key of connKeys) {
        const val = await this.redis.get(key);
        if (val === null || parseInt(val, 10) <= 0) {
          await this.redis.del(key);
          purged++;
        }
      }
      if (purged > 0) {
        this.logger.log(`🧹 Purged ${purged} stale WS connection counters`);
      }
    } catch (e) {
      this.logger.error(`Counter purge error: ${(e as Error).message}`);
    }
  }

  /** Every hour — log summary stats for ops review. */
  @Cron(CronExpression.EVERY_HOUR)
  async logHourlySummary(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().toISOString().slice(0, 13);

    const [httpBans, wsBans] = await Promise.all([
      this.redis.get(`stats:bans:${today}`),
      this.redis.get(`stats:ws:bans:${today}`),
    ]);

    const bannedKeys = await this.redis.scanKeys('ddos:banned:*');
    const wsBannedKeys = await this.redis.scanKeys('ws:banned:*');
    const attackMode = await this.redis.get('ddos:attack_mode');
    const wsAttackMode = await this.redis.get('ddos:ws_attack_mode');

    this.logger.log(
      [
        `📊 DDoS Hourly Summary [${hour}]`,
        `   HTTP Bans Today  : ${httpBans || 0}`,
        `   WS Bans Today    : ${wsBans || 0}`,
        `   Active HTTP Bans : ${bannedKeys.length}`,
        `   Active WS Bans   : ${wsBannedKeys.length}`,
        `   HTTP Attack Mode : ${attackMode || 'OFF'}`,
        `   WS Attack Mode   : ${wsAttackMode || 'OFF'}`,
      ].join('\n'),
    );
  }

  // ── Admin API Data Methods ────────────────────────────────────────────────

  /** Get the current threat level, active ban counts, and attack mode status. */
  async getThreatStatus(): Promise<{
    level: 'normal' | 'elevated' | 'critical';
    httpBansToday: number;
    wsBansToday: number;
    activeBans: number;
    isHttpAttackMode: boolean;
    isWsAttackMode: boolean;
    timestamp: string;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const [httpBansRaw, wsBansRaw, attackMode, wsAttackMode] = await Promise.all([
      this.redis.get(`stats:bans:${today}`),
      this.redis.get(`stats:ws:bans:${today}`),
      this.redis.get('ddos:attack_mode'),
      this.redis.get('ddos:ws_attack_mode'),
    ]);

    const httpBans = +(httpBansRaw || 0);
    const wsBans = +(wsBansRaw || 0);

    const [httpBannedKeys, wsBannedKeys] = await Promise.all([
      this.redis.scanKeys('ddos:banned:*'),
      this.redis.scanKeys('ws:banned:*'),
    ]);
    const activeBans = httpBannedKeys.length + wsBannedKeys.length;

    let level: 'normal' | 'elevated' | 'critical' = 'normal';
    if (
      httpBans >= this.HTTP_BANS_CRITICAL_THRESHOLD ||
      wsBans >= this.WS_BANS_CRITICAL_THRESHOLD
    ) {
      level = 'critical';
    } else if (
      httpBans >= this.HTTP_BANS_ELEVATED_THRESHOLD ||
      wsBans >= this.WS_BANS_ELEVATED_THRESHOLD
    ) {
      level = 'elevated';
    }

    return {
      level,
      httpBansToday: httpBans,
      wsBansToday: wsBans,
      activeBans,
      isHttpAttackMode: !!attackMode,
      isWsAttackMode: !!wsAttackMode,
      timestamp: new Date().toISOString(),
    };
  }

  /** Get full list of currently banned IPs with remaining TTL and ban details. */
  async getBannedIps(): Promise<
    Array<{
      ip: string;
      type: 'http' | 'ws';
      details: Record<string, any>;
      remainingSeconds: number;
    }>
  > {
    const [httpKeys, wsKeys] = await Promise.all([
      this.redis.scanKeys('ddos:banned:*'),
      this.redis.scanKeys('ws:banned:*'),
    ]);

    const results: Array<{
      ip: string;
      type: 'http' | 'ws';
      details: Record<string, any>;
      remainingSeconds: number;
    }> = [];

    for (const key of httpKeys) {
      const ip = key.replace('ddos:banned:', '');
      const [raw, ttl] = await Promise.all([this.redis.get(key), this.redis.ttl(key)]);
      results.push({
        ip,
        type: 'http',
        details: raw ? JSON.parse(raw) : {},
        remainingSeconds: ttl,
      });
    }

    for (const key of wsKeys) {
      const ip = key.replace('ws:banned:', '');
      const [raw, ttl] = await Promise.all([this.redis.get(key), this.redis.ttl(key)]);
      results.push({ ip, type: 'ws', details: raw ? JSON.parse(raw) : {}, remainingSeconds: ttl });
    }

    return results.sort((a, b) => b.remainingSeconds - a.remainingSeconds);
  }

  /** Get IPs with the highest strike counts (top offenders, not yet banned). */
  async getTopOffenders(limit = 20): Promise<Array<{ ip: string; strikes: number }>> {
    const strikeKeys = await this.redis.scanKeys('ddos:strikes:*');
    const results: Array<{ ip: string; strikes: number }> = [];

    for (const key of strikeKeys) {
      const ip = key.replace('ddos:strikes:', '');
      const raw = await this.redis.get(key);
      if (raw) results.push({ ip, strikes: parseInt(raw, 10) });
    }

    return results.sort((a, b) => b.strikes - a.strikes).slice(0, limit);
  }

  /** Get hourly request counts for the top endpoints over the last 24 hours. */
  async getEndpointStats(): Promise<Record<string, number>> {
    const prefix = 'stats:ep:';
    const keys = await this.redis.scanKeys(`${prefix}*`);
    const stats: Record<string, number> = {};

    for (const key of keys.slice(0, 200)) {
      // cap at 200 keys
      const raw = await this.redis.get(key);
      const shortKey = key.replace(prefix, '');
      stats[shortKey] = parseInt(raw || '0', 10);
    }

    return stats;
  }

  // ── IP Management ─────────────────────────────────────────────────────────

  /** Manually ban an IP for both HTTP and WebSocket traffic. */
  async banIp(ip: string, durationSeconds: number, reason: string): Promise<void> {
    const banData = JSON.stringify({
      reason,
      bannedAt: new Date().toISOString(),
      duration: durationSeconds,
      manual: true,
    });

    await Promise.all([
      this.redis.set(`ddos:banned:${ip}`, banData, durationSeconds),
      this.redis.set(`ws:banned:${ip}`, banData, durationSeconds),
    ]);

    this.logger.warn(
      `🔒 Manual IP ban: ${ip} for ${Math.round(durationSeconds / 60)}min (reason: ${reason})`,
    );
  }

  /** Unban an IP — clears HTTP ban, WS ban, and all strike records. */
  async unbanIp(ip: string): Promise<void> {
    await Promise.all([
      this.redis.del(`ddos:banned:${ip}`),
      this.redis.del(`ws:banned:${ip}`),
      this.redis.del(`ddos:strikes:${ip}`),
      this.redis.del(`ws:strikes:${ip}`),
    ]);
    this.logger.log(`🔓 IP fully unbanned: ${ip}`);
  }

  /** Add an IP to the Redis bypass whitelist. */
  async whitelistIp(ip: string): Promise<void> {
    await this.redis.sadd('ddos:whitelist', ip);
    // Also clear any existing bans on whitelisted IPs
    await this.unbanIp(ip);
    this.logger.log(`✅ IP whitelisted (all bans cleared): ${ip}`);
  }

  /** Remove an IP from the whitelist using the correct SREM command. */
  async removeFromWhitelist(ip: string): Promise<void> {
    await this.redis.srem('ddos:whitelist', ip);
    this.logger.log(`❎ IP removed from whitelist: ${ip}`);
  }

  /** List all currently whitelisted IPs. */
  async getWhitelistedIps(): Promise<string[]> {
    return this.redis.smembers('ddos:whitelist');
  }

  /** Manually clear attack mode (e.g., after false-positive alert). */
  async resetAttackMode(): Promise<void> {
    await Promise.all([this.redis.del('ddos:attack_mode'), this.redis.del('ddos:ws_attack_mode')]);
    this.logger.log('✅ Attack mode manually cleared by admin');
  }

  /** Get daily ban counts for the last 14 days (for trend chart). */
  async getBanTrend(): Promise<Array<{ date: string; httpBans: number; wsBans: number }>> {
    const trend: Array<{ date: string; httpBans: number; wsBans: number }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const [h, w] = await Promise.all([
        this.redis.get(`stats:bans:${date}`),
        this.redis.get(`stats:ws:bans:${date}`),
      ]);
      trend.unshift({ date, httpBans: +(h || 0), wsBans: +(w || 0) });
    }
    return trend;
  }
}
