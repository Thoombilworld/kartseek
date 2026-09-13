import { Injectable, type CanActivate, type ExecutionContext, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisService } from '@app/redis';
import { banSuppressedForLoopback } from './client-ip.util';

/**
 * The peers whose `X-Forwarded-For` a socket handshake may believe.
 *
 * The same list `DdosProtectionMiddleware` reads, from the same variable, so
 * the HTTP and WebSocket halves of the rate limiter cannot disagree about which
 * hop is ours.
 */
const wsTrustedProxies = (): Set<string> =>
  new Set((process.env.DDOS_TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map((p) => p.trim()));

/**
 * Does this look like an address at all?
 *
 * The same sanity check `DdosProtectionMiddleware.looksLikeIp` applies to a
 * forwarded value. Without it a trusted proxy forwarding a junk string — a
 * hostname, an empty segment, an injected header from a misconfigured hop —
 * becomes the ban key, so `ws:banned:<junk>` bans nobody and the real client
 * carries on. Falling back to the peer address is always a real address.
 */
const looksLikeIp = (ip: string): boolean =>
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) || /^[0-9a-fA-F:]{3,45}$/.test(ip);

/**
 * WebSocket DDoS Guard — Complete abuse prevention for all Socket.IO namespaces.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Protection                     │  Default Limit                    │
 * ├─────────────────────────────────┼───────────────────────────────────┤
 * │  New connections / IP / minute  │  8                                │
 * │  Concurrent sockets per IP      │  10                               │
 * │  Messages / socket / second     │  15                               │
 * │  Payload size per message       │  64 KB                            │
 * │  Event flood (same event/2s)    │  5 identical events per 2s        │
 * │  Auth-less connection grace     │  10s to send userId               │
 * │  WS ban duration (base)         │  10 minutes (progressive)         │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Wire-up in every Gateway:
 *
 *   async handleConnection(client: Socket) {
 *     const allowed = await this.wsDdosGuard.validateConnection(client);
 *     if (!allowed) return;
 *     // ... rest of handleConnection
 *   }
 *
 *   async handleDisconnect(client: Socket) {
 *     await this.wsDdosGuard.handleDisconnection(client);
 *     // ... rest of handleDisconnect
 *   }
 *
 * And on individual event handlers add @UseGuards(WsDdosGuard).
 */
@Injectable()
export class WsDdosGuard implements CanActivate {
  private readonly logger = new Logger('WS-DDoS-Guard');

  private readonly MAX_CONNECTIONS_PER_IP = +(process.env.WS_MAX_CONNECTIONS_PER_IP || 10);
  private readonly MAX_CONN_RATE_PER_MIN = +(process.env.WS_MAX_CONN_RATE_PER_MIN || 8);
  private readonly MAX_MESSAGES_PER_SECOND = +(process.env.WS_MAX_MESSAGES_PER_SECOND || 15);
  private readonly MAX_IDENTICAL_PER_2S = +(process.env.WS_MAX_IDENTICAL_PER_2S || 5);
  private readonly MAX_MESSAGE_SIZE = +(process.env.WS_MAX_MESSAGE_SIZE || 65_536); // 64KB
  private readonly WS_BAN_DURATION = +(process.env.WS_BAN_DURATION || 600); // 10min
  private readonly WS_STRIKE_THRESHOLD = +(process.env.WS_STRIKE_THRESHOLD || 3);

  constructor(private readonly redis: RedisService) {}

  // ── CanActivate — applied to individual @SubscribeMessage handlers ────────

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const data = context.switchToWs().getData();
    const event = this.extractEventName(context);
    const clientIp = this.getSocketIp(client);

    // ── Check 1: IP ban ─────────────────────────────────────────────────
    const isBanned = await this.redis.get(`ws:banned:${clientIp}`);
    if (isBanned) {
      const banInfo = this.safeJsonParse(isBanned);
      client.emit('error', {
        code: 'WS_BANNED',
        message: `Connection blocked for ${Math.round((banInfo?.duration || this.WS_BAN_DURATION) / 60)} minutes due to abuse.`,
      });
      client.disconnect(true);
      return false;
    }

    // ── Check 2: Attack mode tightening ─────────────────────────────────
    const attackMode = await this.redis.get('ddos:ws_attack_mode');
    const msgMultiplier = attackMode === 'elevated' ? 0.5 : 1;
    const effectiveMsgMax = Math.floor(this.MAX_MESSAGES_PER_SECOND * msgMultiplier);

    // ── Check 3: Per-socket message rate (per second) ────────────────────
    const now = Math.floor(Date.now() / 1000);
    const msgKey = `ws:msgrate:${client.id}:${now}`;
    const msgCount = await this.redis.incr(msgKey);
    if (msgCount === 1) await this.redis.expire(msgKey, 2);

    if (msgCount > effectiveMsgMax) {
      this.logger.warn(
        `⚡ WS message flood: ${clientIp} [${client.id}] ${msgCount}/s (max=${effectiveMsgMax})`,
      );
      await this.recordWsStrike(clientIp, client, 'message_flood');
      throw new WsException({
        code: 'MSG_RATE_LIMIT',
        message: 'Message rate limit exceeded. Please slow down.',
      });
    }

