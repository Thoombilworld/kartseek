import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
// `EncryptionService` — bank account numbers are stored encrypted at rest.
import { EncryptionService } from '@app/security';
import { MarketplaceController } from './marketplace.controller';
import { HealthController } from './health.controller';
import { MarketplaceService } from './marketplace.service';
import { FranchiseViewService } from './franchise-view.service';
import { CatalogService } from './catalog.service';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';
import { MarketplaceAdminService } from './marketplace-admin.service';
import { MarketplaceFulfillmentService } from './marketplace-fulfillment.service';
import { MarketplaceHomeCacheService } from './marketplace-home-cache.service';
import { MarketplaceGrpcController } from './marketplace.grpc.controller';
import { BrandFollowService } from './services';
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
import { SellerController } from './seller/seller.controller';
import { SellerMessagesController } from './seller/seller.messages.controller';
import { SellerOwnershipGuard } from './seller/seller-ownership.guard';
import { SellerService } from './seller/seller.service';
import { buildEnvSchema, Joi } from '@app/common';
import { databaseCredentials } from '@app/database';

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
  Product, Seller, Category, Brand,
  ProductListing, ProductImage,
  Review, WishlistItem, MarketplaceOrder,
  ReturnRequest, Coupon, CouponUsage,
  ShipmentTrackingEvent, ProductVariant,
  ProductQuestion, ProductAnswer,
  DeliveryAssignment, ProductAttribute,
  MarketplaceNotification, GiftCard,
  BrandFollow, BrandUpdate,
  SellerSettings, SellerKyc,
  // Seller staff, promotions and support tickets. All three used to be
  // fabricated in memory and never stored — see the 1785850000000 migration.
  SellerStaff, SellerPromotion, SellerSupportTicket,
  // Payout destinations. Payouts previously accepted a `bankAccountId` that
  // referred to nothing at all.
  SellerBankAccount,
  // Flash deal campaigns and seller nominations. Both used to live in Redis
  // under a 24-hour TTL with no table behind them, which is why an admin's
  // campaign never reached a shopper — see flash-deal.entity.ts.
  FlashDeal, FlashDealNomination,
  // Shopper-filed listing reports. The product page's "Report Counterfeit"
  // control had no endpoint and no table — every report was discarded.
  ProductReport,
  // Price-drop watches. The wishlist offered "Notify for all price drops" with
  // no handler, no endpoint and nowhere to record the request.
  PriceAlert,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        // Prefer dedicated MARKETPLACE_DB_* env vars; fall back to shared DB_*
        // so that dev/staging environments keep working without any config change.
        host: cfg.get<string>('MARKETPLACE_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('MARKETPLACE_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('MARKETPLACE_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('MARKETPLACE_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('MARKETPLACE_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
        schema: 'marketplace',
        entities: ENTITIES,
        // Safe to auto-sync in dev because the marketplace uses its own dedicated
        // schema — no cross-service ALTER TABLE conflicts can occur. In production,
        // use the init-marketplace-schema.sql migration instead.
        synchronize: cfg.get('NODE_ENV', 'development') !== 'production',
      }),
    }),
    RedisModule,
    KafkaModule,
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [
    HealthController,               // HTTP — the only route HttpSurfaceGuard admits
    MarketplaceController,          // TCP (its HTTP routes are closed off)
    MarketplaceGrpcController,      // gRPC (proto/marketplace.proto)
    SellerController,               // HTTP, guarded
    SellerMessagesController,       // TCP
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
export class MarketplaceModule {}
