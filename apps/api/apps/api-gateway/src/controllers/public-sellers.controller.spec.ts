import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PublicSellersController } from './public-sellers.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const ownerUser = { id: 'owner-1', role: 'SELLER' };

const req = (user: object) => ({
  user,
  method: 'GET',
  originalUrl: '/api/v1/sellers/seller-in/application-status',
  headers: {},
});

/**
 * The seller row as `get_seller_owner` answers it, and the projection
 * `get_seller_profile` answers. The two carry the market independently, which
 * is the point of the `countryCode` values below: the profile's is deliberately
 * QA while the row's is IN, so a scope check that read the profile instead of
 * the row would wrongly admit the QA admin.
 */
function build(row: { ownerId: string | null; regionCode: string | null }, profileCountry = 'QA') {
  const client = {
    send: vi.fn((cmd: any, payload: any) => {
      if (cmd.cmd === 'get_seller_owner') return of({ sellerId: payload.sellerId, ...row });
      if (cmd.cmd === 'get_seller_profile')
        return of({
          id: payload.sellerId,
          businessName: 'Acme Trading',
          storeSlug: 'acme',
          countryCode: profileCountry,
          status: 'PENDING',
          kycStatus: 'PENDING',
          joinedAt: '2026-01-01T00:00:00.000Z',
        });
      return of({});
    }),
  };
  return { ctrl: new PublicSellersController(client as any), client };
}

describe('PublicSellersController — application-status market scope', () => {
  it('refuses a region-locked admin reading another market’s applicant', async () => {
    const { ctrl, client } = build({ ownerId: 'owner-1', regionCode: 'IN' });
    await expect(ctrl.applicationStatus(req(qaAdmin), 'seller-in')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(ctrl.applicationStatus(req(qaAdmin), 'seller-in')).rejects.toThrow(
      'Your account is restricted to the QA market; this seller belongs to IN.',
    );
    // Denied before the row is read: no business name or KYC state was fetched.
    const patterns = client.send.mock.calls.map((c: any[]) => c[0].cmd);
    expect(patterns).not.toContain('get_seller_profile');
  });

  it('admits a region-locked admin in their own market — the control that stops "403 everywhere" passing', async () => {
    const { ctrl } = build({ ownerId: 'owner-1', regionCode: 'QA' }, 'QA');
    await expect(ctrl.applicationStatus(req(qaAdmin), 'seller-qa')).resolves.toMatchObject({
      id: 'seller-qa',
      businessName: 'Acme Trading',
      kycStatus: 'PENDING',
    });
  });

  it('does not trust the profile projection’s countryCode, which falls back to the caller’s market', async () => {
    // The row says IN, the cached projection says QA. Reading the projection
    // would admit the QA admin; reading the row refuses them.
    const { ctrl } = build({ ownerId: 'owner-1', regionCode: 'IN' }, 'QA');
    await expect(ctrl.applicationStatus(req(qaAdmin), 'seller-in')).rejects.toThrow(
      'this seller belongs to IN',
    );
  });

  it('refuses a locked admin on an applicant with no market, and on an unknown seller', async () => {
    const noMarket = build({ ownerId: 'owner-1', regionCode: null });
    await expect(noMarket.ctrl.applicationStatus(req(qaAdmin), 'seller-x')).rejects.toThrow(
      'this seller belongs to every market',
    );
    const unknown = build({ ownerId: null, regionCode: null });
    await expect(unknown.ctrl.applicationStatus(req(qaAdmin), 'seller-x')).rejects.toThrow(
      'this seller belongs to every market',
    );
  });

  it('admits a global admin anywhere, and does not pay for the scope lookup', async () => {
    const { ctrl, client } = build({ ownerId: 'owner-1', regionCode: 'IN' });
    await expect(ctrl.applicationStatus(req(globalAdmin), 'seller-in')).resolves.toMatchObject({
      id: 'seller-in',
    });
    const patterns = client.send.mock.calls.map((c: any[]) => c[0].cmd);
    expect(patterns).not.toContain('get_seller_owner');
  });

  it('leaves the applicant’s own path unchanged: the owner reads it, a stranger does not', async () => {
    const { ctrl } = build({ ownerId: 'owner-1', regionCode: 'IN' });
    await expect(ctrl.applicationStatus(req(ownerUser), 'seller-in')).resolves.toMatchObject({
      id: 'seller-in',
      verificationStatus: 'PENDING',
      submittedAt: '2026-01-01T00:00:00.000Z',
    });
    await expect(
      ctrl.applicationStatus(req({ id: 'other', role: 'SELLER' }), 'seller-in'),
    ).rejects.toThrow('This application does not belong to you.');
  });

  it('still answers 503, not a denial, when the lookup is down', async () => {
    const { ctrl, client } = build({ ownerId: 'owner-1', regionCode: 'QA' });
    client.send = vi.fn(() => throwError(() => new Error('ECONNREFUSED')));
    await expect(ctrl.applicationStatus(req(ownerUser), 'seller-qa')).rejects.toThrow(
      ServiceUnavailableException,
    );
    // Fail-closed for the locked admin too: no answer, no access.
    await expect(ctrl.applicationStatus(req(qaAdmin), 'seller-qa')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
