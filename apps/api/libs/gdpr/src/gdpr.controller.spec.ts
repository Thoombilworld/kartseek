import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  type INestApplication,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '@app/security';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';

/**
 * Authorization regression for the GDPR routes.
 *
 * These twelve routes shipped with no guard at all. api-gateway registers no
 * global auth guard, so an anonymous caller could read any account's consents,
 * grant or revoke them, file a data-export or erasure request in someone
 * else's name, download their export, and run the admin processing routes.
 * Found on 2026-09-06 by calling `GET /gdpr/consent/<uuid>` with no token on a
 * gateway started with `DEV_AUTH_BYPASS=false`: 200, with the consent records.
 *
 * The real JwtAuthGuard is swapped for one that reads the user out of the
 * bearer token as base64 JSON; RolesGuard and ResourceOwnershipGuard run for
 * real, which is the point.
 */

const SUBJECT = 'user-subject-1';
const OTHER = 'user-other-2';
const ADMIN = 'user-admin-3';
const EXPORT_ID = 'GDPR-EXPORT-1-abc123';
const ERASE_ID = 'GDPR-ERASE-1-def456';

@Injectable()
class FakeJwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    req.user = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString('utf8'));
    return true;
  }
}

/** A bearer token for `userId`, shaped like JwtStrategy.validate()'s result. */
const as = (userId: string, role: string) =>
  `Bearer ${Buffer.from(JSON.stringify({ userId, id: userId, sub: userId, role })).toString('base64')}`;

