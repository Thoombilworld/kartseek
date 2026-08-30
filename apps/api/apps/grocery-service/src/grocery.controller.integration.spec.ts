// ══════════════════════════════════════════════════════════════════════════
// GROCERY CONTROLLER — INTEGRATION TESTS
// Tests HTTP endpoint routing, validation, rate limiting, and the full
// request → service → response chain for all grocery endpoints.
// ══════════════════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { GroceryController } from './grocery.controller';
import { GroceryService } from './grocery.service';
import { GroceryAdminService } from './admin.service';
import { FranchiseViewService } from './franchise-view.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

describe('GroceryController (Integration)', () => {
  let app: INestApplication;
  let svc: jest.Mocked<Partial<GroceryService>>;
  let admin: jest.Mocked<Partial<GroceryAdminService>>;

  beforeAll(async () => {
    svc = {
      healthCheck: jest.fn().mockResolvedValue({ status: 'ok', service: 'grocery-service' }),
      getCategories: jest.fn().mockResolvedValue({ categories: [], total: 0 }),
      getCategoryById: jest.fn().mockResolvedValue({ id: 'fruits-vegetables', name: 'Fruits' }),
      getStores: jest.fn().mockResolvedValue({ stores: [], total: 0, page: 1, limit: 20 }),
      getStoreById: jest.fn().mockResolvedValue({ id: 'store-1', name: 'FreshMart' }),
      getProducts: jest.fn().mockResolvedValue({ storeId: 'store-1', data: [], total: 0 }),
      searchProducts: jest.fn().mockResolvedValue({ query: 'test', results: [] }),
      createGroceryOrder: jest.fn().mockResolvedValue({ success: true, orderId: 'ord-1' }),
      getOrderById: jest.fn().mockResolvedValue({ id: 'ord-1', status: 'PLACED' }),
      updateOrderStatus: jest.fn().mockResolvedValue({ success: true }),
      createFlashDeal: jest.fn().mockResolvedValue({ id: 'fd-1', status: 'draft' }),
      submitFlashDeal: jest.fn().mockResolvedValue({ id: 'fd-1', status: 'pending' }),
      approveFlashDeal: jest.fn().mockResolvedValue({ id: 'fd-1', status: 'approved' }),
      rejectFlashDeal: jest.fn().mockResolvedValue({ id: 'fd-1', status: 'rejected' }),
      pauseFlashDeal: jest.fn().mockResolvedValue({ id: 'fd-1', status: 'paused' }),
      resumeFlashDeal: jest.fn().mockResolvedValue({ id: 'fd-1', status: 'active' }),
      getFlashDeals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getActiveFlashDealsByStore: jest.fn().mockResolvedValue([]),
      submitReview: jest.fn().mockResolvedValue({ id: 'rev-1', rating: 4 }),
      getProductReviews: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      addToWishlist: jest.fn().mockResolvedValue({ id: 'w-1' }),
      removeFromWishlist: jest.fn().mockResolvedValue({ success: true }),
      getWishlist: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      reorderFromHistory: jest.fn().mockResolvedValue({ success: true, orderId: 'ord-new' }),
      getDeliveryTracking: jest.fn().mockResolvedValue({ orderId: 'ord-1', status: 'OUT_FOR_DELIVERY' }),
      exportProductsCsv: jest.fn().mockResolvedValue({ csv: 'name,price\nBananas,60', filename: 'products-store-1.csv' }),
      updateProductTranslation: jest.fn().mockResolvedValue({ success: true }),
      getProductTranslated: jest.fn().mockResolvedValue({ id: 'p1', name: 'Bananas' }),
      getStoreAnalytics: jest.fn().mockResolvedValue({ revenue: 5000 }),
      updateStoreSettings: jest.fn().mockResolvedValue({ success: true }),
      getStorePromotions: jest.fn().mockResolvedValue([]),
      toggleProductPromotion: jest.fn().mockResolvedValue({ success: true }),
      getLowStockItems: jest.fn().mockResolvedValue([]),
      getOrdersByStore: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getStoreByOwner: jest.fn().mockResolvedValue({ store: null, hasStore: false }),
      getStoreOwner: jest.fn().mockResolvedValue({ storeId: 'store-1', ownerId: 'user-1' }),
      createCategory: jest.fn().mockResolvedValue({ id: 'new-cat', name: 'New' }),
      updateCategory: jest.fn().mockResolvedValue({ id: 'new-cat', name: 'Updated' }),
      deleteCategory: jest.fn().mockResolvedValue({ success: true, deletedId: 'new-cat' }),
      createProduct: jest.fn().mockResolvedValue({ success: true, product: { id: 'p-1' } }),
      updateProduct: jest.fn().mockResolvedValue({ success: true, product: { id: 'p-1' } }),
      deleteProduct: jest.fn().mockResolvedValue({ success: true, deletedId: 'p-1' }),
      bulkImportProducts: jest.fn().mockResolvedValue({ uploaded: 2, errors: 0, errorDetails: [], total: 2 }),
      getProductById: jest.fn().mockResolvedValue({ id: 'p-1', name: 'Bananas' }),
      getStoreCategoriesByStoreId: jest.fn().mockResolvedValue({ storeId: 'store-1', categories: [], total: 0 }),
      getOrdersByCustomer: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      invalidateCategoryCache: jest.fn().mockResolvedValue({ success: true }),
    };

    // The admin console's `admin.grocery.*` handlers live on this service. It is a
    // controller dependency, so the module cannot compile without it — the whole
    // integration suite failed to boot when it was first introduced.
    admin = {
      getDashboard: jest.fn().mockResolvedValue({ stores: { total: 0 } }),
      listStores: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
      getStoreDetail: jest.fn().mockResolvedValue({ id: 'store-1', stats: {} }),
      setStoreStatus: jest.fn().mockResolvedValue({ success: true }),
      listOrders: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
      listDeliveryZones: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createDeliveryZone: jest.fn().mockResolvedValue({ success: true, zone: { id: 'z-1' } }),
      updateDeliveryZone: jest.fn().mockResolvedValue({ success: true, zone: { id: 'z-1' } }),
      deleteDeliveryZone: jest.fn().mockResolvedValue({ success: true, deletedId: 'z-1' }),
      listFlashDeals: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
      getReports: jest.fn().mockResolvedValue({ period: '30d', summary: {} }),
      getSettings: jest.fn().mockResolvedValue({ settings: {}, defaults: {} }),
      updateSettings: jest.fn().mockResolvedValue({ settings: {} }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Rate limiting with very high limits for tests (avoid test flakiness)
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
      ],
      controllers: [GroceryController],
      providers: [
        { provide: GroceryService, useValue: svc },
        { provide: GroceryAdminService, useValue: admin },
        // Controller dependency; the franchise TCP handlers are covered separately.
        { provide: FranchiseViewService, useValue: {} },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Health Check ────────────────────────────────────────────────────────

  describe('GET /grocery/health', () => {
    it('should return ok status', () => {
      return request(app.getHttpServer())
        .get('/grocery/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  // ── Categories ──────────────────────────────────────────────────────────

  describe('GET /grocery/categories', () => {
    it('should return categories list', () => {
      return request(app.getHttpServer())
        .get('/grocery/categories')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(svc.getCategories).toHaveBeenCalled();
        });
    });
  });

  describe('GET /grocery/categories/:id', () => {
    it('should return a single category', () => {
      return request(app.getHttpServer())
        .get('/grocery/categories/fruits-vegetables')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('fruits-vegetables');
        });
    });
  });

  // ── Stores ──────────────────────────────────────────────────────────────

  describe('GET /grocery/stores', () => {
    it('should return stores list', () => {
      return request(app.getHttpServer())
        .get('/grocery/stores')
        .expect(200)
        .expect((res) => {
          expect(svc.getStores).toHaveBeenCalled();
        });
    });
  });

  describe('GET /grocery/stores/:id', () => {
    it('should return store details', () => {
      return request(app.getHttpServer())
        .get('/grocery/stores/store-1')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('FreshMart');
        });
    });
  });

  // ── Products ────────────────────────────────────────────────────────────

  describe('GET /grocery/stores/:id/products', () => {
    it('should return products for a store', () => {
      return request(app.getHttpServer())
        .get('/grocery/stores/store-1/products')
        .expect(200)
        .expect((res) => {
          expect(svc.getProducts).toHaveBeenCalledWith('store-1', undefined, expect.any(Number), expect.any(Number));
        });
    });
  });

  // ── Search ──────────────────────────────────────────────────────────────

  describe('GET /grocery/search', () => {
    it('should return search results', () => {
      return request(app.getHttpServer())
        .get('/grocery/search?q=bananas')
        .expect(200)
        .expect((res) => {
          expect(svc.searchProducts).toHaveBeenCalledWith('bananas', undefined, undefined, 1, 30);
        });
    });
  });

  // ── Orders ──────────────────────────────────────────────────────────────

  describe('POST /grocery/orders', () => {
    it('should create a new order', () => {
      return request(app.getHttpServer())
        .post('/grocery/orders')
        .send({
          customerId: 'cust-1',
          storeId: 'store-1',
          items: [{ productId: 'p1', name: 'Bananas', weight: '1 dz', price: 60, quantity: 1 }],
          deliveryAddress: { line1: '123 Main', city: 'Doha', pincode: '00000', lat: 25.29, lng: 51.53 },
          paymentMethod: 'ONLINE',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('GET /grocery/orders/:id', () => {
    it('should return order details', () => {
      return request(app.getHttpServer())
        .get('/grocery/orders/ord-1')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('ord-1');
        });
    });
  });

  // ── Flash Deals ─────────────────────────────────────────────────────────

  describe('POST /grocery/flash-deals', () => {
    it('should create a flash deal', () => {
      return request(app.getHttpServer())
        .post('/grocery/flash-deals')
        .send({
          storeId: 'store-1',
          productId: 'p1',
          flashPrice: 49,
          stockLimit: 100,
          startTime: '2026-07-01T00:00:00Z',
          endTime: '2026-07-01T23:59:59Z',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBe('fd-1');
          expect(svc.createFlashDeal).toHaveBeenCalled();
        });
    });
  });

  describe('PATCH /grocery/flash-deals/:id/submit', () => {
    it('should submit flash deal for approval', () => {
      return request(app.getHttpServer())
        .patch('/grocery/flash-deals/fd-1/submit')
        .expect(200)
        .expect(() => {
          expect(svc.submitFlashDeal).toHaveBeenCalledWith('fd-1');
        });
    });
  });

  describe('PATCH /grocery/flash-deals/:id/approve', () => {
    it('should approve a flash deal', () => {
      return request(app.getHttpServer())
        .patch('/grocery/flash-deals/fd-1/approve')
        .expect(200)
        .expect(() => {
          expect(svc.approveFlashDeal).toHaveBeenCalledWith('fd-1');
        });
    });
  });

  describe('PATCH /grocery/flash-deals/:id/reject', () => {
    it('should reject a flash deal with reason', () => {
      return request(app.getHttpServer())
        .patch('/grocery/flash-deals/fd-1/reject')
        .send({ reason: 'Discount too low' })
        .expect(200)
        .expect(() => {
          expect(svc.rejectFlashDeal).toHaveBeenCalledWith('fd-1', { reason: 'Discount too low' });
        });
    });
  });

  describe('GET /grocery/flash-deals', () => {
    it('should return paginated flash deals', () => {
      return request(app.getHttpServer())
        .get('/grocery/flash-deals?page=1&limit=10')
        .expect(200)
        .expect(() => {
          expect(svc.getFlashDeals).toHaveBeenCalled();
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/grocery/flash-deals?status=active')
        .expect(200)
        .expect(() => {
          expect(svc.getFlashDeals).toHaveBeenCalled();
        });
    });
  });

  describe('GET /grocery/flash-deals/store/:storeId', () => {
    it('should return active flash deals for a store', () => {
      return request(app.getHttpServer())
        .get('/grocery/flash-deals/store/store-1')
        .expect(200)
        .expect(() => {
          expect(svc.getActiveFlashDealsByStore).toHaveBeenCalledWith('store-1');
        });
    });
  });

  // ── Reviews ─────────────────────────────────────────────────────────────

  describe('POST /grocery/stores/:storeId/products/:productId/reviews', () => {
    it('should submit a product review', () => {
      return request(app.getHttpServer())
        .post('/grocery/stores/store-1/products/p1/reviews')
        .send({ customerId: 'cust-1', rating: 5, comment: 'Excellent!' })
        .expect(201)
        .expect((res) => {
          expect(res.body.rating).toBe(4);
          expect(svc.submitReview).toHaveBeenCalledWith('store-1', 'p1', expect.objectContaining({ rating: 5 }));
        });
    });
  });

  describe('GET /grocery/stores/:storeId/products/:productId/reviews', () => {
    it('should return paginated reviews', () => {
      return request(app.getHttpServer())
        .get('/grocery/stores/store-1/products/p1/reviews?page=1&limit=20')
        .expect(200)
        .expect(() => {
          expect(svc.getProductReviews).toHaveBeenCalledWith('store-1', 'p1', 1, 20);
        });
    });
  });

  // ── Wishlist ────────────────────────────────────────────────────────────

  describe('POST /grocery/wishlist', () => {
    it('should add a product to wishlist', () => {
      return request(app.getHttpServer())
        .post('/grocery/wishlist')
        .send({ customerId: 'cust-1', productId: 'p1', storeId: 'store-1' })
        .expect(201)
        .expect(() => {
          expect(svc.addToWishlist).toHaveBeenCalled();
        });
    });
  });

  describe('DELETE /grocery/wishlist/:customerId/:productId', () => {
    it('should remove product from wishlist', () => {
      return request(app.getHttpServer())
        .delete('/grocery/wishlist/cust-1/p1')
        .expect(200)
        .expect(() => {
          expect(svc.removeFromWishlist).toHaveBeenCalledWith('cust-1', 'p1');
        });
    });
  });

  describe('GET /grocery/wishlist/:customerId', () => {
    it('should return customer wishlist', () => {
      return request(app.getHttpServer())
        .get('/grocery/wishlist/cust-1')
        .expect(200)
        .expect(() => {
          expect(svc.getWishlist).toHaveBeenCalledWith('cust-1', 1, 30);
        });
    });
  });

  // ── Reorder ─────────────────────────────────────────────────────────────

  describe('POST /grocery/orders/:id/reorder', () => {
    it('should clone past order items', () => {
      return request(app.getHttpServer())
        .post('/grocery/orders/ord-past/reorder')
        .send({ customerId: 'cust-1' })
        .expect(201)
        .expect(() => {
          expect(svc.reorderFromHistory).toHaveBeenCalledWith('ord-past', expect.objectContaining({ customerId: 'cust-1' }));
        });
    });
  });

  // ── Seller: Analytics & Settings ────────────────────────────────────────

  describe('GET /grocery/stores/:id/analytics', () => {
    it('should return store analytics', () => {
      return request(app.getHttpServer())
        .get('/grocery/stores/store-1/analytics')
        .expect(200)
        .expect(() => {
          expect(svc.getStoreAnalytics).toHaveBeenCalledWith('store-1', undefined);
        });
    });
  });

  describe('PATCH /grocery/stores/:id/settings', () => {
    it('should update store settings', () => {
      return request(app.getHttpServer())
        .patch('/grocery/stores/store-1/settings')
        .send({ isOpen: false })
        .expect(200)
        .expect(() => {
          expect(svc.updateStoreSettings).toHaveBeenCalledWith('store-1', { isOpen: false });
        });
    });
  });

  // ── CSV Export ──────────────────────────────────────────────────────────

  describe('GET /grocery/stores/:id/products/export', () => {
    it('should return CSV export', () => {
      return request(app.getHttpServer())
        .get('/grocery/stores/store-1/products/export')
        .expect(200)
        .expect((res) => {
          expect(svc.exportProductsCsv).toHaveBeenCalledWith('store-1');
          expect(res.headers['content-type']).toContain('text/csv');
        });
    });
  });

  // ── Translations ────────────────────────────────────────────────────────

  describe('PATCH /grocery/stores/:storeId/products/:productId/translations', () => {
    it('should update product translation', () => {
      return request(app.getHttpServer())
        .patch('/grocery/stores/store-1/products/p1/translations')
        .send({ locale: 'ar', name: 'موز' })
        .expect(200)
        .expect(() => {
          expect(svc.updateProductTranslation).toHaveBeenCalledWith(
            'store-1', 'p1',
            expect.objectContaining({ locale: 'ar', name: 'موز' }),
          );
        });
    });
  });

  describe('GET /grocery/stores/:storeId/products/:productId/translated', () => {
    it('should return translated product', () => {
      return request(app.getHttpServer())
        .get('/grocery/stores/store-1/products/p1/translated?locale=ar')
        .expect(200)
        .expect(() => {
          expect(svc.getProductTranslated).toHaveBeenCalledWith('store-1', 'p1', 'ar');
        });
    });
  });
});
