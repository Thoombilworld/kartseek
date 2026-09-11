import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { Partner, PartnerUser } from '../entities';

/**
 * The partner sign-in's role claim.
 *
 * `POST /partner/auth/otp/verify` clears an SMS code and signs an access token
 * whose `role` claim is `partner_users.active_role`, verbatim. `allowedRoles`
 * beside it was filtered against `PARTNER_ROLES`; `active_role` was not — so a
 * row holding `ADMIN` or `SUPER_ADMIN` minted a staff-role session from an SMS
 * code, past the staff second factor entirely. It carries no `adminPermissions`
 * and `RolesGuard` denies a `perm:` requirement when the claim is missing, so
 * the `perm:`-gated routes still refused it; the large role-only admin surface
 * would not have.
 *
 * These drive the real handler rather than the private helper, so what is
 * asserted is the claim that reaches `jwtService.sign`.
 */

/** A partner registry holding exactly one partner with the given active role. */
function build(activeRole: string | null, allowedRoles: string[] = ['TAXI_DRIVER']) {
  const partner = { id: 'p-1', phone: '+97455512345', status: 'APPROVED' };
  const pUser = { partnerId: 'p-1', userId: 'u-1', allowedRoles, activeRole };
  const em = {
    findOne: vi.fn(async (entity: unknown, _opts: unknown) => {
      if (entity === Partner) return partner;
      if (entity === PartnerUser) return pUser;
      return null;
    }),
  };
  const redis = {
    get: vi.fn(async () => '123456'),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const signed: Array<Record<string, any>> = [];
  const jwtService = {
    sign: vi.fn((claims: Record<string, any>) => {
      signed.push(claims);
      return `signed.${claims.type}`;
    }),
  };
  return {
    ctrl: new PartnerController(redis as any, kafka as any, jwtService as any, em as any),
    signed,
    jwtService,
  };
}

const otp = { phone: '+97455512345', otp: '123456' };

describe('PartnerController — the role a partner token may carry', () => {
  const env = process.env;
  beforeEach(() => {
    // The dev OTP shortcut would take a different branch entirely.
    process.env = { ...env, NODE_ENV: 'test', PARTNER_DEV_OTP: 'false', SKIP_DB: 'false' };
  });
  afterEach(() => {
    process.env = env;
  });

  it('signs the partner role a normal account holds', async () => {
    const { ctrl, signed } = build('TAXI_DRIVER');
    const res: any = await ctrl.verifyOtp(otp);
    expect(res.active_role).toBe('TAXI_DRIVER');
    expect(signed.every((c) => c.role === 'TAXI_DRIVER')).toBe(true);
  });

  it('defaults to TAXI_DRIVER when the column is null', async () => {
    const { ctrl, signed } = build(null);
    await ctrl.verifyOtp(otp);
    expect(signed[0].role).toBe('TAXI_DRIVER');
  });

  it.each(['ADMIN', 'SUPER_ADMIN', 'FINANCE_MANAGER', 'support_agent'])(
    'refuses to sign a token for a partner row carrying %s',
    async (staffRole) => {
      const { ctrl, jwtService } = build(staffRole);
      await expect(ctrl.verifyOtp(otp)).rejects.toThrow(ForbiddenException);
      // Refused before anything was signed — not signed and then discarded.
      expect(jwtService.sign).not.toHaveBeenCalled();
    },
  );

  it('refuses regardless of casing — the column is free text', async () => {
    const { ctrl } = build('Super_Admin');
    await expect(ctrl.verifyOtp(otp)).rejects.toThrow(
      'This partner account carries an administrative role. Sign in through the admin console.',
    );
  });

  it('still filters allowedRoles, which was already correct', async () => {
    const { ctrl, signed } = build('TAXI_DRIVER', ['TAXI_DRIVER', 'ADMIN', 'DELIVERY_PARTNER']);
    await ctrl.verifyOtp(otp);
    expect(signed[0].allowedRoles).toEqual(['TAXI_DRIVER', 'DELIVERY_PARTNER']);
  });
});
