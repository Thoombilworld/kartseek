import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './gateway.controller';
import { StaffMfaService } from '../services/staff-mfa.service';

/**
 * The phone half of sign-in.
 *
 * `/auth/otp/verify` resolves an account by phone number and used to call
 * `issueTokens` directly — so a staff account that happens to carry a phone
 * number could obtain a working staff access token from an SMS code alone,
 * walking straight past the second factor that `/auth/login` now demands. It
 * also wrote neither the `session:` record nor the hashed `refresh:` entry, so
 * the session it minted was not the session the rest of the gateway expects.
 *
 * Both paths now end in the same two places: a staff role gets a challenge, and
 * everyone else gets `completeLogin`.
 */
describe('AuthController — /auth/otp/verify', () => {
  const PHONE = '+97455512345';

  const makeController = (user: Record<string, unknown>) => {
    const store = new Map<string, string>();
    const redis = {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      set: vi.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      setJson: vi.fn(async (k: string, v: unknown) => {
        store.set(k, JSON.stringify(v));
      }),
      del: vi.fn(async (k: string) => {
        store.delete(k);
      }),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const jwt = new JwtService({ secret: 'test-secret' });
    const userRepo = {
      findOne: vi.fn(async () => user),
      create: vi.fn(),
      save: vi.fn(),
    };
    const lockout = {
      isLockedOut: vi.fn(async () => 0),
      recordFailedAttempt: vi.fn(),
      clearAttempts: vi.fn(async () => undefined),
    };
    // The real MFA service, so this covers the wiring and not a stand-in for it.
    const staffMfa = new StaffMfaService(redis as never, kafka as never, jwt);
    const controller = new AuthController(
      redis as never,
      kafka as never,
      jwt,
      lockout as never,
      {} as never,
      userRepo as never,
      staffMfa,
    );
    store.set(`otp:${PHONE}`, '123456');
    return { controller, redis, kafka, store, jwt };
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.DEV_MFA_ECHO = 'false';
    process.env.DEV_AUTH_BYPASS = 'false';
  });

  it('gives a staff account a challenge, not a session', async () => {
    const { controller, redis } = makeController({
      id: 'staff-1',
      email: 'ops@kartseek.com',
      phone: PHONE,
      role: 'admin',
      isActive: true,
    });

    const res = (await controller.verifyOtp({ phone: PHONE, otp: '123456' } as never)) as Record<
      string,
      unknown
    >;

    expect(res.requires2FA).toBe(true);
    expect(res.challengeToken).toEqual(expect.any(String));
    expect(res.accessToken).toBeUndefined();
    expect(res.refreshToken).toBeUndefined();
    // No session exists yet, so neither of the records that make one may be written.
    expect(redis.setJson).not.toHaveBeenCalledWith(
      'session:staff-1',
      expect.anything(),
      expect.anything(),
    );
    expect(redis.set).not.toHaveBeenCalledWith(
      'refresh:staff-1',
      expect.anything(),
      expect.anything(),
    );
  });

  it('burns the OTP even when the sign-in stops at the second factor', async () => {
    const { controller, redis } = makeController({
      id: 'staff-1',
      email: 'ops@kartseek.com',
      phone: PHONE,
      role: 'super_admin',
      isActive: true,
    });
    await controller.verifyOtp({ phone: PHONE, otp: '123456' } as never);
    // Otherwise the same SMS code could be replayed for a second challenge.
    expect(redis.del).toHaveBeenCalledWith(`otp:${PHONE}`);
  });

  it('gives a customer the full session, including the session and refresh records', async () => {
    const { controller, redis } = makeController({
      id: 'cust-1',
      email: 'jane@example.com',
      phone: PHONE,
      role: 'customer',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
    });

    const res = (await controller.verifyOtp({ phone: PHONE, otp: '123456' } as never)) as Record<
      string,
      unknown
    >;

    expect(res.requires2FA).toBeUndefined();
    expect(res.accessToken).toEqual(expect.any(String));
    expect(res.refreshToken).toEqual(expect.any(String));
    expect(redis.setJson).toHaveBeenCalledWith(
      'session:cust-1',
      expect.objectContaining({ userId: 'cust-1', role: 'customer' }),
      3600,
    );
    // The refresh token is stored hashed, never raw.
    expect(redis.set).toHaveBeenCalledWith('refresh:cust-1', expect.any(String), 2592000);
    const storedHash = redis.set.mock.calls.find((c) => c[0] === 'refresh:cust-1')?.[1] as string;
    expect(storedHash).not.toBe(res.refreshToken);
    expect(storedHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('signs an access token, not a challenge, for the customer path', async () => {
    const { controller, jwt } = makeController({
      id: 'cust-1',
      email: 'jane@example.com',
      phone: PHONE,
      role: 'customer',
      isActive: true,
    });
    const res = (await controller.verifyOtp({ phone: PHONE, otp: '123456' } as never)) as {
      accessToken: string;
    };
    expect(jwt.verify(res.accessToken)).toMatchObject({ sub: 'cust-1', type: 'access' });
  });
});
