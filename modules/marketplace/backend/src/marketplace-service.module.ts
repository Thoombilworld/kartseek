import { Module, SetMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
// `EncryptionService` — bank account numbers are stored encrypted at rest.
import { EncryptionService } from '@app/security';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { FranchiseViewService } from './franchise/franchise-view.service';
import { CatalogService } from './catalog/catalog.service';
import { MarketplaceAnalyticsService } from './analytics/analytics.service';
import { MarketplaceAdminService } from './admin/admin.service';
import { MarketplaceFulfillmentService } from './fulfillment/fulfillment.service';
import { MarketplaceHomeCacheService } from './catalog/home-cache.service';
import { MarketplaceGrpcController } from './transport/grpc.controller';
import { BrandFollowService } from './brands';
import { Product } from './entities/product.entity';
import { Seller } from './entities/seller.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { ProductListing } from './entities/product-listing.entity';
import { ProductImage } from './entities/product-image.entity';
import { Review } from './entities/review.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';
import { ReturnRequest } from './entities/return-request.entity';
import { ProductReport } from './entities/product-report.entity';
import { PriceAlert } from './entities/price-alert.entity';
import { Coupon, CouponUsage } from './entities/coupon.entity';
import { FlashDeal, FlashDealNomination } from './entities/flash-deal.entity';
import { ShipmentTrackingEvent } from './entities/shipment-tracking-event.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from './entities/product-qa.entity';
import { DeliveryAssignment } from './entities/delivery-assignment.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { MarketplaceNotification } from './entities/marketplace-notification.entity';
import { GiftCard } from './entities/gift-card.entity';
import { BrandFollow } from './entities/brand-follow.entity';
import { BrandUpdate } from './entities/brand-update.entity';
// Seller-facing surface of the Marketplace module. seller-service used to be a
// separate deployable that reached into these same tables from another process;
// it is part of Marketplace, so it lives here and shares the module's DataSource.
import { SellerSettings } from './entities/seller-settings.entity';
import { SellerKyc } from './entities/seller-kyc.entity';
import { SellerBankAccount } from './entities/seller-bank-account.entity';
import { SellerStaff } from './entities/seller-staff.entity';
import { SellerPromotion } from './entities/seller-promotion.entity';
import { SellerSupportTicket } from './entities/seller-support-ticket.entity';
import { BankOffer } from './entities/bank-offer.entity';
import { ExchangeOffer } from './entities/exchange-offer.entity';
import { SellerController } from './seller/seller.controller';
import { SellerMessagesController } from './seller/seller.messages.controller';
import { SellerOwnershipGuard } from './seller/seller-ownership.guard';
import { SellerService } from './seller/seller.service';
import { HealthModule, SharedHealthController, buildEnvSchema, Joi } from '@app/common';
import { assertSynchronizeAllowed, databaseCredentials } from '@app/database';
import { resolveMarketplaceDbConfig, MARKETPLACE_DB_SCHEMA } from './db-config';
import { ALLOW_HTTP_KEY } from './transport/http-surface.guard';

/**
 * HttpSurfaceGuard answers 404 to every HTTP request on this service unless the
 * handler or its class carries the `@AllowHttp()` marking — that is what keeps
 * the duplicate copy of the whole marketplace API off port 3012. The health
 * routes are the one deliberate exception, and they now live in
 * `@app/common`'s SharedHealthController, which cannot import a marketplace
 * decorator without the shared library depending on one of its consumers.
 *
 * So the marking is applied from this side, on the class the guard actually
 * inspects. It is the same metadata `@AllowHttp()` writes; `SetMetadata` used
 * as a plain function is how Nest's own decorators are applied to a class
 * outside a decorator position.
 */
SetMetadata(ALLOW_HTTP_KEY, true)(SharedHealthController);

const envSchema = buildEnvSchema({
  MARKETPLACE_TCP_PORT: Joi.number().default(4002),
  MARKETPLACE_GRPC_PORT: Joi.number().default(5006),
  MARKETPLACE_SERVICE_PORT: Joi.number().default(3012),
  // Dedicated database — when set, the Marketplace service connects to its own
  // PostgreSQL instance, fully isolated from all other verticals. When absent,
  // falls back to the shared DB_* variables for dev/staging convenience.
  MARKETPLACE_DB_HOST: Joi.string().optional(),
  MARKETPLACE_DB_PORT: Joi.number().optional(),
  MARKETPLACE_DB_NAME: Joi.string().optional(),
  MARKETPLACE_DB_USER: Joi.string().optional(),
  MARKETPLACE_DB_PASSWORD: Joi.string().optional(),
});

// Entity classes must be listed explicitly, never globbed off __dirname. The
// Nest build bundles each service into a single dist/apps/<svc>/main.js, so
// `__dirname + '/**/*.entity.js'` matches zero files at runtime: TypeORM then
// connects with no metadata and *every* repository call throws, which surfaces
// as a blanket 500 on the catalog routes (and an empty catalog in the web app,
// because the gateway turns those 500s into 503s that the pages swallow).
const ENTITIES = [
  Product,
  Seller,
  Category,
  Brand,
  // Bank and exchange offers. These lived in the API gateway — entity, table
  // and all — while marketplace-service carried six admin methods for them
  // that published a Kafka event and returned a fabricated `bo-<timestamp>`
  // id without writing anything. The gateway held the only real
  // implementation, so the module that owns the catalogue could not read its
  // own offers. Ownership moved here; the gateway forwards.
  BankOffer,
  ExchangeOffer,
  ProductListing,
  ProductImage,
  Review,
  WishlistItem,
  MarketplaceOrder,
  ReturnRequest,
  Coupon,
  CouponUsage,
  ShipmentTrackingEvent,
  ProductVariant,
  ProductQuestion,
  ProductAnswer,
  DeliveryAssignment,
  ProductAttribute,
  MarketplaceNotification,
  GiftCard,
  BrandFollow,
  BrandUpdate,
  SellerSettings,
  SellerKyc,
  // Seller staff, promotions and support tickets. All three used to be
  // fabricated in memory and never stored — see the 1785850000000 migration.
  SellerStaff,
  SellerPromotion,
  SellerSupportTicket,
  // Payout destinations. Payouts previously accepted a `bankAccountId` that
  // referred to nothing at all.
  SellerBankAccount,
  // Flash deal campaigns and seller nominations. Both used to live in Redis
  // under a 24-hour TTL with no table behind them, which is why an admin's
  // campaign never reached a shopper — see flash-deal.entity.ts.
  FlashDeal,
  FlashDealNomination,
  // Shopper-filed listing reports. The product page's "Report Counterfeit"
  // control had no endpoint and no table — every report was discarded.
  ProductReport,
  // Price-drop watches. The wishlist offered "Notify for all price drops" with
  // no handler, no endpoint and nowhere to record the request.
  PriceAlert,
];

@Module({
  imports: [
    HealthModule.register({ service: 'marketplace-service', database: true, redis: true }),
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against process.cwd(). As an extracted microservice this
      // service is started from its own directory, so its own `.env` wins;
      // the platform file is kept as a fallback so the ~120 shared variables
      // (DB host, Redis, Kafka brokers, JWT secret) do not have to be copied
      // into every module during the transition. First match wins.
      envFilePath: ['.env', '../../../apps/api/.env'],
      validationSchema: envSchema,
      // `validationOptions: { abortEarly: false }` was removed for
      // @nestjs/config v12: it validates through Standard Schema now, and
      // `abortEarly` is a Joi option the new type does not accept. Joi still
      // works as the schema — what changes is that a bad .env reports its
      // first problem rather than all of them, so fixing one may reveal the
      // next.
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        return {
          type: 'postgres' as const,
          /**
           * The one module that did not spread this (AUD2-023).
           *
           * Dropping the spread dropped the SSL block — catalogue, orders and
           * seller KYC ran plaintext under `DB_SSL=true` — and with it the
           * pool, the connect timeout and the retry policy, so this service
           * took node-postgres's default of ten connections while the platform
           * budget assumed five. Calling the helper for its side effect alone,
           * as this factory did last, kept the guard and none of the policy.
           *
           * Spread first, then overridden: everything except the five values
           * below comes from the one helper.
           *
           * The prefix matters: this module reads `MARKETPLACE_DB_PASSWORD`, not
           * `DB_PASSWORD`, and its .env.example declares only the former.
           * Without it the helper refused to boot on a variable this service
           * never uses — masked in-repo by the fallback to apps/api/.env, fatal
           * for a module lifted out of this repository into an image of its own.
           */
          ...databaseCredentials(cfg, { envPrefix: 'MARKETPLACE_DB' }),
          // One resolver, shared with data-source.ts — see ./db-config.ts. The
          // two used to resolve these five values separately, with different
          // last resorts, so without a module .env the CLI and the service
          // reached different databases. `MARKETPLACE_DB_*` wins here where the
          // helper above reads the shared `DB_*`; the password refuses to
          // default on both sides.
          ...resolveMarketplaceDbConfig((key) => cfg.get<string>(key)),
          // Fixed, not configurable: each entity names this schema too.
          schema: MARKETPLACE_DB_SCHEMA,
          entities: ENTITIES,
          // Auto-sync is refused, everywhere, by two independent guards:
          //
          //   • `validateDatabaseConfig()` in main.ts throws on DB_SYNCHRONIZE=true
          //     in EVERY environment — there is no dev escape hatch, and asking
          //     for one is a fatal boot, not a warning;
          //   • `assertSynchronizeAllowed()` here throws when auto-sync survives
          //     as far as this factory under NODE_ENV=production — reachable when
          //     SKIP_DB=true has skipped the first guard (AUD2-070).
          //
          // The schema comes from `migrations/` and nothing else (IN3). To iterate
          // on entities, generate a migration against a scratch database:
          // `docs/guides/database-migrations.md`, "Generating a migration". The
          // previous `NODE_ENV !== 'production'` default is why annotating an
          // existing column made dev auto-sync DROP and recreate it — which
          // emptied that column three times during the regional plan.
          synchronize: assertSynchronizeAllowed(
            cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
            cfg.get('NODE_ENV', 'development'),
            'marketplace-service',
          ),
        };
      },
    }),
    RedisModule,
    KafkaModule,
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [
    // HTTP is served by @app/common's SharedHealthController (see the
    // HealthModule.register above and the ALLOW_HTTP marking below it) — the
    // only routes HttpSurfaceGuard admits.
    MarketplaceController, // TCP (its HTTP routes are closed off)
    MarketplaceGrpcController, // gRPC (proto/marketplace.proto)
    SellerController, // HTTP, guarded
    SellerMessagesController, // TCP
  ],
  providers: [
    // MarketplaceService is the single live implementation (all logic inline).
    // BrandFollowService is the only extracted domain service still in use.
    MarketplaceService,
    CatalogService,
    MarketplaceAnalyticsService,
    MarketplaceAdminService,
    MarketplaceFulfillmentService,
    MarketplaceHomeCacheService,
    BrandFollowService,
    FranchiseViewService,
    SellerService,
    SellerOwnershipGuard,
    EncryptionService,
  ],
  exports: [
    MarketplaceService,
    CatalogService,
    MarketplaceAnalyticsService,
    BrandFollowService,
    SellerService,
  ],
})
export class MarketplaceServiceModule {}
