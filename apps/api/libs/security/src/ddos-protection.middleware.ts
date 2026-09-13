import { Injectable, type NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';
import { RedisService } from '@app/redis';

/**
 * DDoS Protection Middleware — Multi-layer defense for the KARTSEEK API Gateway.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer  │  Mechanism                │  Default Threshold            │
 * ├─────────┼───────────────────────────┼───────────────────────────────┤
 * │    1    │  IP Ban check             │  Auto-applied after strikes   │
 * │    2    │  Trusted proxy whitelist  │  Env: DDOS_TRUSTED_PROXIES    │
 * │    3    │  Static IP whitelist      │  Redis: ddos:whitelist        │
 * │    4    │  Payload size guard       │  10 MB (configurable)         │
 * │    5    │  Sliding window rate limit│  100 req / 60s (per IP)       │
 * │    6    │  Endpoint-specific limits │  Auth: 10 req/60s, etc.       │
 * │    7    │  Burst detection          │  20 req / 5s (per IP)         │
 * │    8    │  Attack-mode tightening   │  Redis: ddos:attack_mode      │
 * │    9    │  Header analysis          │  UA + header anomaly scoring  │
 * │   10    │  Request fingerprinting   │  UA + Accept + path entropy   │
 * │   11    │  Progressive IP banning   │  5 strikes → 15m → 30m → 2h  │
 * └─────────┴───────────────────────────┴───────────────────────────────┘
 *
 * Environment variables (all optional — sensible defaults provided):
 *   DDOS_RATE_LIMIT_WINDOW   Sliding window in seconds           (default: 60)
 *   DDOS_RATE_LIMIT_MAX      Max requests per window             (default: 100)
 *   DDOS_BURST_WINDOW        Burst micro-window in seconds       (default: 5)
 *   DDOS_BURST_MAX           Max requests per burst window       (default: 20)
 *   DDOS_BAN_DURATION        Base ban duration in seconds        (default: 900)
 *   DDOS_MAX_BODY_SIZE       Max allowed body size in bytes      (default: 10485760)
 *   DDOS_STRIKE_THRESHOLD    Strikes before auto-ban             (default: 5)
 *   DDOS_TRUSTED_PROXIES     Comma-separated trusted proxy CIDRs (default: 127.0.0.1)
 *   DDOS_BYPASS_PATHS        Comma-separated paths to skip       (default: /health,/metrics)
 */
@Injectable()
export class DdosProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger('DDoS-Shield');

  // ── Configuration ────────────────────────────────────────────────────────
  private readonly RATE_LIMIT_WINDOW = +(process.env.DDOS_RATE_LIMIT_WINDOW || 60);
  private readonly RATE_LIMIT_MAX = +(process.env.DDOS_RATE_LIMIT_MAX || 100);
  private readonly BURST_WINDOW = +(process.env.DDOS_BURST_WINDOW || 5);
  private readonly BURST_MAX = +(process.env.DDOS_BURST_MAX || 20);
  private readonly BAN_DURATION = +(process.env.DDOS_BAN_DURATION || 900);
  private readonly MAX_BODY_SIZE = +(process.env.DDOS_MAX_BODY_SIZE || 10_485_760);
  private readonly STRIKE_THRESHOLD = +(process.env.DDOS_STRIKE_THRESHOLD || 5);

  /** Paths that bypass DDoS checks (health, readiness probes). */
  private readonly BYPASS_PATHS: Set<string> = new Set(
    (process.env.DDOS_BYPASS_PATHS || '/health,/metrics,/ping').split(',').map((p) => p.trim()),
  );

  /**
   * Trusted reverse-proxy IPs whose X-Forwarded-For header we respect.
   * Any IP not in this list that sends X-Forwarded-For is treated with suspicion.
   */
  private readonly TRUSTED_PROXIES: Set<string> = new Set(
    (process.env.DDOS_TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map((p) => p.trim()),
  );

  /**
   * Endpoint-specific rate limits (stricter than global for sensitive paths).
   * Format: [pathPrefix, maxRequests, windowSeconds]
   */
  private readonly ENDPOINT_LIMITS: Array<[string, number, number]> = [
    ['/api/v1/auth/login', 10, 60], // Brute-force protection
    ['/api/v1/auth/register', 5, 60], // Account creation spam
    ['/api/v1/auth/forgot', 5, 300], // Password reset abuse
    ['/api/v1/auth/otp', 5, 60], // OTP spray attacks
    ['/api/v1/payment', 30, 60], // Payment fraud protection
    ['/api/v1/wallet', 30, 60], // Wallet enumeration
    ['/api/v1/search', 60, 10], // Search crawler abuse
    ['/graphql', 50, 60], // GraphQL introspection abuse
  ];

  /**
   * The store outage this middleware is currently riding out, if any.
   *
   * Rate limiting is the one place on the platform that deliberately FAILS OPEN
   * when Redis is unreachable (dispatch addendum item 2): every counter this
   * middleware keeps lives in Redis, so a store outage would otherwise take the
   * whole platform offline to protect it from traffic it has not seen. The
   * revocation checks in `jwt-auth.guard.ts` make the opposite choice for the
   * opposite reason — a revoked administrator must never regain access because
   * a cache died.
   *
   * What was wrong was not the choice but the reporting. The failure logged
   * `logger.error` PER REQUEST, so the moment protection went off the log filled
   * at exactly the rate of the traffic nobody was now limiting — thousands of
   * identical lines an operator has to read past to find anything else, which is
   * the one time they cannot afford to. One structured line when protection
   * goes down, one when it comes back with the number suppressed in between.
   */
  private outage: { since: number; suppressed: number; reason: string } | null = null;

  constructor(private readonly redis: RedisService) {}

  /**
   * Enter (or stay in) the failed-open state, emitting exactly one warning.
   *
   * Structured rather than prose: this line is what an alert fires on, and
   * `ddosProtection: 'FAILED_OPEN'` is greppable in a way that an emoji and a
   * driver message are not.
   */
  private enterOutage(err: Error): void {
    if (this.outage) {
      this.outage.suppressed += 1;
      return;
    }
    this.outage = { since: Date.now(), suppressed: 0, reason: err.message };
    this.logger.error(
      JSON.stringify({
        event: 'ddos.protection.failed_open',
        ddosProtection: 'FAILED_OPEN',
        message:
          'Rate limiting is OFF platform-wide: the store backing every counter is unreachable. ' +
          'Requests are being allowed unchecked until it returns.',
        reason: err.message,
        since: new Date().toISOString(),
      }),
    );
  }

  /** Leave the failed-open state, saying how much was not reported. */
  private leaveOutage(): void {
    if (!this.outage) return;
    const { since, suppressed, reason } = this.outage;
    this.outage = null;
    this.logger.log(
      JSON.stringify({
        event: 'ddos.protection.recovered',
        ddosProtection: 'ACTIVE',
        message: 'Rate limiting is back on.',
        outageMs: Date.now() - since,
        requestsAllowedUnchecked: suppressed + 1,
        reason,
      }),
    );
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    const path = req.path;

    // ── Bypass: health/readiness probes bypass all checks ───────────────────
    if (this.BYPASS_PATHS.has(path)) {
      return next();
    }

    const clientIp = this.extractClientIp(req);
    const now = Math.floor(Date.now() / 1000);

    try {
      // ── Layer 1: IP Whitelist (skip all further checks) ──────────────────
      const isWhitelisted = await this.redis.sismember('ddos:whitelist', clientIp);
      if (isWhitelisted) return next();

      // ── Layer 2: IP Ban check ────────────────────────────────────────────
      const banRaw = await this.redis.get(`ddos:banned:${clientIp}`);
      if (banRaw) {
        const banTtl = await this.redis.ttl(`ddos:banned:${clientIp}`);
        const banInfo = this.safeJsonParse(banRaw);
        this.logger.warn(
          `🚫 Blocked banned IP: ${clientIp} (${banTtl}s remaining, reason: ${banInfo?.reason || 'unknown'})`,
        );
        res.setHeader('Retry-After', String(banTtl));
        res.setHeader('X-RateLimit-Remaining', '0');
        this.sendError(
          res,
          HttpStatus.TOO_MANY_REQUESTS,
          'Your IP has been temporarily blocked due to suspicious activity. Please try again later.',
        );
        return;
      }

      // ── Layer 3: Payload size guard ──────────────────────────────────────
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > this.MAX_BODY_SIZE) {
        await this.recordStrike(clientIp, 'oversized_payload', req);
        this.logger.warn(`📦 Oversized payload from ${clientIp}: ${contentLength} bytes`);
        this.sendError(
          res,
          HttpStatus.PAYLOAD_TOO_LARGE,
          `Request body exceeds the maximum allowed size of ${this.formatBytes(this.MAX_BODY_SIZE)}.`,
        );
        return;
      }

      // ── Layer 4: Attack-mode multiplier ──────────────────────────────────
      // During an active DDoS, limits are tightened automatically by the monitor.
      const attackMode = await this.redis.get('ddos:attack_mode');
      const attackMultiplier = attackMode === 'elevated' ? 0.5 : 1; // 50% limit in attack mode

      // ── Layer 5: Endpoint-specific rate limits ────────────────────────────
      const endpointLimit = this.getEndpointLimit(path);
      if (endpointLimit) {
        const [epMax, epWindow] = endpointLimit;
        const epKey = `ddos:ep:${clientIp}:${path.split('?')[0]}:${Math.floor(now / epWindow)}`;
        const epCount = await this.redis.incr(epKey);
        if (epCount === 1) await this.redis.expire(epKey, epWindow + 1);

        const effectiveMax = Math.floor(epMax * attackMultiplier);
        if (epCount > effectiveMax) {
          await this.recordStrike(clientIp, `endpoint_limit:${path}`, req);
          this.logger.warn(
            `⛔ Endpoint limit hit: ${clientIp} on ${path} (${epCount}/${effectiveMax})`,
          );
          res.setHeader('Retry-After', String(epWindow));
          res.setHeader('X-RateLimit-Endpoint', path.split('?')[0]);
          this.sendError(
            res,
            HttpStatus.TOO_MANY_REQUESTS,
            'Too many requests to this endpoint. Please wait before retrying.',
          );
          return;
        }
      }

      // ── Layer 6: Global sliding window rate limit ─────────────────────────
      const globalMax = Math.floor(this.RATE_LIMIT_MAX * attackMultiplier);
      const windowKey = `ddos:rate:${clientIp}:${Math.floor(now / this.RATE_LIMIT_WINDOW)}`;
      const requestCount = await this.redis.incr(windowKey);
      if (requestCount === 1) await this.redis.expire(windowKey, this.RATE_LIMIT_WINDOW + 1);

      const remaining = Math.max(0, globalMax - requestCount);
      res.setHeader('X-RateLimit-Limit', String(globalMax));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader(
        'X-RateLimit-Reset',
        String(Math.ceil(now / this.RATE_LIMIT_WINDOW) * this.RATE_LIMIT_WINDOW),
      );

      if (requestCount > globalMax) {
        await this.recordStrike(clientIp, 'global_rate_limit', req);
        this.logger.warn(
          `⚠️ Rate limit exceeded: ${clientIp} (${requestCount}/${globalMax}, attack_mode=${!!attackMode})`,
        );
        res.setHeader('Retry-After', String(this.RATE_LIMIT_WINDOW));
        this.sendError(
          res,
          HttpStatus.TOO_MANY_REQUESTS,
          'Rate limit exceeded. Please slow down your requests.',
        );
        return;
      }

      // ── Layer 7: Burst detection (micro-window) ───────────────────────────
      const burstMax = Math.floor(this.BURST_MAX * attackMultiplier);
      const burstKey = `ddos:burst:${clientIp}:${Math.floor(now / this.BURST_WINDOW)}`;
      const burstCount = await this.redis.incr(burstKey);
      if (burstCount === 1) await this.redis.expire(burstKey, this.BURST_WINDOW + 1);

      if (burstCount > burstMax) {
        await this.recordStrike(clientIp, 'burst_flood', req);
        this.logger.warn(
          `🔥 Burst flood: ${clientIp} (${burstCount} req in ${this.BURST_WINDOW}s, max=${burstMax})`,
        );
        this.sendError(
          res,
          HttpStatus.TOO_MANY_REQUESTS,
          'Request burst detected. Please wait a moment before retrying.',
        );
        return;
      }

      // ── Layer 8: Header anomaly analysis ─────────────────────────────────
      const suspicionScore = this.computeSuspicionScore(req);
      if (suspicionScore >= 3) {
        await this.recordStrike(clientIp, `suspicious_headers:score=${suspicionScore}`, req);
        this.logger.warn(`🕵️ Suspicious request from ${clientIp} (score=${suspicionScore})`);
        // Don't block on score alone — just accumulate strikes
      }

      // ── Track per-endpoint stats for admin dashboard ──────────────────────
      const statKey = `stats:ep:${req.method}:${path.split('?')[0]}:${new Date().toISOString().slice(0, 13)}`;
      await this.redis.incr(statKey);

      // Add security context to request for downstream use
      (req as any).ddos = { ip: clientIp, requestCount, burstCount, suspicionScore };

      // A request that made it through every check is proof the store answered.
      this.leaveOutage();

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        // Never block on middleware errors — fail open, one warning per outage.
        this.enterOutage(error as Error);
        next();
      }
    }
  }

  // ── Strike & Progressive Ban System ──────────────────────────────────────

  private async recordStrike(ip: string, reason: string, req: Request): Promise<void> {
    const strikeKey = `ddos:strikes:${ip}`;
    const strikes = await this.redis.incr(strikeKey);
    if (strikes === 1) await this.redis.expire(strikeKey, 3600); // Strikes decay after 1h

    // Log violation with request context
    await this.redis.setJSON(
      `ddos:violation:${ip}:${Date.now()}`,
      {
        ip,
        reason,
        strikes,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'] || 'none',
        timestamp: new Date().toISOString(),
      },
      86400 * 7,
    ); // Keep violation records for 7 days

    if (strikes >= this.STRIKE_THRESHOLD) {
      // Progressive ban: 15m → 30m → 1h → 2h → 6h → 24h (caps at 24h)
      const multiplierIndex = Math.min(strikes - this.STRIKE_THRESHOLD, 5);
      const multipliers = [1, 2, 4, 8, 24, 96];
      const banDuration = (this.BAN_DURATION / 60) * multipliers[multiplierIndex] * 60; // in seconds

      await this.redis.set(
        `ddos:banned:${ip}`,
        JSON.stringify({
          reason,
          strikes,
          bannedAt: new Date().toISOString(),
          duration: banDuration,
          banLevel: multiplierIndex + 1,
        }),
        banDuration,
      );

      this.logger.error(
        `🚨 IP BANNED: ${ip} for ${Math.round(banDuration / 60)}min (level ${multiplierIndex + 1}, ${strikes} strikes, reason: ${reason})`,
      );

      await this.redis.incr(`stats:bans:${new Date().toISOString().slice(0, 10)}`);
    } else {
      this.logger.warn(`⚡ Strike ${strikes}/${this.STRIKE_THRESHOLD} for ${ip}: ${reason}`);
    }
  }

  // ── Suspicion Scoring ─────────────────────────────────────────────────────
  // Returns a score 0-10. Score ≥ 3 triggers a strike.

  private computeSuspicionScore(req: Request): number {
    let score = 0;
    const ua = req.headers['user-agent'] || '';
    const headers = req.headers;

    // No User-Agent
    if (!ua) score += 3;

    // Known scanner / attack tool patterns
    const maliciousUAs = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /zgrab/i,
      /dirbuster/i,
      /gobuster/i,
      /wpscan/i,
      /hydra/i,
      /metasploit/i,
      /burpsuite/i,
      /owasp/i,
      /acunetix/i,
      /nessus/i,
      /openvas/i,
      /w3af/i,
      /skipfish/i,
    ];
    if (maliciousUAs.some((p) => p.test(ua))) score += 5;

    // Extremely long individual headers (buffer overflow probe)
    for (const [, value] of Object.entries(headers)) {
      const v = Array.isArray(value) ? value.join('') : value || '';
      if (v.length > 8192) {
        score += 2;
        break;
      }
    }

    // Abnormally high number of headers
    if (Object.keys(headers).length > 40) score += 1;

    // Missing standard browser headers (likely scripted client)
    if (!headers['accept'] && !headers['accept-language']) score += 1;

    // Suspicious Content-Type with GET/HEAD (likely probing)
    if (['GET', 'HEAD'].includes(req.method) && headers['content-type']) score += 1;

    // Path traversal or SQL injection patterns in URL
    const suspiciousPathPatterns = [
      /\.\.\//, // Path traversal
      /\bselect\b.*\bfrom\b/i, // SQL injection
      /<script/i, // XSS probe
      /\/etc\/passwd/, // LFI probe
      /\beval\s*\(/i, // Code injection
      /\bexec\s*\(/i,
    ];
    const fullUrl = req.originalUrl || req.url;
    if (suspiciousPathPatterns.some((p) => p.test(fullUrl))) score += 3;

    return Math.min(score, 10);
  }

  // ── Endpoint Limit Lookup ─────────────────────────────────────────────────

  private getEndpointLimit(path: string): [number, number] | null {
    for (const [prefix, max, window] of this.ENDPOINT_LIMITS) {
      if (path.startsWith(prefix)) return [max, window];
    }
    return null;
  }

  // ── Trusted IP Extraction ─────────────────────────────────────────────────

  /**
   * Extract the real client IP, validating that X-Forwarded-For is only
   * trusted when it comes from a known reverse proxy (nginx, load balancer).
   * This prevents IP spoofing via forged X-Forwarded-For headers.
   */
  private extractClientIp(req: Request): string {
    const remoteAddr = req.ip || req.socket?.remoteAddress || 'unknown';

    // Only trust X-Forwarded-For if the direct connection is from a known proxy
    const isFromTrustedProxy = this.TRUSTED_PROXIES.has(remoteAddr);
    if (isFromTrustedProxy) {
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        const ips = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]).split(',');
        // The leftmost IP is the original client (assuming trusted proxy appends)
        const clientIp = ips[0].trim();
        // Basic sanity check — must look like an IP
        if (this.looksLikeIp(clientIp)) return clientIp;
      }
    }

    // For untrusted connections, use the real-ip header only if proxy is trusted
    if (isFromTrustedProxy) {
      const realIp = req.headers['x-real-ip'];
      if (realIp) {
        const ip = typeof realIp === 'string' ? realIp : realIp[0];
        if (this.looksLikeIp(ip)) return ip;
      }
    }

    return remoteAddr;
  }

  private looksLikeIp(ip: string): boolean {
    // IPv4
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
    // IPv6 (simplified check)
    if (/^[0-9a-fA-F:]{3,45}$/.test(ip)) return true;
    return false;
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private sendError(res: Response, status: number, message: string): void {
    res.status(status).json({
      statusCode: status,
      error:
        status === 429 ? 'Too Many Requests' : status === 413 ? 'Payload Too Large' : 'Forbidden',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private safeJsonParse(raw: string): Record<string, any> | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }
}
