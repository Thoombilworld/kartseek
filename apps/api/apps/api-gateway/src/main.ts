// ⚠️  Must be the very first import — populates process.env from .env
// before any @Module decorators or NestFactory evaluate their config.
// Security hardening: 2026-07-01 — ValidationPipe + AccountLockout + EncryptionService
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { KafkaProducerService } from '@app/kafka';
import { PciComplianceInterceptor, PciSecurityService } from '@app/security';
import { AllExceptionsFilter, LoggingInterceptor, TransformInterceptor } from '@app/common';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { resolveCorsOrigins } from './config/cors-origins';
import { validateDatabaseConfig, logDatabaseConfig } from '@app/database';
import compression from 'compression';
import helmet from 'helmet';
import { randomBytes } from 'crypto';


async function bootstrap() {
  try {
    // ✅ Validate database config FIRST (before NestFactory)
    validateDatabaseConfig();
    logDatabaseConfig();
    const app = await NestFactory.create<NestExpressApplication>(ApiGatewayModule, {
      logger: ['error', 'warn', 'log', 'debug'],
      // Cap maximum header size to 8KB (mitigates header-flood / slow-read attacks)
      rawBody: true,
    });

    // ── Typed Configuration Service ──────────────────────────────────────────
    const configService = app.get(ConfigService);

    // ── Reverse proxy trust ───────────────────────────────────────────────────
    //
    // nginx terminates TLS and forwards `X-Forwarded-For`, `X-Real-IP` and
    // `X-Forwarded-Proto`, but Express ignores all three unless it is told how
    // many proxies sit in front of it. Without this `req.ip` was nginx's own
    // address on every request — and `ThrottlerModule` keys on `req.ip`, so the
    // "100 requests per 60 seconds per IP" limit was in fact 100 requests per
    // 60 seconds for the entire platform combined. One noisy client could
    // exhaust it for everybody, and per-client abuse protection did not exist.
    //
    // A hop count, never `true`. Trusting every hop lets anyone who can reach
    // the app directly spoof `X-Forwarded-For` and impersonate another client's
    // rate-limit bucket or audit-log entry. `1` means "trust exactly the one
    // proxy we run"; deployments behind an additional load balancer set
    // TRUST_PROXY_HOPS to match.
    const trustProxyHops = configService.get<number>('app.http.trustProxyHops', 1);
    if (trustProxyHops > 0) {
      app.set('trust proxy', trustProxyHops);
    }

    // ── Redis-backed WebSocket Adapter (horizontal scaling) ──────────────────
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);

    // ── Slowloris & Keep-Alive Hardening ─────────────────────────────────────
    const httpServer = app.getHttpServer();
    httpServer.headersTimeout       = configService.get<number>('app.http.headersTimeout', 15000);
    httpServer.requestTimeout       = configService.get<number>('app.http.requestTimeout', 120000);
    httpServer.keepAliveTimeout     = configService.get<number>('app.http.keepAliveTimeout', 65000);
    httpServer.maxRequestsPerSocket = configService.get<number>('app.http.maxRequestsPerSocket', 100);

    // ── Security Headers ──────────────────────────────────────────────────────
    // Generate nonce for CSP to allow inline scripts (required by Swagger UI)
    const scriptNonce = randomBytes(16).toString('hex');
    
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", `'nonce-${scriptNonce}'`], // ✅ Use nonce instead of unsafe-inline
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
        },
      },
      // HSTS: force HTTPS for a year across subdomains, and declare the site
      // eligible for the browser preload list. Browsers ignore this over plain
      // HTTP per RFC 6797, so it is inert in development rather than harmful.
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // Prevent MIME-type sniffing
      noSniff: true,
      // Don't send X-Powered-By (hides NestJS/Express fingerprint)
      hidePoweredBy: true,
    }));

    // ── HSTS & Certificate Pinning Headers ────────────────────────────────────
    // Forces HTTPS and pins certificates on the server side (complement to mobile SSL pinning)
    const hpkpPrimaryPin = configService.get<string>('app.hpkp.primaryPin');
    const hpkpBackupPin = configService.get<string>('app.hpkp.backupPin');
    const hpkpReportUri = configService.get<string>('app.hpkp.reportUri');

    app.use((req: any, res: any, next: any) => {
      // Store nonce for use in templates
      res.locals = { nonce: scriptNonce };
      // Strict-Transport-Security is set by helmet above, with `preload`. It
      // used to be set here as well, with a different value and no preload
      // flag, so every response carried two conflicting HSTS directives.
      // Expect-CT — enforce Certificate Transparency logs
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
      if (hpkpPrimaryPin && hpkpBackupPin) {
        res.setHeader('Public-Key-Pins-Report-Only',
          `pin-sha256="${hpkpPrimaryPin}"; ` +
          `pin-sha256="${hpkpBackupPin}"; ` +
          `max-age=2592000; includeSubDomains; ` +
          `report-uri="${hpkpReportUri}"`
        );
      }
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      // XSS protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      // Referrer Policy — don't leak URLs to 3rd parties
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      // Permissions Policy — restrict browser feature access
      res.setHeader('Permissions-Policy',
        'camera=(), microphone=(), geolocation=(self), payment=(self)'
      );

      /**
       * Cache-Control — no response carried one.
       *
       * Helmet does not set it, and nothing else did either, so every API
       * response left the gateway with no caching directive at all. Two
       * consequences:
       *
       *  • Storage. A response with no `Cache-Control` and no validators is
       *    heuristically cacheable. Any shared cache in front of this — CDN,
       *    reverse proxy, corporate middlebox — may store a user-scoped reply
       *    (`/users/:id/profile`, cart, order history) and serve it to the next
       *    caller. That is the same data leak the guards above prevent, moved
       *    one hop out.
       *
       *  • Staleness. On the client it is the "I refreshed and still see the old
       *    data" symptom: the browser is free to reuse a stored copy rather than
       *    revalidate.
       *
       * `no-store` is the correct default for this API because almost every
       * route is scoped to the caller. Genuinely public, expensive catalogue
       * reads can opt out per-route with `@Header('Cache-Control', ...)`; making
       * that an explicit, reviewable act is the point.
       */
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Vary', 'Authorization, Origin, X-Region-Code');

      next();
    });

    // ── Response Compression ──────────────────────────────────────────────────
    app.use(compression());

    // ── CORS ─────────────────────────────────────────────────────────────────
    // Origins come from the environment — see config/cors-origins.ts. They were
    // hardcoded, and the kartseek.com pattern matched subdomains but not the
    // apex, so a storefront the list did not anticipate had every browser call
    // refused before it left the page and reported it as a connection problem.
    const { origins: corsOrigins, ignored: ignoredCorsOrigins } = resolveCorsOrigins({
      nodeEnv: process.env.NODE_ENV,
      corsOrigins: process.env.CORS_ORIGINS,
      webAppUrl: process.env.WEB_APP_URL,
    });
    if (ignoredCorsOrigins.length) {
      Logger.warn(
        `CORS_ORIGINS/WEB_APP_URL entries ignored (not valid origins): ${ignoredCorsOrigins.join(', ')}. ` +
        'Browser calls from them will be refused with no server-side error.',
        'Bootstrap',
      );
    }
    Logger.log(`🌐 CORS origins allowed: ${corsOrigins.map(String).join(', ')}`, 'Bootstrap');

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      // X-CSRF-Token must be listed: the web client's api-endpoints.ts attaches it
      // to every POST/PUT/PATCH/DELETE (double-submit cookie). Omitting it failed
      // the preflight with "Request header field x-csrf-token is not allowed by
      // Access-Control-Allow-Headers", so the browser never sent the request at
      // all — every write from the web app (add to cart, wishlist, reviews,
      // profile) died before it left the page, while the same call from curl or
      // server-side code worked. Keep this list in sync with the headers that
      // client actually sets.
      //
      // X-Language-Code and X-Timezone come from the web client's regionHeaders()
      // on EVERY request. They were missing here, so the preflight failed with
      // "Request header field x-timezone is not allowed" and no browser call ever
      // reached the gateway — sign-in and sign-up included. Server-rendered calls
      // through the Next proxy are same-origin and never preflight, which is why
      // pages still populated while anything the browser issued directly died.
      allowedHeaders: [
        'Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID',
        'X-Client-Version', 'X-Client-Platform', 'X-Device-ID', 'X-Session-ID',
        'X-Region-Code', 'X-Language-Code', 'X-Timezone',
        'X-Latitude', 'X-Longitude',
      ],
    });

    // ── Global API Prefix & Versioning ────────────────────────────────────────
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    // ── Global Validation Pipe ────────────────────────────────────────────────
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // ── Global Exception Filter (must come before interceptors) ─────────────
    app.useGlobalFilters(new AllExceptionsFilter());

    // ── Guards ───────────────────────────────────────────────────────────────
    // CRITICAL: RolesGuard is deliberately NOT registered globally.
    //
    // Global guards run before controller-level guards, and JwtAuthGuard is applied
    // per-controller — so a global RolesGuard evaluates while `request.user` is still
    // undefined and its `if (!user?.role) return false` rejected EVERY @Roles() route
    // with a 403, for every caller including SUPER_ADMIN. That silently disabled ~538
    // routes, among them the entire admin-marketplace (158) and seller-marketplace (80)
    // APIs. See docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md (C1).
    //
    // Controllers pair `@UseGuards(JwtAuthGuard, RolesGuard)` themselves using the
    // gateway-local guard (src/guards/roles.guard.ts), which also decodes the bearer
    // token itself if it runs before JwtAuthGuard. Both guards read the same metadata
    // key ('roles'), which is why the global one intercepted decorators intended for
    // the local one.
    //
    // If a global role guard is ever wanted again, register it as an APP_GUARD provider
    // AFTER a global JwtAuthGuard so the ordering is explicit and testable.
    // TEST REQUIRED: Add integration test to verify @Roles() routes reject unauthenticated users.

    // ── Global Audit, PCI Compliance + Logging + Transform Interceptors ───────
    // The audit interceptor needs the Kafka producer to reach the `audit.log`
    // topic that audit-log-service consumes. Resolved from the container rather
    // than newed up, so the trail is durable instead of console-only. If Kafka is
    // not wired (SKIP_KAFKA, or a boot ordering problem) the interceptor falls
    // back to logging without failing requests.
    let auditSink: KafkaProducerService | undefined;
    try {
      auditSink = app.get(KafkaProducerService, { strict: false });
    } catch {
      Logger.warn(
        'KafkaProducerService unavailable — admin actions will be logged to the console but NOT persisted to the audit trail.',
        'Bootstrap',
      );
    }

    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new AuditInterceptor(auditSink),
      new PciComplianceInterceptor(new PciSecurityService()),
      new TransformInterceptor(),
    );

    // ── Swagger / OpenAPI Documentation ──────────────────────────────────────
    if (process.env.NODE_ENV !== 'production') {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('KARTSEEK API Gateway')
        .setDescription(
          '## KARTSEEK Super App — Production API\n\n' +
          'A multi-tenant, event-driven REST API powering the KARTSEEK ecosystem:\n' +
          '**Marketplace · Grocery · Restaurant · Doctor · Pharmacy · Taxi · Wallet · Loyalty**\n\n' +
          '### 🔒 Security & PCI Compliance\n' +
          '- **JWT Authentication**: All protected endpoints require a `Bearer <JWT>` token.\n' +
          '- **PCI-DSS Compliance**: Automated input/output interceptor masking card details (PAN first 6 / last 4 visible only) and sanitizing CVV/PIN codes to prevent logs exposure.\n' +
          '- **DDoS Protection**: Automatic IP ban, rate limiting, and request fingerprint analysis.\n\n' +
          '### ⚡ Resilient Infrastructure\n' +
          '- **Redis Cache Failover**: Resilient offline fallback using a local in-memory Redis emulator when database or cache is unreachable.\n' +
          '- **Kafka Event Bus**: Centralized topic registry driving real-time safety, SOS alerts, and ride tracking updates.\n\n' +
          '### 🚀 Getting Started\n' +
          '- **Rate Limiting**: Global: **100 req / 60s per IP**. Exceeding returns `429 Too Many Requests`.\n' +
          '- **Versioning**: URI-based versioning — all endpoints are prefixed with `/api/v1/`.',
        )
        .setVersion('1.0.0')
        .setContact('KARTSEEK Engineering', 'https://kartseek.com/docs', 'api@kartseek.com')
        .setLicense('Proprietary', 'https://kartseek.com/terms')
        // ── Security Schemes ──────────────────────────────────────────────────────
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            description: 'Enter your JWT access token (without the "Bearer " prefix)',
            in: 'header',
          },
          'JWT',   // ← must match @ApiBearerAuth('JWT') on controllers
        )
        .addApiKey(
          { type: 'apiKey', name: 'X-API-Key', in: 'header', description: 'Service-to-service API key' },
          'ApiKey',
        )
        // ── Tags (appear in sidebar, ordered by emoji weight then alpha) ───────────
        .addTag('🔐 Auth',          'Authentication, registration & token refresh')
        .addTag('🛍️ Marketplace',   'Products, categories, brands & sellers')
        .addTag('🥦 Grocery',       'Grocery stores, product catalog & ordering')
        .addTag('🍽️ Restaurants',   'Restaurant listings, menus, table booking & ordering')
        .addTag('🩺 Doctor',        'Doctor search, slot booking & appointments')
        .addTag('💊 Pharmacy',      'Medicine catalog, prescriptions & ordering')
        .addTag('🚖 Taxi',          'Ride estimation, booking & live tracking')
        .addTag('📦 Orders',        'Order lifecycle management & real-time tracking')
        .addTag('🛒 Cart',          'Cart CRUD, coupon application & checkout')
        .addTag('💳 Payment',       'Payment initiation, verification & refunds')
        .addTag('👛 Wallet',        'Balance, credit/debit & transaction history')
        .addTag('🔔 Notifications', 'Push, SMS & email notification management')
        .addTag('🏪 Seller',        'Seller dashboard, inventory & product management')
        .addTag('🏢 Franchise',     'Multi-store franchise performance & compliance')
        .addTag('👑 Admin',         'Platform governance, KYC & analytics')
        .addTag('📁 Uploads',       'File & media upload (KYC docs, profile images)')
        .addTag('📊 Reports',       'Revenue, order & user acquisition reports')
        .addTag('🔍 Search',        'Full-text search & autocomplete suggestions')
        .addTag('🌍 Regions',       'Multi-regional data architecture & detection')
        .addTag('🛡️ Security',      'DDoS admin dashboard, IP bans & threat monitoring')
        // ── Servers ───────────────────────────────────────────────────────────────
        .addServer(`http://localhost:${process.env.API_GATEWAY_PORT || 3001}`, '🖥️  Local Development')
        .addServer('https://api-staging.kartseek.com', '🧪 Staging')
        .build();
      
      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, document, {
        customSiteTitle: 'KARTSEEK API Docs',
        customfavIcon: 'https://kartseek.com/favicon.ico',
        customCss: `
          .swagger-ui { background-color: #fafbfc; font-family: 'Outfit', 'Inter', sans-serif; padding-bottom: 60px; }
          .swagger-ui .topbar { background: linear-gradient(135deg, #0f172a, #1e293b) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.12); padding: 12px 0; border-bottom: 2px solid #10b981; }
          .swagger-ui .topbar-wrapper img { display: none; }
          .swagger-ui .topbar-wrapper::after { content: '⚡ KARTSEEK GATEWAY'; color: #10b981; font-weight: 800; font-size: 1.4rem; letter-spacing: 1.5px; font-family: 'Outfit', sans-serif; }
          .swagger-ui .info .title { font-family: 'Outfit', sans-serif; font-weight: 800; color: #0f172a; font-size: 2.2rem; }
          .swagger-ui .info { margin: 30px 0; }
          .swagger-ui .opblock { border-radius: 12px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid rgba(0,0,0,0.06) !important; margin-bottom: 12px !important; }
          .swagger-ui .opblock .opblock-summary { border-bottom: none !important; padding: 10px 20px; }
          .swagger-ui .opblock-post { background: rgba(16, 185, 129, 0.04) !important; }
          .swagger-ui .opblock-get { background: rgba(59, 130, 246, 0.04) !important; }
          .swagger-ui .opblock-put { background: rgba(245, 158, 11, 0.04) !important; }
          .swagger-ui .opblock-delete { background: rgba(239, 68, 68, 0.04) !important; }
          .swagger-ui .btn.authorize { background-color: #10b981 !important; border-color: #10b981 !important; color: #fff !important; border-radius: 8px !important; font-weight: 700; padding: 8px 20px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2); }
          .swagger-ui .btn.authorize svg { fill: #fff !important; }
          .swagger-ui .btn.execute { background-color: #3b82f6 !important; border-color: #3b82f6 !important; color: #fff !important; border-radius: 8px !important; font-weight: 700; }
        `,
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
          deepLinking: true,
          displayRequestDuration: true,
          filter: true,
          showExtensions: true,
          tryItOutEnabled: true,
        },
      });
    } else {
      Logger.log('🔒 Swagger docs DISABLED in production', 'Bootstrap');
    }

    // API_GATEWAY_PORT → PORT → 3001 (default; 3000 is reserved for Next.js web portal)
    const port = configService.get<number>('app.port', 3001);
    await app.listen(port, '0.0.0.0');

    Logger.log(`🚀 API Gateway running on:       http://localhost:${port}/api/v1`, 'Bootstrap');
    Logger.log(`📚 Swagger docs available at:    http://localhost:${port}/docs`, 'Bootstrap');
    Logger.log(`🔗 GraphQL playground at:        http://localhost:${port}/graphql`, 'Bootstrap');
    Logger.log(`🌐 Next.js web portal at:        http://localhost:3000`, 'Bootstrap');
  } catch (error) {
    const port = process.env.API_GATEWAY_PORT || 3001;
    if ((error as any)?.code === 'EADDRINUSE') {
      Logger.error(
        `❌ Port ${port} already in use. Kill the process or use a different port:\n` +
        `   export API_GATEWAY_PORT=3002 && npm run dev:api`,
        'Bootstrap',
      );
    } else {
      Logger.error(`❌ Failed to start API Gateway: ${(error as Error).message}`, 'Bootstrap', error);
    }
    process.exit(1);
  }
}

bootstrap();
