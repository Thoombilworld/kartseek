import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './gateway.controller';
import { StaffMfaService } from '../services/staff-mfa.service';

/** Just the columns `adminPermissionsFor` and `adminRoleSummary` read. */
interface AdminRoleRow {
  id: string;
  key: string;
  name: string;
  permissions: string[];
}

const PHONE = '+97455512345';
const PASSWORD = 'AdminPass123!';
// Cheap on purpose: `login` only ever compares, and the cost factor is the
// production hash's business, not this file's.
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const makeController = (user: Record<string, unknown>, roles: AdminRoleRow[] = []) => {
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
  const roleRepo = {
    findOne: vi.fn(
      async ({ where }: { where: { id?: string; key?: string } }) =>
        roles.find((r) => (where.id ? r.id === where.id : r.key === where.key)) ?? null,
    ),
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
    roleRepo as never,
    staffMfa,
  );
  store.set(`otp:${PHONE}`, '123456');
  return { controller, redis, kafka, store, jwt, userRepo, roleRepo };
};

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

/**
 * The permission claim.
 *
 * `RolesGuard` has understood `perm:` requirements for a while and nothing ever
 * signed the claim it reads, so a route gated on a key would have refused every
 * account on the platform. These cases pin the other end of that wire: what the
 * token carries, where it comes from, and when it is recomputed.
 */
describe('AuthController — adminPermissions claim', () => {
  const ADMIN_ROLE: AdminRoleRow = {
    id: 'role-admin',
    key: 'admin',
    name: 'Admin',
    permissions: ['finance.view', 'orders.refund'],
  };
  const REGIONAL_ROLE: AdminRoleRow = {
    id: 'role-regional',
    key: 'regional_admin',
    name: 'Regional Admin',
    permissions: ['finance.view'],
  };
  const FINANCE_ROLE: AdminRoleRow = {
    id: 'role-finance',
    key: 'finance_manager',
    name: 'Finance Manager',
    permissions: ['finance.view', 'finance.payouts'],
  };
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    // The challenge code has to come back in the response for the spec to
    // complete a staff sign-in the way a real one completes.
    process.env.DEV_MFA_ECHO = 'true';
    process.env.DEV_AUTH_BYPASS = 'false';
  });

  /** What `completeLogin` hands back — the body the admin console consumes. */
  interface SessionBody {
    accessToken: string;
    refreshToken: string;
    user: Record<string, unknown>;
  }

  /**
   * Drive a staff account all the way through the second factor to a session.
   *
   * `via` picks which half of sign-in raises the challenge: `/auth/login` with
   * a password, or `/auth/otp/verify` with an SMS code. Both must end in the
   * same session, so both are driven rather than one standing in for the other.
   */
  const signIn = async (
    user: Record<string, unknown>,
    roles: AdminRoleRow[],
    via: 'password' | 'otp' = 'otp',
  ) => {
    const ctx = makeController(user, roles);
    const challenge = (await (via === 'password'
      ? ctx.controller.login({ email: String(user.email), password: PASSWORD } as never)
      : ctx.controller.verifyOtp({ phone: PHONE, otp: '123456' } as never))) as {
      challengeToken: string;
      devCode: string;
    };
    const session = (await ctx.controller.mfaVerify({
      challengeToken: challenge.challengeToken,
      code: challenge.devCode,
    } as never)) as unknown as SessionBody;
    return {
      ...ctx,
      session,
      claims: ctx.jwt.verify(session.accessToken) as Record<string, unknown>,
    };
  };

  const staff = (over: Record<string, unknown>) => ({
    id: 'staff-1',
    email: 'ops@kartseek.com',
    phone: PHONE,
    passwordHash: PASSWORD_HASH,
    isActive: true,
    ...over,
  });

  /**
   * The response body, not the token.
   *
   * The admin console never decodes the JWT and never calls `/auth/profile`:
   * `admin/login/page.tsx` hands this object to `toAdminUser`. Asserting only
   * `jwt.verify(...)` is what let a release sign the claim correctly and still
   * leave every non-SUPER_ADMIN staff account with an empty sidebar.
   */
  it('returns the permissions and the assigned role in the sign-in body', async () => {
    const { session, claims } = await signIn(staff({ role: 'admin', adminRoleId: ADMIN_ROLE.id }), [
      ADMIN_ROLE,
    ]);
    expect(session.user.adminPermissions).toEqual(ADMIN_ROLE.permissions);
    expect(session.user.adminRole).toEqual({
      id: ADMIN_ROLE.id,
      key: 'admin',
      name: ADMIN_ROLE.name,
    });
    // The body and the token describe the same account or neither is trustworthy.
    expect(session.user.adminPermissions).toEqual(claims.adminPermissions);
  });

  it('returns the same body when the challenge came from a password login', async () => {
    const { session } = await signIn(
      staff({ role: 'finance_manager', adminRoleId: FINANCE_ROLE.id }),
      [FINANCE_ROLE],
      'password',
    );
    expect(session.user.adminPermissions).toEqual(FINANCE_ROLE.permissions);
    expect((session.user.adminRole as { key: string }).key).toBe('finance_manager');
  });

  it('reports a staff account with no role row as adminRole null, not missing', async () => {
    const { session } = await signIn(staff({ role: 'super_admin' }), []);
    expect(session.user.adminPermissions).toEqual(['*']);
    expect(session.user).toHaveProperty('adminRole', null);
  });

  it('omits both keys from a customer’s sign-in body', async () => {
    const { controller } = makeController({
      id: 'cust-1',
      email: 'jane@example.com',
      phone: PHONE,
      role: 'customer',
      isActive: true,
    });
    const res = (await controller.verifyOtp({
      phone: PHONE,
      otp: '123456',
    } as never)) as unknown as SessionBody;
    expect(res.user).not.toHaveProperty('adminPermissions');
    expect(res.user).not.toHaveProperty('adminRole');
  });

  it('signs the assigned role’s permissions into both tokens', async () => {
    const { session, claims, jwt } = await signIn(
      staff({ role: 'admin', adminRoleId: ADMIN_ROLE.id }),
      [ADMIN_ROLE],
    );
    expect(claims.adminPermissions).toEqual(ADMIN_ROLE.permissions);
    // The refresh token carries it too, so a rotation is not a demotion.
    expect(jwt.verify(session.refreshToken)).toMatchObject({
      adminPermissions: ADMIN_ROLE.permissions,
    });
  });

  it('gives SUPER_ADMIN the wildcard without consulting a role row', async () => {
    const { claims, roleRepo } = await signIn(staff({ role: 'super_admin' }), []);
    expect(claims.adminPermissions).toEqual(['*']);
    expect(roleRepo.findOne).not.toHaveBeenCalled();
  });

  it('falls back to regional_admin for a market-locked account with no role row', async () => {
    // The QA admin predates `users.admin_role_id`; its lock is what says which
    // system role it is, and reading `role.toLowerCase()` would hand a locked
    // ADMIN the global Admin set including every market.
    const { claims } = await signIn(
      staff({ role: 'admin', regionCode: 'QA', regionLocked: true }),
      [ADMIN_ROLE, REGIONAL_ROLE],
    );
    expect(claims.adminPermissions).toEqual(REGIONAL_ROLE.permissions);
  });

  it('grants nothing when the account names no role and none matches', async () => {
    const { claims } = await signIn(staff({ role: 'support_agent' }), []);
    expect(claims.adminPermissions).toEqual([]);
  });

  it('omits the claim entirely for a customer', async () => {
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
    expect(jwt.verify(res.accessToken)).not.toHaveProperty('adminPermissions');
  });
});

