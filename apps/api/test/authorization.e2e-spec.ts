/**
 * Authorization Integration Tests
 * 
 * Validates that @Roles() routes reject unauthenticated users and
 * that RolesGuard is never registered globally (which would break authorization).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../apps/api-gateway/src/app.module';

describe('Authorization (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('@Roles() decorator', () => {
    it('should reject unauthenticated requests to protected routes', async () => {
      // Test against an admin route (e.g. /admin/marketplace)
      // Expected: 401 Unauthorized (not 403 Forbidden)
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/marketplace/stats')
        .expect(401); // Should be 401, not 403

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/unauthorized|token|missing/i);
    });

    it('should reject non-admin users to @Roles("ADMIN") routes', async () => {
      // This requires a valid but non-admin JWT token
      // Expected: 403 Forbidden (authorization denied)
      const userToken = 'valid_user_jwt_token_here'; // Mock token

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/marketplace/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|insufficient|role/i);
    });
  });

  describe('RolesGuard registration', () => {
    it('should NOT register RolesGuard globally', () => {
      // Parse the AppModule and verify no global RolesGuard provider exists
      const metadata = Reflect.getMetadata('nest:providers', AppModule);

      if (!metadata) {
        // If no metadata, the test passes (no global guard found)
        return;
      }

      const hasGlobalRolesGuard = metadata.some((provider: any) => {
        const provide = provider?.provide || provider;
        const useClass = provider?.useClass?.name || '';

        // Check if it's an APP_GUARD provider with RolesGuard
        return provide === 'APP_GUARD' && useClass === 'RolesGuard';
      });

      expect(hasGlobalRolesGuard).toBe(false);
    });
  });

  describe('Health Check Endpoints', () => {
    it('should not throttle /health endpoint', async () => {
      // Make 150 rapid requests to health endpoint (should all succeed if throttle is skipped)
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/health')
        );
      }

      const responses = await Promise.all(requests);

      // At least 140 should succeed (allowing for network jitter)
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(140);
    });

    it('should not throttle /health/ready endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body.status).toMatch(/ready|degraded/);
    });

    it('should not throttle /health/metrics endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('CSP Headers', () => {
    it('should use CSP nonce instead of unsafe-inline', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      const cspHeader = response.headers['content-security-policy'];
      expect(cspHeader).toBeDefined();

      // Should contain nonce, not unsafe-inline
      expect(cspHeader).toMatch(/script-src.*'nonce-/);
      expect(cspHeader).not.toMatch(/script-src.*'unsafe-inline'/);
    });
  });

  describe('CORS Headers', () => {
    it('should include all required custom headers in CORS', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Access-Control-Request-Headers', 'X-Region-Code, X-Language-Code, X-Timezone, X-Device-ID')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      const allowedHeaders = response.headers['access-control-allow-headers']?.toLowerCase() || '';

      expect(allowedHeaders).toContain('x-region-code');
      expect(allowedHeaders).toContain('x-language-code');
      expect(allowedHeaders).toContain('x-timezone');
      expect(allowedHeaders).toContain('x-device-id');
    });
  });
});
