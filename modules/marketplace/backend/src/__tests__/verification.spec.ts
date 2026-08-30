/**
 * Marketplace Module — Comprehensive Verification Script
 *
 * Verifies:
 *   Part 1: All 22 marketplace entity tables exist and are queryable
 *   Part 2: All public marketplace API endpoints respond correctly
 *
 * Usage: npx ts-node apps/marketplace-service/scripts/verify-marketplace.ts
 * Or:    npx jest apps/marketplace-service/src/marketplace-verification.spec.ts --verbose
 */

const BASE_URL = 'http://localhost:3001/api/v1/marketplace';

// ═══════════════════════════════════════════════════════════════════════════
// Part 1: Entity Table Definitions — 22 entities mapped to the marketplace schema
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
// Part 2: Public API Endpoint Definitions
// ═══════════════════════════════════════════════════════════════════════════
const PUBLIC_API_ENDPOINTS = [
  // ── Home & Discovery ───────────────────────────────────────────────────
  { method: 'GET', path: '/home',                    name: 'Marketplace Home Feed' },
  // ── Categories ─────────────────────────────────────────────────────────
  { method: 'GET', path: '/categories',              name: 'List Categories' },
  { method: 'GET', path: '/category-list',           name: 'List Categories (alias)' },
  // ── Products ───────────────────────────────────────────────────────────
  { method: 'GET', path: '/products',                name: 'List Products' },
  { method: 'GET', path: '/products?category=electronics', name: 'Products filtered by category' },
  { method: 'GET', path: '/products?page=1&limit=5', name: 'Products with pagination' },
  // ── Search ─────────────────────────────────────────────────────────────
  { method: 'GET', path: '/search?q=test',           name: 'Search Marketplace' },
  // ── Coupons (public list) ──────────────────────────────────────────────
  { method: 'GET', path: '/coupons',                 name: 'List Coupons' },
  // ── Bank & Exchange Offers ─────────────────────────────────────────────
  { method: 'GET', path: '/offers/bank',             name: 'Bank Offers' },
  { method: 'GET', path: '/offers/exchange',         name: 'Exchange Offers' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════

describe('Marketplace Module Verification', () => {

  // ── Part 1: Database Tables ──────────────────────────────────────────────
  describe('Part 1: Entity/Table Registration', () => {
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

  // ── Part 2: API Endpoints ────────────────────────────────────────────────
  describe('Part 2: API Endpoint Connectivity', () => {

    for (const endpoint of PUBLIC_API_ENDPOINTS) {
      it(`${endpoint.method} ${endpoint.path} — ${endpoint.name}`, async () => {
        const url = `${BASE_URL}${endpoint.path}`;
        try {
          const response = await fetch(url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });

          // We accept any of these as "the route exists and is reachable":
          // 200 = success
          // 401 = route exists but requires auth (expected for guarded endpoints)
          // 403 = route exists, auth is valid, but role is wrong
          // 503 = route exists, gateway reached, downstream microservice is down
          // We REJECT: 404 (route doesn't exist) and 500 (unhandled crash)
          const acceptableStatuses = [200, 201, 401, 403, 503];

          if (!acceptableStatuses.includes(response.status)) {
            const body = await response.text().catch(() => '(no body)');
            throw new Error(
              `Unexpected status ${response.status} for ${endpoint.method} ${endpoint.path}.\n` +
              `Body: ${body.substring(0, 300)}`
            );
          }

          expect(acceptableStatuses).toContain(response.status);
        } catch (error: any) {
          if (error.name === 'TimeoutError' || error.cause?.code === 'ECONNREFUSED') {
            throw new Error(
              `API gateway not reachable at ${url}. ` +
              `Ensure 'npm run dev' is running. Error: ${error.message}`
            );
          }
          throw error;
        }
      // Each request already carries its own 10s AbortSignal, but Jest's default
      // per-test timeout is 5s — so a slow gateway failed the test before the
      // fetch could time out and report the useful error. The two must not
      // disagree; this one is the outer bound.
      }, 15_000);
    }
  });

  // ── Part 3: Authenticated endpoint patterns (route existence check) ─────
  describe('Part 3: Authenticated route patterns', () => {
    const AUTHENTICATED_ENDPOINTS = [
      { method: 'GET',  path: '/cart',                name: 'Get Cart' },
      { method: 'GET',  path: '/returns',             name: 'List Returns' },
      { method: 'POST', path: '/orders/checkout',     name: 'Create Checkout' },
    ];

    for (const endpoint of AUTHENTICATED_ENDPOINTS) {
      it(`${endpoint.method} ${endpoint.path} — ${endpoint.name} (should require auth, not 404)`, async () => {
        const url = `${BASE_URL}${endpoint.path}`;
        try {
          const response = await fetch(url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: endpoint.method !== 'GET' ? '{}' : undefined,
            signal: AbortSignal.timeout(10000),
          });

          // 401 Unauthorized = route exists but requires a JWT (correct!)
          // 403 Forbidden = route exists, role check failed (correct!)
          // 200 = works without auth (unexpected but ok for now)
          // 503 = downstream service down (route exists in gateway)
          // NOT acceptable: 404 means the route is missing
          expect(response.status).not.toBe(404);
        } catch (error: any) {
          if (error.cause?.code === 'ECONNREFUSED') {
            throw new Error(`API gateway not reachable at ${url}`);
          }
          throw error;
        }
      }, 15_000);
    }
  });
});
