import 'dotenv/config';
import { DataSource } from 'typeorm';
import { resolveMarketplaceDbConfig, MARKETPLACE_MIGRATIONS_TABLE } from './src/db-config';
import { Product } from './src/entities/product.entity';
import { Seller } from './src/entities/seller.entity';
import { Category } from './src/entities/category.entity';
import { Brand } from './src/entities/brand.entity';
import { BankOffer } from './src/entities/bank-offer.entity';
import { ExchangeOffer } from './src/entities/exchange-offer.entity';
import { ProductListing } from './src/entities/product-listing.entity';
import { ProductImage } from './src/entities/product-image.entity';
import { Review } from './src/entities/review.entity';
import { WishlistItem } from './src/entities/wishlist-item.entity';
import { MarketplaceOrder } from './src/entities/marketplace-order.entity';
import { ReturnRequest } from './src/entities/return-request.entity';
import { Coupon, CouponUsage } from './src/entities/coupon.entity';
import { ShipmentTrackingEvent } from './src/entities/shipment-tracking-event.entity';
import { ProductVariant } from './src/entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from './src/entities/product-qa.entity';
import { DeliveryAssignment } from './src/entities/delivery-assignment.entity';
import { ProductAttributeValue } from './src/entities/product-attribute-value.entity';
import { ProductAttribute } from './src/entities/product-attribute.entity';
import { MarketplaceNotification } from './src/entities/marketplace-notification.entity';
import { GiftCard } from './src/entities/gift-card.entity';
import { BrandFollow } from './src/entities/brand-follow.entity';
import { BrandUpdate } from './src/entities/brand-update.entity';
import { SellerSettings } from './src/entities/seller-settings.entity';
import { SellerKyc } from './src/entities/seller-kyc.entity';
import { SellerStaff } from './src/entities/seller-staff.entity';
import { SellerPromotion } from './src/entities/seller-promotion.entity';
import { SellerSupportTicket } from './src/entities/seller-support-ticket.entity';
import { SellerBankAccount } from './src/entities/seller-bank-account.entity';
import { FlashDeal, FlashDealNomination } from './src/entities/flash-deal.entity';
import { ProductReport } from './src/entities/product-report.entity';
import { PriceAlert } from './src/entities/price-alert.entity';

/**
 * The TypeORM CLI's DataSource for the **marketplace module's own** database.
 * **Migrations only**; no application code imports this.
 *
 *     npm run migration:show    # what is pending here
 *     npm run migration:run     # apply it
 *     npm run migration:revert  # undo the last one
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Until now the marketplace module had no migration runner at all. Its schema
 * came from `synchronize`, which is on for every non-production `NODE_ENV`
 * (`marketplace-service.module.ts:150`), and that is not a deployment path — it
 * is a development convenience with a destructive edge. Narrowing
 * `bank_offers.region_code` from `varchar` to `varchar(2)` in an entity made
 * `synchronize` DROP and recreate the column on the next boot, silently
 * emptying the two rows that had a market (R11, 2026-09-12). A column change
 * needs a migration that says what it does; an annotation that a sync engine
 * interprets is not one.
 *
 * ── Note for the INFRA plan ─────────────────────────────────────────────────
 *
 * This is deliberately the **minimum** runner for one module, added because R11
 * needed three columns and had nowhere to put them. Every other module backend
 * (grocery, hotel, restaurant, pharmacy, taxi, doctor, franchise) has the same
 * gap and the same `synchronize`-in-dev arrangement. Generalising this — one
 * runner per module database, a shared `migration:*` script shape, and a CI gate
 * that fails when an entity column has no migration behind it — is INFRA's to
 * do, not this task's. Four things it will want to keep from here:
 *
 *   • credentials resolve `MARKETPLACE_DB_*` first and `DB_*` second, exactly as
 *     `marketplace-service.module.ts` does, so the runner and the service can
 *     never reach different databases;
 *   • `schema: 'marketplace'`, because the `migrations` ledger has to live
 *     beside the tables it describes, and this database also carries `public.*`
 *     decoy copies of the marketplace tables (`project_marketplace_schema_decoys`)
 *     that an unqualified name resolves to first;
 *   • migrations listed explicitly rather than by glob: a bundled build makes a
 *     `__dirname` glob match nothing (`project_typeorm_entity_glob_webpack`).
 *
 * ── The entity list ─────────────────────────────────────────────────────────
 *
 * It used to be `entities: []`, for the reason `data-source.main.ts` gives: a
 * loaded set permits `schema:sync` and `migration:generate` from here, and a
 * generate run against a *partial* set emits a DROP per table it cannot see.
 * IN3 needs it populated — `migration:generate` diffs entities against a
 * database, and an empty list diffs nothing against everything, which emits a
 * DROP for every table there is. The hazard is the same one, so the list is
 * written out explicitly and copied verbatim from the service module's own,
 * never a `__dirname` glob (a bundled build makes one match nothing), and the
 * procedure in `docs/guides/database-migrations.md` greps the generated SQL
 * for DROP before the file is kept. `apps/api/test/module-data-sources.spec.ts`
 * holds the rest of the shape.
 *
 * ── The schema, and where the ledger lives ──────────────────────────────────
 *
 * This DataSource deliberately declares **no `schema`**. TypeORM builds the
 * migration ledger inside `options.schema` and does it *before* the first
 * migration's `up()` runs, so with `schema: 'marketplace'` a fresh dedicated database
 * died on `CREATE TABLE "marketplace"."migrations"` — schema does not exist — and no
 * `CREATE SCHEMA` inside a migration could ever run early enough to help. The
 * ledger is `public.marketplace_migrations` (see `src/db-config.ts`), and
 * `migrations/*-InitialMarketplaceSchema.ts` creates the schema as its first
 * statement. Each entity names `schema: 'marketplace'` itself, so `migration:generate`
 * still diffs the right schema.
 *
 * Connection details come from `resolveMarketplaceDbConfig` — the same function
 * `src/marketplace-service.module.ts` calls, so the runner and the service cannot
 * resolve to different databases. `MARKETPLACE_DB_*` wins, `DB_*` answers next.
 */
export const MarketplaceDataSource = new DataSource({
  type: 'postgres',
  // One resolver, shared with the service — see src/db-config.ts.
  ...resolveMarketplaceDbConfig((key) => process.env[key]),
  // No `schema` here on purpose: TypeORM would build the ledger inside it,
  // before the first migration could create it. The entities name it instead.
  entities: [
    Product,
    Seller,
    Category,
    Brand,
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
    SellerStaff,
    SellerPromotion,
    SellerSupportTicket,
    SellerBankAccount,
    FlashDeal,
    FlashDealNomination,
    ProductReport,
    PriceAlert,
    ProductAttributeValue,
  ],
  migrations: [
    'migrations/1786498000000-InitialMarketplaceSchema.ts',
    'migrations/1786502300000-OfferMarket.ts',
    'migrations/1786502700000-ProductListingMrp.ts',
    'migrations/1786503000000-ProductAttributeValues.ts',
  ],
  migrationsTableName: MARKETPLACE_MIGRATIONS_TABLE,
  // One transaction per migration: a failure rolls that migration back and
  // leaves every earlier one applied.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
