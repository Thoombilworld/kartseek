import { Test, TestingModule } from '@nestjs/testing';
import { type INestApplication, Controller, Get, UseGuards, Param } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { of, throwError } from 'rxjs';

import { RolesGuard } from './roles.guard';
import { SellerOwnershipGuard } from './seller-ownership.guard';
import { Roles } from '../decorators/roles.decorator';
import { RedisService } from '@app/redis';

/**
 * Regression tests for the two P0 defects found in the 2026-07-27 full-stack audit.
 *
 * C1 — a RolesGuard registered GLOBALLY ran before the controller-level JwtAuthGuard,
 *      so `request.user` was undefined and every @Roles() route returned 403 to every
 *      caller, including SUPER_ADMIN. ~538 routes were silently unreachable, including
 *      the whole admin-marketplace (158) and seller-marketplace (80) APIs.
 *
 * C2 — the gateway's /sellers/:sellerId/* routes checked authentication and role but
 *      never that the caller OWNED the seller in the URL, so any authenticated seller
 *      could act on any other seller.
 *
 * The C1 tests deliberately reproduce the ORIGINAL broken wiring (a global guard ahead
 * of authentication) so the suite fails if anyone reintroduces it.
 */

const SECRET = 'test-secret-for-guard-regression';

/** Stand-in for JwtAuthGuard: populates request.user from the bearer token. */
class FakeJwtAuthGuard {
  canActivate(ctx: any): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return false;
    try {
      req.user = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString('utf8'));
      return true;
    } catch {
      return false;
    }
  }
}

const tokenFor = (user: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(user), 'utf8').toString('base64');

@Controller('probe')
@UseGuards(FakeJwtAuthGuard, RolesGuard)
class ProbeController {
  @Get('admin-only')
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminOnly() { return { ok: 'admin' }; }

  @Get('seller-only')
  @Roles('SELLER')
  sellerOnly() { return { ok: 'seller' }; }

  /** No @Roles — authentication alone should suffice. */
  @Get('any-authenticated')
  anyAuthenticated() { return { ok: 'any' }; }
}

@Controller('sellers')
@UseGuards(FakeJwtAuthGuard, RolesGuard, SellerOwnershipGuard)
class SellerProbeController {
  @Get(':sellerId/orders')
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  orders(@Param('sellerId') sellerId: string) { return { ok: true, sellerId }; }
}

describe('Gateway guard regressions (P0)', () => {
  const OWNER = 'user-owner-1';
  const OTHER = 'user-other-2';
  const SELLER_ID = 'seller-aaa';

  let app: INestApplication;
  let sellerClient: { send: jest.Mock };

  const build = async (opts: { globalRolesGuard?: boolean } = {}) => {
    sellerClient = { send: jest.fn().mockReturnValue(of({ sellerId: SELLER_ID, ownerId: OWNER })) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET })],
      controllers: [ProbeController, SellerProbeController],
      providers: [
        Reflector,
        SellerOwnershipGuard,
        { provide: 'SELLER_SERVICE', useValue: sellerClient },
        { provide: RedisService, useValue: {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn().mockResolvedValue(undefined),
        } },
        // Reproduces the C1 defect when enabled.
        ...(opts.globalRolesGuard ? [{ provide: APP_GUARD, useClass: RolesGuard }] : []),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    return app;
  };

  afterEach(async () => { if (app) await app.close(); });

  // ── C1 ────────────────────────────────────────────────────────────────────
  describe('C1 — @Roles routes must be reachable by the right role', () => {
    it('lets SUPER_ADMIN through an @Roles route', async () => {
      await build();
      await request(app.getHttpServer())
        .get('/probe/admin-only')
        .set('Authorization', `Bearer ${tokenFor({ id: 'u1', role: 'SUPER_ADMIN' })}`)
        .expect(200, { ok: 'admin' });
    });

    it('lets SELLER through a seller-scoped @Roles route', async () => {
      await build();
      await request(app.getHttpServer())
        .get('/probe/seller-only')
        .set('Authorization', `Bearer ${tokenFor({ id: 'u1', role: 'SELLER' })}`)
        .expect(200, { ok: 'seller' });
    });

    it('still rejects the wrong role', async () => {
      await build();
      await request(app.getHttpServer())
        .get('/probe/admin-only')
        .set('Authorization', `Bearer ${tokenFor({ id: 'u1', role: 'CUSTOMER' })}`)
        .expect(403);
    });

    it('allows a route with no @Roles once authenticated', async () => {
      await build();
      await request(app.getHttpServer())
        .get('/probe/any-authenticated')
        .set('Authorization', `Bearer ${tokenFor({ id: 'u1', role: 'CUSTOMER' })}`)
        .expect(200, { ok: 'any' });
    });

    /**
     * The defect itself. With RolesGuard registered globally it runs before
     * authentication, so even SUPER_ADMIN is rejected. If this ever starts returning
     * 200, the global registration has been made safe; if the tests above start
     * failing, it has been reintroduced unsafely.
     */
    it('reproduces the defect: a GLOBAL RolesGuard rejects even SUPER_ADMIN', async () => {
      await build({ globalRolesGuard: true });
      await request(app.getHttpServer())
        .get('/probe/admin-only')
        .set('Authorization', `Bearer ${tokenFor({ id: 'u1', role: 'SUPER_ADMIN' })}`)
        .expect(403);
    });
  });

  // ── C2 ────────────────────────────────────────────────────────────────────
  describe('C2 — seller routes must enforce ownership', () => {
    it('lets the owning seller read their own orders', async () => {
      await build();
      await request(app.getHttpServer())
        .get(`/sellers/${SELLER_ID}/orders`)
        .set('Authorization', `Bearer ${tokenFor({ id: OWNER, role: 'SELLER' })}`)
        .expect(200);
    });

    it('blocks a different seller from another seller account (IDOR)', async () => {
      await build();
      await request(app.getHttpServer())
        .get(`/sellers/${SELLER_ID}/orders`)
        .set('Authorization', `Bearer ${tokenFor({ id: OTHER, role: 'SELLER' })}`)
        .expect(403);
    });

    it('lets an admin act on any seller', async () => {
      await build();
      await request(app.getHttpServer())
        .get(`/sellers/${SELLER_ID}/orders`)
        .set('Authorization', `Bearer ${tokenFor({ id: OTHER, role: 'SUPER_ADMIN' })}`)
        .expect(200);
      expect(sellerClient.send).not.toHaveBeenCalled();
    });

    it('fails closed when the seller has no owner on record', async () => {
      await build();
      sellerClient.send.mockReturnValue(of({ sellerId: SELLER_ID, ownerId: null }));
      await request(app.getHttpServer())
        .get(`/sellers/${SELLER_ID}/orders`)
        .set('Authorization', `Bearer ${tokenFor({ id: OWNER, role: 'SELLER' })}`)
        .expect(403);
    });

    it('fails closed when the ownership lookup itself fails', async () => {
      await build();
      sellerClient.send.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
      await request(app.getHttpServer())
        .get(`/sellers/${SELLER_ID}/orders`)
        .set('Authorization', `Bearer ${tokenFor({ id: OWNER, role: 'SELLER' })}`)
        .expect(403);
    });
  });
});
