// Load .env synchronously BEFORE @Module decorator runs so SKIP_DB is readable
import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema, appConfig, databaseConfig, redisConfig, jwtConfig, kafkaConfig } from './config';
import { KafkaModule } from '@app/kafka';
import { GrpcClientModule } from '@app/grpc';
import { RedisModule } from '@app/redis';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@app/database';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { SecurityModule } from '@app/security';
import { GdprModule } from '@app/gdpr';
import { RegionModule } from '@app/region';
import { StorageModule } from '@app/storage';
import { KafkaConsumerService } from '@app/kafka';

import { AuthController } from './controllers/gateway.controller';
import { DdosAdminController } from './controllers/ddos-admin.controller';
import { HealthController } from './controllers/health.controller';
import { TaxiController } from './controllers/taxi.controller';
import { DeliveryController } from './controllers/delivery.controller';
import { UserController } from './controllers/user.controller';
import { TrackingGateway } from './socket.gateway';
import { TaxiTrackingGateway } from './gateways/taxi-tracking.gateway';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { ChatGateway } from './gateways/chat.gateway';
import { OrderGateway } from './gateways/order.gateway';
import { WsTrackingGrantService } from './services/ws-tracking-grant.service';
import { SellerOwnershipService } from './services/seller-ownership.service';
import { SellerGateway } from './gateways/seller.gateway';
import { FranchiseGateway } from './gateways/franchise.gateway';
import { HotelGateway } from './gateways/hotel.gateway';
import { DoctorQueueGateway } from './gateways/doctor.gateway';
import { UploadController } from './controllers/upload.controller';
import { BackgroundJobsService } from './background.service';
import { RestaurantController } from './controllers/restaurant.controller';
import { OrderController } from './controllers/order.controller';
import { MarketplaceGatewayController } from './controllers/marketplace.controller';
import { MarketplaceResolver } from './marketplace.resolver';
import { KafkaWsBridgeService } from './services/kafka-ws-bridge.service';
import { RegionController } from './controllers/region.controller';
import { PartnerController } from './controllers/partner.controller';
import { SellerController } from './controllers/seller.controller';
import { SellerMarketplaceController } from './controllers/seller-marketplace.controller';
import { PublicSellersController } from './controllers/public-sellers.controller';
import { AdminMarketplaceController } from './controllers/admin-marketplace.controller';
import { AdminRestaurantController } from './controllers/admin-restaurant.controller';
import { AdminPharmacyController } from './controllers/admin-pharmacy.controller';
import { AdminGroceryController } from './controllers/admin-grocery.controller';
import { AdminHotelController } from './controllers/admin-hotel.controller';
import { AdminDoctorController } from './controllers/admin-doctor.controller';
import { AdminTaxiController } from './controllers/admin-taxi.controller';
import { AdminResolver } from './admin.resolver';
import { RecommendationController } from './controllers/recommendation.controller';
import { RecommendationService } from './services/recommendation.service';
import { RecommendationGateway } from './gateways/recommendation.gateway';
import { ActivityTrackingInterceptor } from './interceptors/activity-tracking.interceptor';

import { LoyaltyGatewayController } from './controllers/loyalty.controller';
import { FranchiseGatewayController } from './controllers/franchise.controller';
import { WalletController } from './controllers/wallet.controller';
import { GroceryController } from './controllers/grocery.controller';
import { PharmacyController } from './controllers/pharmacy.controller';
import { DoctorController } from './controllers/doctor.controller';
import { LocalizationController } from './controllers/localization.controller';
import { GeoSecurityController } from './controllers/geo-security.controller';
import { AdminLayoutController } from './controllers/admin-layout.controller';
import { PaymentGatewayController } from './controllers/payment.controller';
import { HotelController } from './controllers/hotel.controller';
import { AdminStaticPagesController, PublicPagesController } from './controllers/static-pages.controller';
import { AdminSeoController } from './controllers/admin-seo.controller';
import { AdminCoreController } from './controllers/admin-core.controller';
import { TestSeedService } from './services/test-seed.service';
import { MarketplaceCatalogService } from './services/marketplace-catalog.service';
import { SellerOwnershipGuard } from './guards/seller-ownership.guard';
import { GroceryStoreOwnershipGuard } from './guards/grocery-store-ownership.guard';
import { SellerModuleGuard } from './guards/seller-module.guard';
import { SellerApprovalGuard } from './guards/seller-approval.guard';
import {
  TaxiVendor, TaxiVendorUser, TaxiDriver, TaxiVehicle, TaxiDriverDocument, TaxiVehicleDocument,
  TaxiRide, TaxiRideStatusHistory, TaxiRideLocation, TaxiFareRule, TaxiFareRuleVersion,
  TaxiSurgeRule, TaxiSurgeZone, TaxiSurgeEvent, TaxiCancellationRule, TaxiWaitingFeeRule,
  TaxiFareBreakdown, TaxiDriverEarning, TaxiVendorSettlement, TaxiCommissionRecord, TaxiPaymentRecord,
  TaxiSosCase, TaxiDispute, TaxiAuditLog,
  Partner, PartnerUser, PartnerRole, PartnerRoleAssignment, PartnerDocument, PartnerComplianceStatus,
  PartnerOnlineSession, PartnerLocationUpdate, PartnerEarning, PartnerPayout, PartnerSosCase,
  DeliveryPartner, DeliveryTask, DeliveryTaskStatusHistory, DeliveryPartnerEarning, DeliveryCodCollection, DeliveryReturnTask,
  PageLayout,
  StaticPage,
} from './entities';
import { User } from './entities/user.entity';