describe('GdprController authorization', () => {
  let app: INestApplication;
  let service: Record<string, Mock>;

  beforeEach(async () => {
    service = {
      getUserConsents: vi.fn().mockResolvedValue([]),
      grantConsent: vi.fn().mockResolvedValue({ granted: true }),
      revokeConsent: vi.fn().mockResolvedValue({ granted: false }),
      hasConsent: vi.fn().mockResolvedValue(true),
      requestDataExport: vi
        .fn()
        .mockResolvedValue({ id: EXPORT_ID, userId: SUBJECT, status: 'pending' }),
      getExportStatus: vi.fn(async (id: string) =>
        id === EXPORT_ID ? { id, userId: SUBJECT, status: 'completed' } : null,
      ),
      getExportData: vi.fn().mockResolvedValue({ orders: [] }),
      processDataExport: vi.fn().mockResolvedValue({ id: EXPORT_ID, status: 'completed' }),
      requestErasure: vi
        .fn()
        .mockResolvedValue({ id: ERASE_ID, userId: SUBJECT, status: 'pending' }),
      getErasureStatus: vi.fn(async (id: string) =>
        id === ERASE_ID ? { id, userId: SUBJECT, status: 'pending' } : null,
      ),
      processErasure: vi.fn().mockResolvedValue({ id: ERASE_ID, status: 'completed' }),
      getComplianceDashboard: vi.fn().mockResolvedValue({ pendingRequests: 0 }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [{ provide: GdprService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('data-subject routes (:userId)', () => {
    it('rejects anonymous callers before touching the service', async () => {
      await http().get(`/gdpr/consent/${SUBJECT}`).expect(401);
      await http()
        .post(`/gdpr/consent/${SUBJECT}/grant`)
        .send({ consentType: 'analytics' })
        .expect(401);
      await http().post(`/gdpr/export/${SUBJECT}`).expect(401);
      await http().post(`/gdpr/erasure/${SUBJECT}`).send({ reason: 'leaving' }).expect(401);
      expect(service.getUserConsents).not.toHaveBeenCalled();
      expect(service.grantConsent).not.toHaveBeenCalled();
      expect(service.requestDataExport).not.toHaveBeenCalled();
      expect(service.requestErasure).not.toHaveBeenCalled();
    });

    it('lets the subject read and change their own consents', async () => {
      const own = as(SUBJECT, 'CUSTOMER');
      await http().get(`/gdpr/consent/${SUBJECT}`).set('Authorization', own).expect(200);
      await http()
        .post(`/gdpr/consent/${SUBJECT}/grant`)
        .set('Authorization', own)
        .send({ consentType: 'analytics', policyVersion: '1.0' })
        .expect(201);
      await http()
        .post(`/gdpr/consent/${SUBJECT}/revoke`)
        .set('Authorization', own)
        .send({ consentType: 'analytics' })
        .expect(201);
      await http()
        .get(`/gdpr/consent/${SUBJECT}/check/analytics`)
        .set('Authorization', own)
        .expect(200);

      expect(service.getUserConsents).toHaveBeenCalledWith(SUBJECT);
      expect(service.grantConsent).toHaveBeenCalledWith(SUBJECT, 'analytics', expect.any(Object));
      expect(service.revokeConsent).toHaveBeenCalledWith(SUBJECT, 'analytics');
      expect(service.hasConsent).toHaveBeenCalledWith(SUBJECT, 'analytics');
    });

    it('lets the subject file export and erasure requests', async () => {
      const own = as(SUBJECT, 'CUSTOMER');
      await http().post(`/gdpr/export/${SUBJECT}?format=csv`).set('Authorization', own).expect(202);
      await http()
        .post(`/gdpr/erasure/${SUBJECT}`)
        .set('Authorization', own)
        .send({ reason: 'leaving' })
        .expect(202);
      expect(service.requestDataExport).toHaveBeenCalledWith(SUBJECT, 'csv');
      expect(service.requestErasure).toHaveBeenCalledWith(SUBJECT, 'leaving');
    });

    it('blocks another customer from every subject route (IDOR)', async () => {
      const other = as(OTHER, 'CUSTOMER');
      await http().get(`/gdpr/consent/${SUBJECT}`).set('Authorization', other).expect(403);
      await http()
        .post(`/gdpr/consent/${SUBJECT}/grant`)
        .set('Authorization', other)
        .send({ consentType: 'analytics' })
        .expect(403);
      await http()
        .post(`/gdpr/consent/${SUBJECT}/revoke`)
        .set('Authorization', other)
        .send({ consentType: 'analytics' })
        .expect(403);
      await http()
        .get(`/gdpr/consent/${SUBJECT}/check/analytics`)
        .set('Authorization', other)
        .expect(403);
      await http().post(`/gdpr/export/${SUBJECT}`).set('Authorization', other).expect(403);
      await http()
        .post(`/gdpr/erasure/${SUBJECT}`)
        .set('Authorization', other)
        .send({})
        .expect(403);

      for (const fn of [
        'getUserConsents',
        'grantConsent',
        'revokeConsent',
        'hasConsent',
        'requestDataExport',
        'requestErasure',
      ]) {
        expect(service[fn], fn).not.toHaveBeenCalled();
      }
    });

    it('lets a privacy admin act for any subject, whatever the case of the role claim', async () => {
      await http()
        .get(`/gdpr/consent/${SUBJECT}`)
        .set('Authorization', as(ADMIN, 'admin'))
        .expect(200);
      await http()
        .get(`/gdpr/consent/${SUBJECT}`)
        .set('Authorization', as(ADMIN, 'SUPER_ADMIN'))
        .expect(200);
      await http()
        .post(`/gdpr/erasure/${SUBJECT}`)
        .set('Authorization', as(ADMIN, 'ADMIN'))
        .send({})
        .expect(202);
      expect(service.requestErasure).toHaveBeenCalledWith(SUBJECT, undefined);
    });
  });

  describe('request routes (:requestId)', () => {
    it('shows a request only to the subject who filed it or to an admin', async () => {
      const own = as(SUBJECT, 'CUSTOMER');
      const other = as(OTHER, 'CUSTOMER');
      const admin = as(ADMIN, 'ADMIN');

      await http().get(`/gdpr/export/${EXPORT_ID}/status`).set('Authorization', own).expect(200);
      await http().get(`/gdpr/export/${EXPORT_ID}/download`).set('Authorization', own).expect(200);
      await http().get(`/gdpr/erasure/${ERASE_ID}/status`).set('Authorization', own).expect(200);

      await http().get(`/gdpr/export/${EXPORT_ID}/status`).set('Authorization', other).expect(403);
      await http()
        .get(`/gdpr/export/${EXPORT_ID}/download`)
        .set('Authorization', other)
        .expect(403);
      await http().get(`/gdpr/erasure/${ERASE_ID}/status`).set('Authorization', other).expect(403);

      await http().get(`/gdpr/export/${EXPORT_ID}/status`).set('Authorization', admin).expect(200);
      await http()
        .get(`/gdpr/export/${EXPORT_ID}/download`)
        .set('Authorization', admin)
        .expect(200);
      await http().get(`/gdpr/erasure/${ERASE_ID}/status`).set('Authorization', admin).expect(200);

      // The export payload itself is only ever fetched for a permitted caller.
      expect(service.getExportData).toHaveBeenCalledTimes(2);
    });

    it('never hands the export payload to someone who is not the subject', async () => {
      const res = await http()
        .get(`/gdpr/export/${EXPORT_ID}/download`)
        .set('Authorization', as(OTHER, 'SELLER'))
        .expect(403);
      expect(JSON.stringify(res.body)).not.toContain('orders');
      expect(service.getExportData).not.toHaveBeenCalled();
    });

    it('keeps the existing not-found answer for unknown request ids', async () => {
      const res = await http()
        .get('/gdpr/export/GDPR-EXPORT-0-nothere/status')
        .set('Authorization', as(SUBJECT, 'CUSTOMER'))
        .expect(200);
      expect(res.body).toEqual({ success: false, message: 'Export request not found' });
    });
  });

  describe('processing routes', () => {
    it('are admin-only, even for the subject of the request', async () => {
      const own = as(SUBJECT, 'CUSTOMER');
      await http().post(`/gdpr/export/${EXPORT_ID}/process`).set('Authorization', own).expect(403);
      await http()
        .post(`/gdpr/erasure/${ERASE_ID}/process`)
        .set('Authorization', own)
        .send({})
        .expect(403);
      await http().get('/gdpr/compliance/dashboard').set('Authorization', own).expect(403);
      expect(service.processDataExport).not.toHaveBeenCalled();
      expect(service.processErasure).not.toHaveBeenCalled();
      expect(service.getComplianceDashboard).not.toHaveBeenCalled();
    });

    it('record the authenticated admin as the processor, not a body field', async () => {
      await http()
        .post(`/gdpr/erasure/${ERASE_ID}/process`)
        .set('Authorization', as(ADMIN, 'SUPER_ADMIN'))
        .send({ adminId: 'someone-else' })
        .expect(201);
      expect(service.processErasure).toHaveBeenCalledWith(ERASE_ID, ADMIN);

      await http()
        .post(`/gdpr/export/${EXPORT_ID}/process`)
        .set('Authorization', as(ADMIN, 'ADMIN'))
        .expect(201);
      expect(service.processDataExport).toHaveBeenCalledWith(EXPORT_ID);

      await http()
        .get('/gdpr/compliance/dashboard')
        .set('Authorization', as(ADMIN, 'ADMIN'))
        .expect(200);
    });
  });
});
