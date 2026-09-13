import { Controller, Get, Inject, Optional, Req, Res, UseGuards } from '@nestjs/common';
import * as net from 'node:net';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import {
  hasPermission,
  publicReadiness,
  readinessHttpStatus,
  worstOf,
  type DependencyStatus,
} from '@app/common';
import { RedisService } from '@app/redis';
import { Public } from '../decorators/public.decorator';
import { MarketplaceCatalogService } from '../services/marketplace-catalog.service';

/**
 * Just the sliver of the HTTP response this controller touches — see the
 * identically-named type in `@app/common`'s shared health controller.
 */
interface StatusSink {
  status(code: number): unknown;
}

/** One dependency's verdict. The index signature carries the gRPC counters. */
interface Check {
  status: string;
  latencyMs?: number;
  detail?: string;
  error?: string;
  /** True when an in-process emulator answered instead of the real store. */
  emulated?: boolean;
  [metric: string]: unknown;
}

/**
 * Unified Health Check Controller
 *
 * Provides liveness, readiness, metrics, and service-catalog endpoints.
 * Used by Docker HEALTHCHECK, Kubernetes liveness/readiness probes, and monitoring.
 *
 * Endpoints:
 *  GET /health           → liveness; 200 while the process runs, no dependency touched
 *  GET /health/ready     → readiness; a real query, a real PING, socket connects,
 *                          and **503 when a dependency is down** — the status line
 *                          is the only part a readinessProbe reads
 *  GET /health/metrics   → runtime memory & CPU metrics (staff only)
 *  GET /health/services  → catalog of every configured microservice (staff only)
 *
 * Every route here is `@Public()` under `JwtAuthGuard`, which is *optional*
 * authentication: an anonymous probe (the kubelet holds no token) passes
 * through with no `request.user`, while a request that does carry a Bearer
 * token has it verified and `request.user` populated. That is what makes the
 * staff/anonymous split below real rather than decorative — without a guard on
 * the route nothing ever sets `request.user`, and the detailed branch would be
 * dead code. It also means `DEV_AUTH_BYPASS` cannot reach these routes: the
 * guard's bypass sits after its `@Public()` return, so an anonymous local
 * request is anonymous here too.
 */
