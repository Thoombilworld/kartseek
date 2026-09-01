/**
 * Request bodies for the marketplace's admin and support routes.
 *
 * These exist because `marketplace.controller.ts` typed 48 of its 63 `@Body()`
 * parameters as `any` or an inline object type. Both are erased at runtime, so
 * the global `ValidationPipe({ whitelist: true, transform: true })` had no class
 * metadata to work from: nothing was validated, nothing was stripped, and raw
 * input reached the services and then Postgres. A non-uuid sent to the wishlist
 * route came back as `500 invalid input syntax for type uuid: "12345"`.
 *
 * Two rules were followed when writing these:
 *
 *  1. **Fields come from what the service actually reads**, not from what a
 *     sensible API would accept. Several services read both camelCase and
 *     snake_case spellings of the same field, so both are declared — dropping
 *     one would silently change behaviour.
 *  2. **Where a route persists a whole entity, every column is declared.**
 *     `whitelist: true` strips undeclared properties, so a partial DTO on such a
 *     route would quietly discard fields that used to be saved.
 */
import {
  IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject,
  IsUUID, IsIn, IsDateString, Min, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════════════════════
// Moderation
// ═══════════════════════════════════════════════════════════════════════════════

/** Shared by product rejection and brand rejection — both read exactly these. */
export class AdminRejectDto {
  @ApiProperty({ example: 'admin-uuid' })
  @IsString()
  @MaxLength(200)
  adminId: string;

  @ApiProperty({ example: 'Images do not match the listing' })
  @IsString()
  @MaxLength(2000)
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Customer-facing
// ═══════════════════════════════════════════════════════════════════════════════

export class AddToWishlistDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  productId: string;
}

/** A push/update a brand sends to its followers. */
export class CreateBrandUpdateDto {
  @ApiProperty({ example: 'NEW_PRODUCT' })
  @IsString()
  @MaxLength(80)
  type: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Catalogue structure
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Categories and subcategories share a service path — a subcategory is a
 * category with `parentId` set — so one DTO covers create, update and the
 * subcategory routes.
 *
 * The snake_case variants are not tidiness: `updateCategory` reads `is_active`,
 * `seo_title`, `seo_description` and `sort_order` alongside their camelCase
 * spellings, and whitelisting would drop whichever set was omitted here.
 */
export class CategoryUpsertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Set to make this a subcategory.' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'snake_case alias read by updateCategory.' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'snake_case alias read by updateCategory.' })
  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'snake_case alias read by updateCategory.' })
  @IsOptional()
  @IsString()
  seo_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'snake_case alias read by updateCategory.' })
  @IsOptional()
  @IsString()
  seo_description?: string;

  @ApiPropertyOptional({ description: 'Per-language name/description overrides.' })
  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;
}

export class AttributeUpsertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'SELECT' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ example: 'GB' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional({ description: 'Whether this attribute distinguishes variants.' })
  @IsOptional()
  @IsBoolean()
  isVariantAxis?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class BrandUpsertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Alias for `logo`; both are read.' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Merchandising
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `assertRenderableBanner` in the admin service does the real shape checking —
 * a banner that would render blank is rejected there with a specific message.
 * This only guarantees the fields arrive as the right types.
 */
export class BannerUpsertDto {
  @ApiPropertyOptional({ example: 'HERO' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

/**
 * The service accepts two spellings of the campaign window (`start`/`end` and
 * `windowStart`/`windowEnd`) and two of the discount floor, because both were in
 * use by different callers. Declaring only one pair would break the other.
 */
export class FlashDealUpsertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ description: 'Alias for `start`.' })
  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @ApiPropertyOptional({ description: 'Alias for `end`.' })
  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDiscount?: number;