    // ── Check 4: Identical event flood (replay/loop detection) ──────────
    if (event) {
      const eventKey = `ws:eventflood:${client.id}:${event}:${Math.floor(now / 2)}`;
      const eventCount = await this.redis.incr(eventKey);
      if (eventCount === 1) await this.redis.expire(eventKey, 3);

      if (eventCount > this.MAX_IDENTICAL_PER_2S) {
        this.logger.warn(
          `🔁 Event flood: ${clientIp} [${client.id}] event="${event}" ${eventCount}x in 2s`,
        );
        await this.recordWsStrike(clientIp, client, `event_flood:${event}`);
        throw new WsException({
          code: 'EVENT_FLOOD',
          message: `Too many "${event}" events. Please wait before retrying.`,
        });
      }
    }

    // ── Check 5: Payload size ────────────────────────────────────────────
    if (data !== undefined && data !== null) {
      const payloadSize = this.measurePayload(data);
      if (payloadSize > this.MAX_MESSAGE_SIZE) {
        this.logger.warn(
          `📦 WS oversized payload: ${clientIp} [${client.id}] ${payloadSize} bytes`,
        );
        await this.recordWsStrike(clientIp, client, 'oversized_payload');
        throw new WsException({
          code: 'PAYLOAD_TOO_LARGE',
          message: `Message payload exceeds the maximum size of ${Math.round(this.MAX_MESSAGE_SIZE / 1024)} KB.`,
        });
      }
    }

