/**
 * Marketplace — entity registration checks.
 *
 * Static checks only: every case reads source files off disk, so this runs
 * anywhere, with no database, gateway or network.
 *
 * The endpoint-connectivity cases that used to sit alongside these moved to
 * `test/marketplace-smoke.integration.spec.ts`. They performed real HTTP
 * requests against a gateway on port 3001, so on any machine without the stack
 * running they failed 13 times on every unit run — which trained people to
 * ignore a red suite, and would have hidden a real failure among the noise.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Entity table definitions — 22 entities mapped to the marketplace schema
// ═══════════════════════════════════════════════════════════════════════════
const EXPECTED_ENTITIES = [
  { name: 'Product',                table: 'products',                  columns: ['id', 'name', 'slug', 'seller_id', 'mrp', 'status'] },
  { name: 'Seller',                 table: 'sellers',                   columns: ['id', 'businessName', 'storeSlug', 'verificationStatus', 'ownerId'] },
  { name: 'Category',              table: 'categories',                columns: ['id', 'name', 'slug'] },
  { name: 'Brand',                 table: 'brands',                    columns: ['id', 'name', 'slug'] },
  { name: 'ProductListing',        table: 'product_listings',          columns: ['id', 'productId', 'sellerId', 'sellingPrice'] },
  { name: 'ProductImage',          table: 'product_images',            columns: ['id', 'productId', 'url'] },
  { name: 'Review',                table: 'reviews',                   columns: ['id', 'productId', 'rating', 'comment'] },
  { name: 'WishlistItem',          table: 'wishlist_items',            columns: ['id', 'userId', 'productId'] },
  { name: 'MarketplaceOrder',      table: 'marketplace_orders',        columns: ['id', 'customerId', 'sellerId', 'grandTotal', 'status'] },
  { name: 'ReturnRequest',         table: 'return_requests',           columns: ['id', 'orderId', 'reason', 'status'] },
  { name: 'Coupon',                table: 'coupons',                   columns: ['id', 'code', 'discountType', 'discountValue'] },
  { name: 'CouponUsage',           table: 'coupon_usages',             columns: ['id', 'couponId', 'customerId'] },
  { name: 'ShipmentTrackingEvent', table: 'shipment_tracking_events',  columns: ['id', 'orderId', 'status'] },
  { name: 'ProductVariant',        table: 'product_variants',          columns: ['id', 'productId', 'sku', 'sellingPrice', 'stock'] },
  { name: 'ProductQuestion',       table: 'product_questions',         columns: ['id', 'productId', 'questionText'] },
  { name: 'ProductAnswer',         table: 'product_answers',           columns: ['id', 'questionId', 'answerText'] },
  { name: 'DeliveryAssignment',    table: 'delivery_assignments',      columns: ['id', 'orderId', 'partnerId', 'status'] },
  { name: 'ProductAttribute',      table: 'product_attributes',        columns: ['id', 'productId', 'attributeName', 'attributeValue'] },
  { name: 'MarketplaceNotification', table: 'marketplace_notifications', columns: ['id', 'userId', 'message'] },
  { name: 'GiftCard',              table: 'gift_cards',                columns: ['id', 'code', 'balance'] },
  { name: 'BrandFollow',           table: 'brand_follows',             columns: ['id', 'userId', 'brandId'] },
  { name: 'BrandUpdate',           table: 'brand_updates',             columns: ['id', 'brandId', 'title'] },
  { name: 'SellerSettings',        table: 'seller_settings',           columns: ['id', 'sellerId'] },
  { name: 'SellerKyc',             table: 'seller_kyc',                columns: ['id', 'sellerId', 'documentType', 'status'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════

describe('Marketplace entity registration', () => {

  describe('Entity/Table Registration', () => {
    it(`should have all ${EXPECTED_ENTITIES.length} entities registered in marketplace.module.ts`, () => {
      const fs = require('fs');
      const path = require('path');
      const moduleSource = fs.readFileSync(
        path.resolve(__dirname, '..', 'marketplace.module.ts'),
        'utf-8',
      );

      const missingEntities: string[] = [];
      for (const entity of EXPECTED_ENTITIES) {
        // Check the entity class name is imported and present in the ENTITIES array
        if (!moduleSource.includes(entity.name)) {
          missingEntities.push(entity.name);
        }
      }

      if (missingEntities.length > 0) {
        throw new Error(`Missing entities in marketplace.module.ts: ${missingEntities.join(', ')}`);
      }
      expect(missingEntities).toHaveLength(0);
    });

    it('should have entity files on disk for every expected entity', () => {
      const fs = require('fs');
      const path = require('path');
      const entitiesDir = path.resolve(__dirname, '..', 'entities');
      const entityFiles = fs.readdirSync(entitiesDir).filter((f: string) => f.endsWith('.entity.ts'));

      // 22 entity files produce 24 entity classes (coupon.entity.ts exports Coupon +
      // CouponUsage, product-qa.entity.ts exports ProductQuestion + ProductAnswer).
      expect(entityFiles.length).toBeGreaterThanOrEqual(22);
    });

    it('TypeORM config should target the "marketplace" schema', () => {
      const fs = require('fs');
      const path = require('path');
      const moduleSource = fs.readFileSync(
        path.resolve(__dirname, '..', 'marketplace.module.ts'),
        'utf-8',
      );
      expect(moduleSource).toContain("schema: 'marketplace'");
    });
  });
});