// Skip DB when no PostgreSQL is available locally (set SKIP_DB=true in .env)
const skipDb = process.env.SKIP_DB === 'true';

/**
 * Resolve the host for a service's TCP transport.
 *
 * Every TCP client below used to hardcode `127.0.0.1`. That is correct for the
 * single-host dev setup where all 26 services share a machine, and completely
 * wrong anywhere each service is its own container: loopback inside the gateway
 * pod is the gateway, so every marketplace/cart/order/payment call came back
 * ECONNREFUSED and surfaced as a 503. k8s/config.yaml supplies the cluster DNS
 * names; the loopback default keeps `npm run dev:all` working untouched.
 */
const svcHost = (name: string): string =>
  process.env[`${name}_SERVICE_HOST`] ?? '127.0.0.1';

@Module({
  imports: [
    // ── Env (must be first so all other modules can read config) ────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      // `validationOptions: { abortEarly: false }` was removed for
      // @nestjs/config v12: it validates through Standard Schema now, and
      // `abortEarly` is a Joi option the new type does not accept. Joi still
      // works as the schema — what changes is that a bad .env reports its
      // first problem rather than all of them, so fixing one may reveal the
      // next.
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, kafkaConfig],
    }),

    // ── Database (skipped when SKIP_DB=true) ────────────────────────────────
    // NOTE: the gateway must only register entities for tables it OWNS.
    // `orders` and `restaurants` were removed here — they are owned by order-service
    // and restaurant-service, and were registered but never queried.
    // Taxi and Delivery entities remain ONLY until the logic that queries them
    // (controllers/taxi.controller.ts, controllers/partner.controller.ts) is moved
    // into taxi-service / delivery-service. See Phase 1 of the isolation audit.
    ...(skipDb ? [] : [DatabaseModule.registerPostgres([
      TaxiVendor, TaxiVendorUser, TaxiDriver, TaxiVehicle, TaxiDriverDocument, TaxiVehicleDocument,
      TaxiRide, TaxiRideStatusHistory, TaxiRideLocation, TaxiFareRule, TaxiFareRuleVersion,
      TaxiSurgeRule, TaxiSurgeZone, TaxiSurgeEvent, TaxiCancellationRule, TaxiWaitingFeeRule,
      TaxiFareBreakdown, TaxiDriverEarning, TaxiVendorSettlement, TaxiCommissionRecord, TaxiPaymentRecord,
      TaxiSosCase, TaxiDispute, TaxiAuditLog,
      Partner, PartnerUser, PartnerRole, PartnerRoleAssignment, PartnerDocument, PartnerComplianceStatus,
      PartnerOnlineSession, PartnerLocationUpdate, PartnerEarning, PartnerPayout, PartnerSosCase,
      PageLayout,
      StaticPage,
      User,
    ])]),

    TypeOrmModule.forFeature([
      // BankOffer and ExchangeOffer moved to marketplace-service, which owns
      // the tables now. The gateway forwards to it instead of holding a
      // second connection to rows it does not own.
      PageLayout, User, StaticPage,
    ]),

    // ── Security: DDoS Protection + JWT Auth ────────────────────────────────
    SecurityModule,

    // ── GDPR & Data Privacy Compliance ──────────────────────────────────────
    GdprModule,

    // ── Multi-Regional Data Architecture ────────────────────────────────────
    RegionModule,

    // Rate Limiting Protection (Max 100 requests per 60 seconds per IP).
    // Registering the module only supplies the storage and the limits — it
    // applies nothing on its own. See the APP_GUARD below, without which this
    // block was inert and the gateway answered an unbounded number of requests
    // per IP despite the comment above promising otherwise.
    ThrottlerModule.forRoot([{
      ttl: 60_000,
      /*
       * Sized against what this application actually asks for.
       *
       * 100/min looked reasonable and was not: one grocery homepage load makes
       * about eleven API calls — categories, stores, brands, flash deals,
       * layout, cart, wishlist, region stats — and React StrictMode doubles that
       * in development, so a few page views exhausted the budget and the
       * storefront began answering 429 to ordinary browsing.
       *
       * One bucket, deliberately. Registering a second named throttler here does
       * not create an opt-in bucket: every named throttler applies to every
       * route unless that route skips it, so adding a strict `auth` entry
       * alongside this one silently imposed *its* limit of 10/min platform-wide.
       *
       * A global cap of this kind is anti-scraping and anti-DoS; it is not what
       * stops credential guessing, and lowering it far enough to try would break
       * the product. Credential endpoints should tighten it for themselves with
       * `@Throttle({ default: { limit: 10, ttl: 60_000 } })`, which overrides
       * this for that route alone.
       */
      limit: 600,
    }]),

    // Background CRON Jobs Engine
    ScheduleModule.forRoot(),

    // GraphQL Gateway Module
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // In production the schema stays in memory. As a file it is written
      // into the working directory at startup, and the container runs as a
      // non-root user in a root-owned directory, so the gateway died with
      // EACCES on schema.gql. Development keeps the file for tooling.
      autoSchemaFile: process.env.NODE_ENV === 'production' ? true : 'schema.gql',
      path: '/graphql',
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      onConnect: () => {},
    } as any),

    // Centralized Redis Cache & GEO Store
    RedisModule.register({ keyPrefix: 'kartseek:' }),

    // Asynchronous Event Bus (Kafka)
    KafkaModule.register(['ORDER_SERVICE', 'INVENTORY_SERVICE', 'NOTIFICATION_SERVICE']),

    // ── Synchronous RPC (gRPC) — all services with .proto definitions ────────
    GrpcClientModule.register([
      { name: 'AUTH_SERVICE',         packageName: 'auth',         protoFileName: 'auth.proto' },
      { name: 'USER_SERVICE_GRPC',    packageName: 'user',         protoFileName: 'user.proto' },
      { name: 'ORDER_SERVICE_GRPC',   packageName: 'order',        protoFileName: 'order.proto' },
      { name: 'RESTAURANT_GRPC',      packageName: 'restaurant',   protoFileName: 'restaurant.proto' },
      { name: 'PAYMENT_SERVICE_GRPC', packageName: 'payment',      protoFileName: 'payment.proto' },
      { name: 'NOTIFICATION_GRPC',    packageName: 'notification', protoFileName: 'notification.proto' },
      { name: 'TAXI_SERVICE_GRPC',    packageName: 'taxi',         protoFileName: 'taxi.proto' },
      { name: 'DELIVERY_GRPC',        packageName: 'delivery',     protoFileName: 'delivery.proto' },
      { name: 'GROCERY_GRPC',         packageName: 'grocery',      protoFileName: 'grocery.proto' },
      // Marketplace catalogue reads (browse/search/product/home) — the module's
      // highest-volume path, served over gRPC by MarketplaceGrpcController.
      { name: 'MARKETPLACE_GRPC',     packageName: 'marketplace',  protoFileName: 'marketplace.proto' },
    ]),

    // ── TCP Clients — services without .proto definitions ─────────────────────
    ClientsModule.register([
      { name: 'MARKETPLACE_SERVICE', transport: Transport.TCP, options: { host: svcHost('MARKETPLACE'), port: +(process.env.MARKETPLACE_TCP_PORT ?? 4002) } },
      { name: 'CART_SERVICE',       transport: Transport.TCP, options: { host: svcHost('CART'), port: +(process.env.CART_TCP_PORT       ?? 4003) } },
      // Distinct from the Kafka-backed 'ORDER_SERVICE' above: order *commands*
      // (place, cancel, read) are request/response and need a transport that
      // returns a reply. They were being sent over the Kafka client, which is a
      // no-op when SKIP_KAFKA is set and in any case had no listener on the
      // order service side.
      { name: 'ORDER_SERVICE_TCP',  transport: Transport.TCP, options: { host: svcHost('ORDER'), port: +(process.env.ORDER_TCP_PORT      ?? 4004) } },
      { name: 'LOYALTY_SERVICE',    transport: Transport.TCP, options: { host: svcHost('LOYALTY'), port: +(process.env.LOYALTY_TCP_PORT    ?? 4005) } },
      { name: 'FRANCHISE_SERVICE',  transport: Transport.TCP, options: { host: svcHost('FRANCHISE'), port: +(process.env.FRANCHISE_TCP_PORT  ?? 4006) } },
      { name: 'DOCTOR_SERVICE',     transport: Transport.TCP, options: { host: svcHost('DOCTOR'), port: +(process.env.DOCTOR_TCP_PORT     ?? 4007) } },
      { name: 'GROCERY_SERVICE',   transport: Transport.TCP, options: { host: svcHost('GROCERY'), port: +(process.env.GROCERY_TCP_PORT    ?? 4008) } },
      { name: 'PHARMACY_SERVICE',   transport: Transport.TCP, options: { host: svcHost('PHARMACY'), port: +(process.env.PHARMACY_TCP_PORT   ?? 4010) } },
      { name: 'LOCATION_SERVICE',   transport: Transport.TCP, options: { host: svcHost('LOCATION'), port: +(process.env.LOCATION_TCP_PORT   ?? 4013) } },
      { name: 'WALLET_SERVICE',     transport: Transport.TCP, options: { host: svcHost('WALLET'), port: +(process.env.WALLET_TCP_PORT     ?? 4014) } },
      { name: 'ADMIN_SERVICE',      transport: Transport.TCP, options: { host: svcHost('ADMIN'), port: +(process.env.ADMIN_TCP_PORT      ?? 4017) } },
      { name: 'RESTAURANT_SERVICE', transport: Transport.TCP, options: { host: svcHost('RESTAURANT'), port: +(process.env.RESTAURANT_TCP_PORT ?? 4018) } },
      // Seller is the seller-facing surface of the Marketplace module, not a module of
      // its own — it reads and writes Marketplace's own tables. The former standalone
      // seller-service was folded into marketplace-service, which now serves the
      // seller_* message patterns, so this token resolves to Marketplace's TCP port.
      { name: 'SELLER_SERVICE',     transport: Transport.TCP, options: { host: svcHost('SELLER'), port: +(process.env.MARKETPLACE_TCP_PORT ?? 4002) } },
      { name: 'COMMISSION_SERVICE', transport: Transport.TCP, options: { host: svcHost('COMMISSION'), port: +(process.env.COMMISSION_TCP_PORT ?? 4020) } },
      { name: 'PAYOUT_SERVICE',     transport: Transport.TCP, options: { host: svcHost('PAYOUT'), port: +(process.env.PAYOUT_TCP_PORT     ?? 4021) } },
      { name: 'REFUND_SERVICE',     transport: Transport.TCP, options: { host: svcHost('REFUND'), port: +(process.env.REFUND_TCP_PORT     ?? 4022) } },
      { name: 'SEARCH_SERVICE',     transport: Transport.TCP, options: { host: svcHost('SEARCH'), port: +(process.env.SEARCH_TCP_PORT     ?? 4023) } },
      { name: 'REPORT_SERVICE',     transport: Transport.TCP, options: { host: svcHost('REPORT'), port: +(process.env.REPORT_TCP_PORT     ?? 4024) } },
      { name: 'HOTEL_SERVICE',      transport: Transport.TCP, options: { host: svcHost('HOTEL'), port: +(process.env.HOTEL_TCP_PORT      ?? 4025) } },
      { name: 'PAYMENT_SERVICE',    transport: Transport.TCP, options: { host: svcHost('PAYMENT'), port: +(process.env.PAYMENT_TCP_PORT    ?? 4026) } },
      { name: 'TAXI_SERVICE',       transport: Transport.TCP, options: { host: svcHost('TAXI'), port: +(process.env.TAXI_TCP_PORT       ?? 4027) } },
    ]),

    // ── Cloud Storage ─────────────────────────────────────────────────────────
    StorageModule,
  ],
  controllers: [
    HealthController,              // /health — liveness & readiness probes
    AuthController,                // /auth   — login, register, OTP, token refresh
    DdosAdminController,           // /admin/security — DDoS management
    TaxiController,                // /taxi   — ride booking & tracking
    DeliveryController,            // /delivery — partner assignment & tracking
    UserController,                // /users  — profiles, partners, KYC
    UploadController,              // /upload — file uploads
    RestaurantController,          // /restaurants — restaurant CRUD
    OrderController,               // /orders — order lifecycle
    MarketplaceGatewayController,  // /marketplace — products & categories
    RegionController,              // /regions  — region detection & config
    PartnerController,             // /api/partner — unified partner APIs
    SellerController,              // /seller — seller portal dashboard & inventory
    SellerMarketplaceController,   // /sellers/:id — seller-specific marketplace endpoints
    PublicSellersController,       // /sellers/register — seller business registration (authenticated)
    AdminMarketplaceController,    // /admin/marketplace — admin panel management
    AdminRestaurantController,     // /admin/restaurant — admin restaurant management
    AdminPharmacyController,       // /admin/pharmacy — admin pharmacy management
    AdminGroceryController,        // /admin/grocery — admin grocery management
    AdminHotelController,          // /admin/hotel — admin hotel management
    AdminDoctorController,         // /admin/doctor — admin doctor management
    AdminTaxiController,           // /admin/taxi — admin taxi management
    LoyaltyGatewayController,      // /api/loyalty - loyalty points
    FranchiseGatewayController,    // /api/franchise - franchise operations
    WalletController,              // /wallet — digital wallet & balance
    GroceryController,             // /grocery — grocery stores & products
    PharmacyController,            // /pharmacy — pharmacy stores & medicines
    DoctorController,              // /doctor — hospitals, doctors & appointments
    LocalizationController,        // /localization — global i18n, currencies, countries
    GeoSecurityController,         // /geo — IP geolocation, VPN/proxy detection, security
    AdminLayoutController,         // /admin/layouts — dynamic layout rendering
    HotelController,               // /hotels — hotel search, bookings, owner & admin
    PaymentGatewayController,      // /api/v1/payments — centralized payment microservice
    RecommendationController,      // /recommendations — personalized recommendations
    AdminStaticPagesController,    // /admin/static-pages — CMS for legal & company pages
    AdminSeoController,            // /admin/seo — per-path SEO metadata overrides
    AdminCoreController,           // /admin — platform-wide admin (users, KYC, audit, revenue)
    PublicPagesController,         // /pages/:slug — public page content API
  ],
  providers: [
    /*
     * Rate limiting, actually applied.
     *
     * `ThrottlerModule.forRoot()` above configures 100 requests per minute per
     * IP but registers no guard, so nothing enforced it: a burst of 115 requests
     * in one minute returned 115 x 200 and not a single 429. Only the taxi
     * controller was protected, because it applies `ThrottlerGuard` itself.
     * As an APP_GUARD the limit covers every route on the gateway, which is what
     * the sign-in, OTP and password-reset endpoints need to resist brute force.
     */
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Object-level authorisation for /sellers/:sellerId/* routes
    SellerOwnershipGuard,
    // Object-level authorisation for /grocery/stores/:storeId/* routes — resolves
    // ownership from `grocery_stores.ownerId`, which SellerOwnershipGuard cannot see
    GroceryStoreOwnershipGuard,
    // Module-level authorisation — keeps a seller inside their own portal's API
    SellerModuleGuard,
    // Lifecycle authorisation — keeps an unapproved or suspended seller out of it
    SellerApprovalGuard,
    // gRPC client for the Marketplace catalogue (falls back to TCP when down)
    MarketplaceCatalogService,
    // ── WebSocket Gateways ─────────────────────────────────────────────────
    TrackingGateway,          // /tracking  — unified tracking hub
    TaxiTrackingGateway,      // /taxi      — taxi driver GPS streaming
    NotificationsGateway,     // /notifications — push & topic notifications
    ChatGateway,              // /chat      — in-app messaging
    OrderGateway,             // /orders    — order lifecycle & delivery tracking
    WsTrackingGrantService,   // permission to join one order's live room
    SellerOwnershipService,   // does this login own that seller account?
    SellerGateway,            // /seller    — seller-scoped real-time events & WebRTC signalling
    FranchiseGateway,         // /franchise — franchise real-time events
    HotelGateway,             // /hotel — booking, availability & owner notifications
    DoctorQueueGateway,       // /doctor-queue — token queue & appointment tracking
    // ── Event Infrastructure ──────────────────────────────────────────────
    KafkaConsumerService,     // Kafka topic subscriber
    KafkaWsBridgeService,     // Kafka → WebSocket event bridge
    // ── Background Services ────────────────────────────────────────────────
    BackgroundJobsService,
    MarketplaceResolver,
    AdminResolver,
    // ── Test Seeding (dev mode only) ──────────────────────────────────
    TestSeedService,
    // ── Recommendation Engine ─────────────────────────────────────────────
    RecommendationGateway,    // /recommendations — real-time recommendation delivery
    RecommendationService,    // Core recommendation scoring engine
    ActivityTrackingInterceptor, // Global activity tracker (auto-registered as APP_INTERCEPTOR below)
    { provide: 'APP_INTERCEPTOR', useClass: ActivityTrackingInterceptor },
  ],
})
export class ApiGatewayModule {}