@ApiTags('🏥 Health')
@Controller()
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly marketplaceCatalog: MarketplaceCatalogService,
    /**
     * Optional: `SKIP_DB=true` leaves no DataSource bound at all (see
     * `api-gateway.module.ts`). Absent is not the same as healthy, so
     * `readiness()` distinguishes the two rather than omitting the check.
     */
    @Optional() @Inject(DataSource) private readonly dataSource: DataSource | null,
  ) {}

  /**
   * Whether this caller may see internal topology — `perm:system.health`.
   *
   * This was a role test (`ADMIN || SUPER_ADMIN`), which is the wrong shape for
   * what it protects. The full board names all 26 internal ports, every gRPC
   * URL, the broker list, the database name and the username the gateway
   * connects as, and a driver error message during an outage; the service
   * catalogue is a map of the platform's whole internal surface (AUD2-072).
   * Who may read that is a permission decision, and the vocabulary already had
   * the key for it: `system.health` is carried by `admin` and deliberately not
   * by `regional_admin`, whose remit is one market's records, not the
   * platform's topology.
   *
   * `hasPermission` is `RolesGuard`'s own `perm:` verdict, shared rather than
   * re-implemented, so the board and a `@Roles('perm:system.health')` route can
   * never disagree about what the key means. SUPER_ADMIN carries `'*'` and is
   * unaffected.
   *
   * The gate cannot be the guard itself. These routes are `@Public()` because a
   * kubelet holds no token, and a readiness probe that can answer 403 is a
   * probe that restarts healthy pods — so an unpermitted caller is answered
   * with the reduced body, exactly as an anonymous one is, and never with a
   * rejection. That also means a revoked or expired token simply stops being
   * privileged here: `JwtAuthGuard` leaves `request.user` unset, the claim is
   * absent, and the board reduces.
   */
  private isStaff(req: unknown): boolean {
    return hasPermission((req as any)?.user, 'system.health');
  }

  // ── Root Endpoint ────────────────────────────────────────────────────────────
  @Public()
  @Get()
  @ApiOperation({ summary: 'Root API endpoint — returns a simple welcome message' })
  @ApiOkResponse({ description: 'API is reachable' })
  root() {
    return {
      message: 'Welcome to KARTSEEK API Gateway',
      version: process.env.npm_package_version ?? '1.0.0',
      status: 'ok',
      docs: '/api/docs',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Liveness Probe ─────────────────────────────────────────────────────────
  // Skip throttle: Kubernetes/load balancers probe health frequently.
  // Global throttler (100 req/60s) would cause false unavailability alerts.
  /**
   * Liveness: the process, and nothing it talks to. Always 200 while it runs.
   *
   * This briefly called `readiness()` on every hit, to carry a one-line
   * dependency roll-up. That was the wrong shape twice over: it spent a query,
   * a PING and two socket connects per probe interval, and it made what
   * liveness reports depend on a store — so the moment anyone points a
   * `livenessProbe` here, a blinking dependency starts restarting healthy pods.
   * The aggregate lives on `/health/ready`, which is what a readiness probe and
   * a load balancer should read, and which carries the status code to match.
   */
  @SkipThrottle()
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Liveness probe — 200 while the process runs; no dependency is touched',
  })
  @ApiOkResponse({ description: 'Service is alive' })
  liveness() {
    return {
      status: 'ok',
      service: 'api-gateway',
      version: process.env.npm_package_version ?? '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? 'development',
      uptime: Math.round(process.uptime()),
      readiness: '/api/v1/health/ready',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Readiness Probe ────────────────────────────────────────────────────────
  // Skip throttle: same reason as liveness probe.
  @SkipThrottle()
  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe — a real query, a real PING; detail for admins only' })
  @ApiOkResponse({ description: 'All dependencies are connected and ready' })
  async readiness(@Res({ passthrough: true }) res: StatusSink, @Req() req?: unknown) {
    const checks: Record<string, Check> = {};

    // ── Redis: the store's own verdict ─────────────────────────────────────
    // Was `ping().toLowerCase().startsWith('pong') ? 'up' : 'degraded'`, and
    // the emulator answers 'PONG (memory)' — so a Redis outage read as `up`
    // while all 26 processes diverged onto private in-process sessions, refresh
    // slots, rate limits, OTPs and carts (AUD2-024). `health()` is the answer
    // that can say `emulated`.
    checks['redis'] = await this.redis.health();

    // ── PostgreSQL ─────────────────────────────────────────────────────────
    // Was a TCP connect to DB_HOST:DB_PORT. That proves a listener, not a
    // usable database: a wrong password, a missing database and a DataSource
    // that failed to initialise all reported `up` (AUD2-069). Now the probe
    // runs a query through the connection the application itself uses.
    if (process.env.SKIP_DB === 'true') {
      checks['postgresql'] = {
        status: 'skipped',
        detail: 'SKIP_DB=true — no connection attempted',
      };
    } else if (!this.dataSource) {
      checks['postgresql'] = { status: 'down', error: 'no DataSource is bound in this process' };
    } else {
      const t0 = Date.now();
      try {
        await this.dataSource.query('SELECT 1');
        const opts = (this.dataSource.options ?? {}) as { database?: unknown; username?: string };
        checks['postgresql'] = {
          status: 'up',
          latencyMs: Date.now() - t0,
          detail: `SELECT 1 on ${String(opts.database ?? 'unknown')} as ${opts.username ?? 'unknown'}`,
        };
      } catch (err: any) {
        checks['postgresql'] = {
          status: 'down',
          latencyMs: Date.now() - t0,
          error: err?.message ?? 'query failed',
        };
      }
    }

    // ── Kafka and MongoDB ──────────────────────────────────────────────────
    // Both stay socket connects. A broker metadata handshake on every probe
    // interval is not worth its cost, and the gateway is not the process that
    // owns the Mongo connection — so each says in its `detail` exactly how much
    // it proves, rather than letting `up` be read as more than it is.
    if (process.env.SKIP_KAFKA === 'true') {
      checks['kafka'] = { status: 'skipped', detail: 'SKIP_KAFKA=true — producer is a no-op' };
    } else {
      const [kHost, kPort] = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
        .split(',')[0]
        .split(':');
      checks['kafka'] = await this.probe(
        kHost || 'localhost',
        Number(kPort ?? 9092),
        'TCP connect only; a broker that is listening but not accepting metadata reads as up',
      );
    }

    const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/kartseek_catalog';
    try {
      const mu = new URL(mongoUri.replace(/^mongodb\+srv:/, 'mongodb:'));
      checks['mongodb'] = await this.probe(
        mu.hostname || 'localhost',
        Number(mu.port || 27017),
        'TCP connect only; audit-log-service /health/ready is the authoritative Mongo check',
      );
    } catch {
      checks['mongodb'] = { status: 'unknown', detail: 'MONGO_URI is not parseable' };
    }

    // ── Marketplace gRPC ───────────────────────────────────────────────────
    // Catalogue reads fall back to TCP when this channel breaks, so a failure is
    // invisible in responses. Surfaced here (with counters) so it is alertable —
    // 'degraded' means some reads are on the fallback, 'down' means all of them.
    checks['marketplace-grpc'] = this.marketplaceCatalog.stats();

    // `down` beats `degraded` beats ready. The old roll-up looked only for
    // `down`, so an emulated Redis or a half-failing gRPC channel still
    // answered `ready`.
    const status = worstOf(checks as Record<string, DependencyStatus>);

    // The status line is the only part a `readinessProbe` or a `curl -f`
    // HEALTHCHECK reads. `down` is a 503 that takes this process out of the
    // Service's endpoint list; `degraded` stays 200, because a process serving
    // on an emulated cache is still serving and evicting it would turn a
    // warm-cache problem into an outage.
    res.status(readinessHttpStatus(status));

    if (this.isStaff(req)) {
      return {
        status,
        service: 'api-gateway',
        version: process.env.npm_package_version ?? '1.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV ?? 'development',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        checks,
        config: {
          skipDb: process.env.SKIP_DB === 'true',
          skipKafka: process.env.SKIP_KAFKA === 'true',
          skipRedis: process.env.SKIP_REDIS === 'true',
          port: process.env.API_GATEWAY_PORT ?? '3001',
        },
      };
    }

    // Anonymous: the verdict and one word per dependency. `detail` named the
    // database, the broker list and the Mongo URI, and `error` is a driver
    // message — a connection-level Postgres failure throws
    // `connect ECONNREFUSED <host>:<port>`, so keeping it handed an anonymous
    // caller the internal address of the database during the one moment, a real
    // outage, when that matters most (AUD2-072). The reason is not lost: it is
    // in this process's log and in the staff board above.
    return publicReadiness({ status, checks: checks as Record<string, DependencyStatus> });
  }

  // ── Runtime Metrics ────────────────────────────────────────────────────────
  // Skip throttle: monitoring systems may poll metrics frequently.
  @SkipThrottle()
  @Public()
  @Get('health/metrics')
  @ApiOperation({
    summary: 'Runtime memory, CPU & WebSocket latency metrics — admins only; a status otherwise',
  })
  async metrics(@Req() req?: unknown) {
    // Gated the same way as the service board: process memory, CPU, WebSocket
    // latency and ack-failure counts describe the inside of the platform, and
    // an anonymous caller has no reason to read them. Liveness already answers
    // "is this process up" for everyone.
    if (!this.isStaff(req)) return { status: 'ok' };

    const mem = process.memoryUsage();

    // Fetch WebSocket latency stats from Redis
    let wsLatency: { avgMs: number; minMs: number; maxMs: number; samples: number } | null = null;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = await this.redis.get(`stats:ws:latency:${today}`);
      if (raw) {
        const stats = JSON.parse(raw);
        if (stats.count > 0) {
          wsLatency = {
            avgMs: Math.round(stats.totalMs / stats.count),
            minMs: stats.minMs === Infinity ? 0 : stats.minMs,
            maxMs: stats.maxMs,
            samples: stats.count,
          };
        }
      }
    } catch {
      // Non-critical — latency stats unavailable
    }

    // Fetch ack failure count
    let ackFailures = 0;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = await this.redis.get(`stats:ws:ack_failures:${today}`);
      if (raw) ackFailures = parseInt(raw, 10) || 0;
    } catch {
      // Non-critical
    }

    return {
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(mem.external / 1024 / 1024)} MB`,
      },
      cpu: process.cpuUsage(),
      websocket: {
        latency: wsLatency ?? 'No measurements yet',
        ackFailuresToday: ackFailures,
      },
    };
  }

  /**
   * Open a TCP connection to `host:port` and close it immediately.
   *
   * Enough to distinguish "listening" from "nothing there", which is the
   * distinction readiness needs and the one the previous `configured` status
   * could not make. Deliberately not a protocol-level handshake: this runs on
   * every probe interval, so it stays cheap and bounded by `timeoutMs`.
   */
  private probe(host: string, port: number, detail: string, timeoutMs = 1500): Promise<Check> {
    return new Promise((resolve) => {
      const started = Date.now();
      const socket = new net.Socket();
      const done = (result: Check) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(result);
      };
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => done({ status: 'up', latencyMs: Date.now() - started, detail }));
      socket.once('timeout', () =>
        done({ status: 'down', detail, error: `no response in ${timeoutMs}ms` }),
      );
      socket.once('error', (err: Error) => done({ status: 'down', detail, error: err.message }));
      socket.connect(port, host);
    });
  }

  // ── Service Catalog ────────────────────────────────────────────────────────
  // Skip throttle: discovery requests should not be rate-limited.
  @SkipThrottle()
  @Public()
  @Get('health/services')
  @ApiOperation({
    summary: 'Service catalogue — ports and transports for admins; a count for everyone else',
  })
  services(@Req() req?: unknown) {
    const catalogue = this.buildCatalogue();
    // The full board names 26 internal ports, every gRPC URL and the broker
    // list — an anonymous map of the platform's internal surface (AUD2-072).
    // Anonymous callers get the count. `@Public()` under JwtAuthGuard means a
    // staff token is verified before it reaches the branch below, and that
    // DEV_AUTH_BYPASS does not manufacture one locally.
    if (!this.isStaff(req)) {
      return { status: 'ok', totalServices: Object.keys(catalogue).length };
    }

    const e = process.env;
    return {
      totalServices: Object.keys(catalogue).length,
      gateway: {
        port: e.API_GATEWAY_PORT ?? '3001',
        swagger: `http://localhost:${e.API_GATEWAY_PORT ?? '3001'}/docs`,
        graphql: `http://localhost:${e.API_GATEWAY_PORT ?? '3001'}/graphql`,
      },
      transport: {
        grpc: Object.entries(catalogue)
          .filter(([, v]) => v.grpcUrl)
          .map(([k, v]) => `${k} (${v.grpcUrl})`),
        tcp: Object.entries(catalogue)
          .filter(([, v]) => v.tcpPort)
          .map(([k, v]) => `${k} (${v.tcpPort})`),
        kafka: `event-driven → topics: ORDER_SERVICE, INVENTORY_SERVICE, NOTIFICATION_SERVICE | brokers: ${e.KAFKA_BROKERS ?? 'localhost:9092'}`,
      },
      services: catalogue,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * The service table, shared by both branches of `services()` so the count an
   * anonymous caller sees cannot drift from the board an admin sees.
   */
  private buildCatalogue() {
    // Reports all three transports per service. This used to carry httpPort and
    // grpcUrl only, which made it useless for confirming the TCP fan-out that
    // most inter-service calls actually travel over, and the grpc/tcp summary
    // lists below were a hardcoded five-entry sample that had drifted years out
    // of date. Both are now derived from the same table.
    const svc = (httpPort?: string, grpcUrl?: string, tcpPort?: string) => ({
      httpPort,
      grpcUrl,
      tcpPort,
    });
    const e = process.env;

    const catalogue: Record<string, ReturnType<typeof svc>> = {
      'auth-service': svc(e.AUTH_SERVICE_PORT, e.AUTH_SERVICE_GRPC_URL),
      'user-service': svc(e.USER_SERVICE_PORT, e.USER_SERVICE_GRPC_URL),
      'marketplace-service': svc(
        e.MARKETPLACE_SERVICE_PORT,
        e.MARKETPLACE_GRPC_URL,
        e.MARKETPLACE_TCP_PORT ?? '4002',
      ),
      // GROCERY_GRPC_URL, not GROCERY_SERVICE_GRPC_URL: the latter is not a
      // variable anything sets, so grocery was the one gRPC-capable service the
      // catalogue reported as having no gRPC endpoint.
      'grocery-service': svc(
        e.GROCERY_SERVICE_PORT,
        e.GROCERY_GRPC_URL,
        e.GROCERY_TCP_PORT ?? '4008',
      ),
      'restaurant-service': svc(
        e.RESTAURANT_SERVICE_PORT,
        e.RESTAURANT_GRPC_URL,
        e.RESTAURANT_TCP_PORT ?? '4018',
      ),
      'pharmacy-service': svc(
        e.PHARMACY_SERVICE_PORT,
        e.PHARMACY_SERVICE_GRPC_URL,
        e.PHARMACY_TCP_PORT ?? '4010',
      ),
      'doctor-service': svc(
        e.DOCTOR_SERVICE_PORT,
        e.DOCTOR_SERVICE_GRPC_URL,
        e.DOCTOR_TCP_PORT ?? '4007',
      ),
      'hotel-service': svc(
        e.HOTEL_SERVICE_PORT,
        e.HOTEL_SERVICE_GRPC_URL,
        e.HOTEL_TCP_PORT ?? '4025',
      ),
      'taxi-service': svc(e.TAXI_SERVICE_PORT, e.TAXI_SERVICE_GRPC_URL, e.TAXI_TCP_PORT ?? '4027'),
      'delivery-service': svc(e.DELIVERY_SERVICE_PORT, e.DELIVERY_GRPC_URL),
      'location-service': svc(
        e.LOCATION_SERVICE_PORT,
        e.LOCATION_SERVICE_GRPC_URL,
        e.LOCATION_TCP_PORT ?? '4013',
      ),
      'search-service': svc(e.SEARCH_SERVICE_PORT, undefined, e.SEARCH_TCP_PORT ?? '4023'),
      'cart-service': svc(e.CART_SERVICE_PORT, e.CART_SERVICE_GRPC_URL, e.CART_TCP_PORT ?? '4003'),
      'order-service': svc(
        e.ORDER_SERVICE_PORT,
        e.ORDER_SERVICE_GRPC_URL,
        e.ORDER_TCP_PORT ?? '4004',
      ),
      'payment-service': svc(
        e.PAYMENT_SERVICE_PORT,
        e.PAYMENT_SERVICE_GRPC_URL,
        e.PAYMENT_TCP_PORT ?? '4026',
      ),
      'wallet-service': svc(
        e.WALLET_SERVICE_PORT,
        e.WALLET_SERVICE_GRPC_URL,
        e.WALLET_TCP_PORT ?? '4014',
      ),
      'loyalty-service': svc(e.LOYALTY_SERVICE_PORT, undefined, e.LOYALTY_TCP_PORT ?? '4005'),
      'refund-service': svc(e.REFUND_SERVICE_PORT, undefined, e.REFUND_TCP_PORT ?? '4022'),
      'commission-service': svc(
        e.COMMISSION_SERVICE_PORT,
        undefined,
        e.COMMISSION_TCP_PORT ?? '4020',
      ),
      'payout-service': svc(e.PAYOUT_SERVICE_PORT, undefined, e.PAYOUT_TCP_PORT ?? '4021'),
      'notification-service': svc(e.NOTIFICATION_SERVICE_PORT, e.NOTIFICATION_GRPC_URL),
      'admin-service': svc(
        e.ADMIN_SERVICE_PORT,
        e.ADMIN_SERVICE_GRPC_URL,
        e.ADMIN_TCP_PORT ?? '4017',
      ),
      'franchise-service': svc(
        e.FRANCHISE_SERVICE_PORT,
        e.FRANCHISE_SERVICE_GRPC_URL,
        e.FRANCHISE_TCP_PORT ?? '4006',
      ),
      'audit-log-service': svc(e.AUDIT_LOG_SERVICE_PORT, undefined),
      'report-service': svc(
        e.REPORT_SERVICE_PORT,
        e.REPORT_SERVICE_GRPC_URL,
        e.REPORT_TCP_PORT ?? '4024',
      ),
      // `wallet-service-2` used to sit here, duplicating wallet-service on the
      // same port. It was pure double-count: it inflated the hardcoded
      // `totalServices: 27` to match itself, so the catalogue claimed one more
      // service than the platform runs.
    };

    return catalogue;
  }
}