describe('AuthController — /auth/refresh', () => {
  const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

  const withRefreshToken = (
    user: Record<string, unknown>,
    roles: AdminRoleRow[],
    claims: Record<string, unknown>,
  ) => {
    const ctx = makeController(user, roles);
    const refreshToken = ctx.jwt.sign({ ...claims, type: 'refresh' }, { expiresIn: 600 });
    ctx.store.set(`refresh:${claims.sub}`, sha256(refreshToken));
    return { ...ctx, refreshToken };
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('recomputes the permissions instead of copying the old claim', async () => {
    // The route used to rebuild the user from the refresh token's own claims
    // and never read the database, so a role narrowed in the console stayed
    // wide for as long as the holder kept refreshing — thirty days.
    const role: AdminRoleRow = { id: 'role-1', key: 'support_agent', permissions: ['orders.view'] };
    const { controller, jwt, refreshToken } = withRefreshToken(
      {
        id: 'staff-1',
        email: 'ops@kartseek.com',
        role: 'support_agent',
        adminRoleId: role.id,
        isActive: true,
      },
      [role],
      { sub: 'staff-1', email: 'ops@kartseek.com', role: 'admin', adminPermissions: ['*'] },
    );
    const res = (await controller.refreshToken({ refreshToken } as never)) as {
      accessToken: string;
    };
    expect(jwt.verify(res.accessToken)).toMatchObject({
      role: 'support_agent',
      adminPermissions: ['orders.view'],
    });
  });

  it('refuses a deactivated account', async () => {
    // Deactivating a staff member has to end their access, not merely stop the
    // next sign-in: a live refresh token is otherwise a month-long key.
    const { controller, refreshToken } = withRefreshToken(
      { id: 'staff-1', email: 'ops@kartseek.com', role: 'admin', isActive: false },
      [],
      { sub: 'staff-1', email: 'ops@kartseek.com', role: 'admin' },
    );
    await expect(controller.refreshToken({ refreshToken } as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a token whose account no longer exists', async () => {
    const ctx = makeController(null as never, []);
    const refreshToken = ctx.jwt.sign(
      { sub: 'gone-1', role: 'admin', type: 'refresh' },
      {
        expiresIn: 600,
      },
    );
    ctx.store.set('refresh:gone-1', sha256(refreshToken));
    await expect(ctx.controller.refreshToken({ refreshToken } as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('still rotates the stored hash for a healthy session', async () => {
    const { controller, redis, refreshToken } = withRefreshToken(
      { id: 'cust-1', email: 'jane@example.com', role: 'customer', isActive: true },
      [],
      { sub: 'cust-1', email: 'jane@example.com', role: 'customer' },
    );
    const res = (await controller.refreshToken({ refreshToken } as never)) as {
      refreshToken: string;
    };
    expect(redis.set).toHaveBeenCalledWith('refresh:cust-1', sha256(res.refreshToken), 2592000);
  });
});