    return true;
  }

  // ── Connection Validation — call from handleConnection() in all gateways ──

  /**
   * Call this at the top of every gateway's handleConnection().
   * Returns false (and disconnects the client) if the connection should be rejected.
   */
  async validateConnection(client: Socket): Promise<boolean> {
    const clientIp = this.getSocketIp(client);

    // Check 1: IP ban
    const isBanned = await this.redis.get(`ws:banned:${clientIp}`);
    if (isBanned) {
      this.logger.warn(`🚫 Banned IP attempted WS connection: ${clientIp}`);
      client.emit('error', {
        code: 'WS_BANNED',
        message: 'Connection blocked due to prior abuse.',
      });
      client.disconnect(true);
      return false;
    }

    // Check 2: Concurrent connection limit per IP
    const connKey = `ws:connections:${clientIp}`;
    const connCount = await this.redis.incr(connKey);
    if (connCount === 1) await this.redis.expire(connKey, 300);

    if (connCount > this.MAX_CONNECTIONS_PER_IP) {
      this.logger.warn(
        `🔌 Too many WS connections from ${clientIp}: ${connCount}/${this.MAX_CONNECTIONS_PER_IP}`,
      );
      await this.recordWsStrike(clientIp, client, 'too_many_connections');
      client.emit('error', {
        code: 'TOO_MANY_CONNECTIONS',
        message: 'Maximum concurrent connections reached for your IP.',
      });
      client.disconnect(true);
      // Decrement since this connection is being rejected
      await this.redis.decr(connKey);
      return false;
    }

    // Check 3: Connection rate per minute (connection storm detection)
    const connRateKey = `ws:connrate:${clientIp}:${Math.floor(Date.now() / 60_000)}`;
    const connRate = await this.redis.incr(connRateKey);
    if (connRate === 1) await this.redis.expire(connRateKey, 61);

    if (connRate > this.MAX_CONN_RATE_PER_MIN) {
      this.logger.warn(`🌀 WS connection storm: ${clientIp} opened ${connRate} sockets/min`);
      await this.recordWsStrike(clientIp, client, 'connection_storm');
      client.emit('error', {
        code: 'CONNECTION_STORM',
        message: 'Too many connections opened rapidly. Please wait before reconnecting.',
      });
      client.disconnect(true);
      await this.redis.decr(connKey);
      return false;
    }

    // Check 4: Attack mode tightening
    const attackMode = await this.redis.get('ddos:ws_attack_mode');
    if (attackMode === 'elevated') {
      // During attack, only allow 50% of connections per IP
      if (connCount > Math.floor(this.MAX_CONNECTIONS_PER_IP * 0.5)) {
        this.logger.warn(
          `🛡️ Attack mode: rejecting connection from ${clientIp} (${connCount} active)`,
        );
        client.emit('error', {
          code: 'SERVICE_DEGRADED',
          message: 'Service is currently under high load. Please try again shortly.',
        });
        client.disconnect(true);
        await this.redis.decr(connKey);
        return false;
      }
    }

    // Store socket → IP mapping for cleanup
    await this.redis.hset('ws:socket:ip', client.id, clientIp);

    this.logger.log(
      `✅ WS connection accepted: ${clientIp} [${client.id}] (${connCount}/${this.MAX_CONNECTIONS_PER_IP} concurrent)`,
    );
    return true;
  }

  /**
   * Call this at the top of every gateway's handleDisconnect().
   * Decrements the connection counter for the IP.
   */
  async handleDisconnection(client: Socket): Promise<void> {
    // Use stored IP mapping (handshake IP may be inaccurate after proxy headers)
    const storedIp = await this.redis.hget('ws:socket:ip', client.id);
    const clientIp = storedIp || this.getSocketIp(client);

    const connKey = `ws:connections:${clientIp}`;
    const current = parseInt((await this.redis.get(connKey)) || '0', 10);
    if (current > 0) await this.redis.decr(connKey);

    await this.redis.hdel('ws:socket:ip', client.id);
  }

  // ── Admin utilities ───────────────────────────────────────────────────────

  /** Force-ban a WS IP immediately (callable from admin controller). */
  async banIpFromWebSocket(ip: string, durationSeconds: number, reason: string): Promise<void> {
    await this.redis.set(
      `ws:banned:${ip}`,
      JSON.stringify({
        reason,
        bannedAt: new Date().toISOString(),
        duration: durationSeconds,
        manual: true,
      }),
      durationSeconds,
    );
    this.logger.warn(`🔒 Manual WS ban: ${ip} for ${Math.round(durationSeconds / 60)} min`);
  }

  /** Unban a WS IP. */
  async unbanIpFromWebSocket(ip: string): Promise<void> {
    await this.redis.del(`ws:banned:${ip}`);
    await this.redis.del(`ws:strikes:${ip}`);
    this.logger.log(`🔓 WS IP unbanned: ${ip}`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async recordWsStrike(ip: string, client: Socket, reason: string): Promise<void> {
    const strikeKey = `ws:strikes:${ip}`;
    const strikes = await this.redis.incr(strikeKey);
    if (strikes === 1) await this.redis.expire(strikeKey, 1800); // decay after 30min

    this.logger.warn(`⚡ WS Strike ${strikes}/${this.WS_STRIKE_THRESHOLD} for ${ip}: ${reason}`);

    if (strikes >= this.WS_STRIKE_THRESHOLD) {
      if (banSuppressedForLoopback(ip)) {
        this.logger.warn(
          `⚠️ WS ban NOT written for ${ip}: ${strikes} strikes (${reason}), but a loopback ban in ` +
            `development disconnects every local socket, not the offender's. Per-socket message ` +
            `and connection limits still apply. See docs/guides/troubleshooting.md.`,
        );
        return;
      }
      const multiplierIndex = Math.min(strikes - this.WS_STRIKE_THRESHOLD, 3);
      const multipliers = [1, 3, 6, 18]; // 10min → 30min → 1h → 3h
      const banDuration = this.WS_BAN_DURATION * multipliers[multiplierIndex];

      await this.redis.set(
        `ws:banned:${ip}`,
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
        `🚨 WS IP BANNED: ${ip} for ${Math.round(banDuration / 60)}min (level ${multiplierIndex + 1}, reason: ${reason})`,
      );

      client.emit('error', {
        code: 'WS_BANNED',
        message: `Temporarily banned for ${Math.round(banDuration / 60)} minutes due to repeated violations.`,
      });
      client.disconnect(true);

      // Same shape and same reason as `stats:bans:<date>` in the HTTP
      // middleware: read back for today by the security board, accumulated
      // because no ban table exists to recompute it from, and bounded at 35
      // days so the family cannot grow for ever under `volatile-lru`, which may
      // evict nothing that has no expiry (AUD2-031).
      const banStat = `stats:ws:bans:${new Date().toISOString().slice(0, 10)}`;
      if ((await this.redis.incr(banStat)) === 1) await this.redis.expire(banStat, 3_024_000);
    }
  }

  /**
   * The address a WebSocket ban is keyed on.
   *
   * Express's `trust proxy` does not reach here — socket.io resolves
   * `handshake.address` from the raw upgrade request — so this is the one place
   * that still has to decide for itself, and it decides the way
   * `DdosProtectionMiddleware.extractClientIp` does: `X-Forwarded-For` counts
   * only when the peer that sent it is a proxy we run.
   *
   * It used to take the leftmost forwarded entry unconditionally, which made
   * every ban here worthless — `ws:banned:<ip>`, `ws:strikes:<ip>` and the
   * connection counter were all keyed on a string the banned client picks, so
   * evading a flood ban was one header away, and a flooder could equally pin
   * the ban on somebody else's address.
   */
  private getSocketIp(client: Socket): string {
    const peer = client.handshake.address || 'unknown';
    // Read per call, not once at import: the middleware reads the same variable
    // per instance, and a module-level `const` fixes the answer at the moment
    // this file is first imported — before a test can stub the environment, and
    // before a process that loads its `.env` late has one.
    if (!wsTrustedProxies().has(peer)) return peer;

    const forwarded = client.handshake.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
      if (ip && looksLikeIp(ip)) return ip;
    }
    return peer;
  }

  private extractEventName(context: ExecutionContext): string | null {
    try {
      // NestJS stores the event name in the handler metadata
      return (Reflect.getMetadata('message', context.getHandler()) as string) || null;
    } catch {
      return null;
    }
  }

  private measurePayload(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private safeJsonParse(raw: string): Record<string, any> | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