  @ApiPropertyOptional({ description: 'Alias for `minDiscount`.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDiscountPercent?: number;

  @ApiPropertyOptional({ example: 'QA' })
  @IsOptional()
  @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ description: 'Alias for `regionCode`.' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class FeaturedProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class PageLayoutDto {
  @ApiPropertyOptional({ example: 'QA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Ordered list of home sections.' })
  @IsOptional()
  @IsArray()
  sections?: unknown[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Offers — every column is declared because these save a whole entity
// ═══════════════════════════════════════════════════════════════════════════════

export class BankOfferUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;

  @ApiPropertyOptional({ example: 'CREDIT' })
  @IsOptional()
  @IsIn(['CREDIT', 'DEBIT', 'ALL', 'EMI', 'UPI', 'WALLET'])
  cardType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() cardNetwork?: string;

  @ApiPropertyOptional({ example: 'PERCENTAGE' })
  @IsOptional()
  @IsIn(['PERCENTAGE', 'FLAT'])
  discountType?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() termsAndConditions?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) applicableCategories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) applicableCountries?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalUsageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) perUserLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
}

export class ExchangeOfferUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() exchangeCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxExchangeValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minExchangeValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) bonusAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsObject() eligibilityCriteria?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) applicableProductIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) applicableBrandIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) applicableCountries?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() iconUrl?: string;

  @ApiPropertyOptional({ example: 'PICKUP' })
  @IsOptional()
  @IsIn(['PICKUP', 'DROP_OFF', 'COURIER'])
  fulfillmentMode?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seller operations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A manual credit or debit against a seller's balance.
 *
 * `amount` is deliberately unconstrained in sign — an adjustment may be a
 * clawback — but it must be a number, which is what stopped the previous
 * `any` from letting a string through to the ledger.
 */
export class SellerWalletAdjustmentDto {
  @ApiProperty({ example: -250.5 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Refund for order KS-1042' })
  @IsString()
  @MaxLength(2000)
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fulfilment
// ═══════════════════════════════════════════════════════════════════════════════

export class AssignReturnPickupDto {
  @ApiProperty()
  @IsString()
  pickupPartnerId: string;

  @ApiProperty({ description: 'Required by the service signature.' })
  @IsDateString()
  pickupScheduledAt: string;
}

export class RedeemCouponDto {
  @ApiProperty()
  @IsString()
  couponId: string;

  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Amount actually taken off this order.' })
  @IsNumber()
  @Min(0)
  discountApplied: number;
}

/**
 * Posted by the courier, not by our own clients, so the shape is theirs and the
 * fields are exactly the six the ingest reads. Anything else a courier sends is
 * not consumed today and is dropped rather than persisted unexamined.
 */
export class CourierWebhookDto {
  @ApiProperty() @IsString() trackingId: string;
  @ApiProperty() @IsString() status: string;
  @ApiProperty() @IsString() location: string;
  @ApiProperty() @IsDateString() timestamp: string;
  @ApiProperty() @IsString() courierName: string;

  @ApiPropertyOptional() @IsOptional() @IsString() courierEventCode?: string;
}

export class CouponUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: 'PERCENTAGE' })
  @IsOptional() @IsIn(['PERCENTAGE', 'FLAT']) discountType?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) usageLimitPerUser?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoApply?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() firstOrderOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() sellerId?: string;
}

export class VariantUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsString() variantName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) stockQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) lowStockThreshold?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() dimensions?: Record<string, number>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Delivery
// ═══════════════════════════════════════════════════════════════════════════════

/** Mirrors the service signature exactly; `status` drives the timestamp written. */
export class UpdateDeliveryStatusDto {
  @ApiProperty({ example: 'ACCEPTED' })
  @IsString()
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsString() deliveryMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) deliveryNotes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) proofPhotos?: string[];

  @ApiPropertyOptional({ description: 'Lat/long captured at the doorstep.' })
  @IsOptional() @IsObject() deliveryCoordinates?: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) failureReason?: string;
}

export class SubmitDeliveryProofDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  proofPhotos: string[];

  @ApiProperty({ example: 'OTP' })
  @IsString()
  deliveryMode: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) deliveryNotes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsObject() coordinates?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Republished bodies
// ═══════════════════════════════════════════════════════════════════════════════
//
// Paired with `AdminForwardingValidationPipe`. These routes hand their payload
// to `kafka.publish(topic, dto)` or persist it wholesale, so the event *is* the
// body — whitelisting a partial DTO would shrink what consumers receive. Each
// class names the fields the service reads or that callers must supply; the
// rest passes through and is validated by whoever consumes the event.

export class CampaignUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
}

export class PromotionUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountValue?: number;
}

export class CommissionUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
}

export class HsnCodeUpsertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstRate?: number;
}

export class ComplaintUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) resolution?: string;
}

export class AdminNotificationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) message?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() audience?: string;
}

export class MarketplaceSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
}

export class SeoSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) metaDescription?: string;
}

export class SponsoredProductUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) bidAmount?: number;
}

export class ComplianceCountryDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QaModerationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

export class IndiaOpsConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() codEnabled?: boolean;
}

export class SupportTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) message?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}

export class ProductUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class ReturnRequestLegacyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ProductBundleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
}

export class DeliveryAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partnerId?: string;
}
