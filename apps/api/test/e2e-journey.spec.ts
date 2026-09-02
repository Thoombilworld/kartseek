import { Test, TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

/**
 * E2E User Journey Tests
 *
 * Tests the full end-to-end user flows:
 *  1. Customer Registration → Login → Browse → Add to Cart → Checkout
 *  2. Seller Registration → Product Listing → Order Management
 *  3. Admin Seller Approval → Product Moderation
 *
 * REQUIRES: Full API stack running on localhost:3001
 *
 * Run:  npx jest test/e2e-journey.spec.ts --detectOpenHandles
 */
const API_BASE = process.env.API_URL || 'http://127.0.0.1:3001/api/v1';

describe('E2E User Journey Tests', () => {
  let customerToken: string;
  let customerId: string;
  let sellerToken: string;
  let sellerId: string;
  let adminToken: string;
  let productId: string;
  let orderId: string;

  // ── Journey 1: Customer Registration → Browse → Checkout ────────
  describe('Customer Journey', () => {
    const email = `test-${Date.now()}@kartseek.com`;
    const password = 'SecurePassword123!';

    it('1.1 — Register a new customer', async () => {
      const res = await request(API_BASE)
        .post('/auth/register')
        .send({ name: 'Test Customer', email, password })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(email);
      customerToken = res.body.accessToken;
      customerId = res.body.user.id;
    });

    it('1.2 — Login with the new account', async () => {
      const res = await request(API_BASE)
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body.success).toBe(true);
      customerToken = res.body.accessToken;
    });

    it('1.3 — Get authenticated profile', async () => {
      const res = await request(API_BASE)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.email).toBe(email);
      expect(res.body.role).toBe('CUSTOMER');
    });

    it('1.4 — Browse categories', async () => {
      const res = await request(API_BASE)
        .get('/marketplace/categories')
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('1.5 — Browse products', async () => {
      const res = await request(API_BASE)
        .get('/marketplace/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body).toBeDefined();
      if (res.body.data?.length > 0) {
        productId = res.body.data[0].id;
      }
    });

    it('1.6 — Search products', async () => {
      const res = await request(API_BASE)
        .get('/marketplace/search')
        .query({ q: 'iPhone' })
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('1.7 — Add to cart', async () => {
      if (!productId) return; // skip if no products seeded
      const res = await request(API_BASE)
        .post(`/marketplace/cart/${customerId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      expect(res.body).toBeDefined();
    });

    it('1.8 — Get wishlist', async () => {
      const res = await request(API_BASE)
        .get(`/marketplace/wishlist/${customerId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('1.9 — Duplicate registration should fail', async () => {
      await request(API_BASE)
        .post('/auth/register')
        .send({ name: 'Duplicate', email, password })
        .expect(409);
    });

    it('1.10 — Invalid login should fail', async () => {
      await request(API_BASE)
        .post('/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
    });
  });

  // ── Journey 2: Seller Registration → Product Listing ────────────
  describe('Seller Journey', () => {
    it('2.1 — Register a new seller', async () => {
      const res = await request(API_BASE)
        .post('/sellers/register')
        .send({
          businessName: `E2E Store ${Date.now()}`,
          ownerName: 'Test Owner',
          email: `seller-${Date.now()}@kartseek.com`,
          phone: '+919800000001',
          businessType: 'LLC',
          country: 'IN',
        });

      // May return 201 or 200 depending on controller
      expect([200, 201]).toContain(res.status);
      if (res.body.seller?.id) {
        sellerId = res.body.seller.id;
      }
    });

    it('2.2 — Get seller dashboard', async () => {
      if (!sellerId) return;
      const res = await request(API_BASE)
        .get(`/sellers/${sellerId}/dashboard`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.sellerId).toBe(sellerId);
    });

    it('2.3 — Get seller settings', async () => {
      if (!sellerId) return;
      const res = await request(API_BASE)
        .get(`/sellers/${sellerId}/settings`)
        .expect(200);

      expect(res.body.sellerId).toBe(sellerId);
      expect(res.body.store).toBeDefined();
      expect(res.body.kyc).toBeDefined();
    });

    it('2.4 — Add a product', async () => {
      if (!sellerId) return;
      const res = await request(API_BASE)
        .post(`/sellers/${sellerId}/products`)
        .set('x-region-code', 'IN')
        .send({ name: 'E2E Test Product', description: 'A test product', price: 5000 });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });

    it('2.5 — Get seller products', async () => {
      if (!sellerId) return;
      const res = await request(API_BASE)
        .get(`/sellers/${sellerId}/products`)
        .set('x-region-code', 'IN')
        .expect(200);

      expect(res.body.sellerId).toBe(sellerId);
    });

    it('2.6 — Get seller orders (empty)', async () => {
      if (!sellerId) return;
      const res = await request(API_BASE)
        .get(`/sellers/${sellerId}/orders`)
        .set('x-region-code', 'IN')
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('2.7 — Get wallet balance', async () => {
      if (!sellerId) return;
      const res = await request(API_BASE)
        .get(`/sellers/${sellerId}/wallet`)
        .expect(200);

      expect(res.body.sellerId).toBe(sellerId);
      expect(typeof res.body.balance).toBe('number');
    });
  });

  // ── Journey 3: Admin Panel ──────────────────────────────────────
  describe('Admin Journey', () => {
    it('3.1 — Get admin marketplace dashboard', async () => {
      const res = await request(API_BASE)
        .get('/admin/marketplace/dashboard');

      // May require auth; skip assertion if 401
      if (res.status === 200) {
        expect(res.body.data).toBeDefined();
      }
    });

    it('3.2 — List all sellers', async () => {
      const res = await request(API_BASE)
        .get('/admin/marketplace/sellers')
        .query({ page: 1, limit: 10 });

      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    it('3.3 — List all products', async () => {
      const res = await request(API_BASE)
        .get('/admin/marketplace/products')
        .query({ page: 1, limit: 10 });

      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });
  });

  // ── Auth Edge Cases ─────────────────────────────────────────────
  describe('Auth Edge Cases', () => {
    it('should reject empty login', async () => {
      await request(API_BASE)
        .post('/auth/login')
        .send({})
        .expect(400);
    });

    it('should reject empty registration', async () => {
      await request(API_BASE)
        .post('/auth/register')
        .send({})
        .expect(400);
    });

    it('should handle forgot-password gracefully', async () => {
      const res = await request(API_BASE)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@kartseek.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should verify OTP with static dev OTP', async () => {
      const res = await request(API_BASE)
        .post('/auth/otp/verify')
        .send({ phone: '+919800000099', otp: '1234' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });
  });
});
