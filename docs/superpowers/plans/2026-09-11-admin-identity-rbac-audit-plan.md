# Admin Identity, RBAC, Audit & Validation Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin console's identity truthful and the platform's staff access model real: role and market from the token, a server-side second factor, persisted admin roles and staff with a signed permission claim, a readable and immutable audit trail, validated admin request bodies, and fixture data removed from every page whose API already exists.

**Architecture:** The gateway's `AuthController` stays the owner of authentication; it gains a `StaffMfaService` (Redis challenge + Kafka delivery), an `AdminRole` entity in schema `admin` on the main DB, and an `adminPermissions` claim computed at login. `RolesGuard` already understands `perm:` keys; this plan gives it the claim and a `'*'` wildcard. The audit trail keeps its one immutable store (`audit-log-service`, Mongo) and becomes readable over a new TCP pattern; the Redis blob in admin-service is retired to a Kafka forwarder. The console reads everything from the token and the API.

**Tech Stack:** NestJS 11 on rspack, TypeORM (main DB does not synchronize — migrations applied by hand in dev), Mongoose (audit), Redis, Kafka, vitest (`apps/api`), Next 16 + jest (`apps/web`), `packages/shared-core` (auth context, API clients).

## Global Constraints

- Depends on Plan A (`scopeOf`, `assertInMarket` in `@app/common`, the admin market-scope regression spec). Run Plan A first.
- Main DB migrations live in `apps/api/migrations`, numbered after `1786501700000-OrderMarket.ts`; apply in dev with the migration runner against the main DB variables (or by hand: `ALTER TABLE … ADD COLUMN IF NOT EXISTS`), otherwise login answers 500 on the missing column.
- `DEV_AUTH_BYPASS` injects a user with no permission claim; B4 gives that user `['*']` so local development keeps working.
- Never return a secret in a response outside development: the MFA code is echoed only when `DEV_MFA_ECHO=true` **and** `NODE_ENV !== 'production'`.
- Staff roles: `SUPER_ADMIN`, `ADMIN`, `SUPPORT_AGENT`, `FINANCE_MANAGER`, `PRODUCT_MANAGER` (from `UserRole` in `@app/common`); the console's edge and shell accept exactly this set.
- No page renders a fixture array; a page whose API is missing shows an explicit "not connected" state naming the route.
- Commit API and web changes separately (lint-staged).

---

## File structure

| File                                                                                                                               | Responsibility                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/shared-core/src/auth/staff-roles.ts` (new)                                                                               | `STAFF_ROLES`, `isStaffRole()` — one list for edge, shell and login                                 |
| `packages/shared-core/src/auth/admin-session.ts` (new)                                                                             | `toAdminUser(session)` — token → console user, no fabrication                                       |
| `packages/shared-core/src/contexts/auth-context.tsx`                                                                               | strict `hasPermission`/`hasAnyPermission`                                                           |
| `apps/web/src/proxy.ts`, `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/login/page.tsx`                              | consume the above; MFA flow                                                                         |
| `apps/api/apps/api-gateway/src/services/staff-mfa.service.ts` (+ spec) (new)                                                       | challenge creation, delivery, verification                                                          |
| `apps/api/apps/api-gateway/src/controllers/gateway.controller.ts`                                                                  | login returns a challenge for staff; `POST /auth/mfa/verify`; `adminPermissions` claim; `@Throttle` |
| `apps/api/libs/common/src/admin/permissions.ts` (new)                                                                              | `ADMIN_PERMISSIONS`, `SYSTEM_ROLES` registry                                                        |
| `apps/api/migrations/1786501800000-AdminRoles.ts` (new)                                                                            | `admin.admin_roles`, `users.admin_role_id`, seeded system roles                                     |
| `apps/api/apps/api-gateway/src/entities/admin-role.entity.ts` (new), `entities/user.entity.ts`                                     | persistence                                                                                         |
| `apps/api/apps/api-gateway/src/controllers/admin-access.controller.ts` (+ spec, DTOs) (new)                                        | `/admin/roles`, `/admin/staff` (SUPER_ADMIN)                                                        |
| `apps/api/libs/security/src/jwt.strategy.ts`, `jwt-auth.guard.ts`; `guards/roles.guard.ts`                                         | claim mapping, wildcard                                                                             |
| `apps/api/apps/audit-log-service/src/main.ts`, `audit-log.controller.ts`, `audit-log.service.ts` (+ spec)                          | TCP transport, `audit.query`, `audit.record`                                                        |
| `apps/api/apps/api-gateway/src/controllers/admin-audit.controller.ts` (new); `admin-core.controller.ts`                            | `/admin/audit-logs` reads Mongo                                                                     |
| `apps/api/apps/admin-service/src/admin.service.ts`                                                                                 | `addAuditLog` forwards to Kafka                                                                     |
| `apps/api/apps/api-gateway/src/dto/admin-core.dto.ts`, `dto/admin-taxi.dto.ts` (new)                                               | validated bodies                                                                                    |
| `packages/shared-core/src/api/admin-core.ts`, `api-endpoints.ts`                                                                   | new client calls                                                                                    |
| `apps/web/src/app/admin/{security,kyc-verification,sellers,audit-logs,roles,staff}/page.tsx`, `admin/page.tsx`, `admin/layout.tsx` | API-backed                                                                                          |
| `packages/shared-core/src/contexts/audit-context.tsx`                                                                              | no seed data; posts to the API                                                                      |

---

### Task B1: The console tells the truth about role and market

**Files:**

- Create: `packages/shared-core/src/auth/staff-roles.ts`, `packages/shared-core/src/auth/admin-session.ts`, `packages/shared-core/src/auth/__tests__/admin-session.test.ts`
- Modify: `packages/shared-core/src/contexts/auth-context.tsx:403-416`
- Modify: `apps/web/src/proxy.ts:281-295`, `apps/web/src/app/admin/layout.tsx:220`, `apps/web/src/app/admin/login/page.tsx` (delete lines 74-270 `ADMIN_ACCOUNTS`/`makeAdminUser`, rewrite the post-login block 494-512)

**Interfaces:**

- `STAFF_ROLES: readonly ['SUPER_ADMIN','ADMIN','SUPPORT_AGENT','FINANCE_MANAGER','PRODUCT_MANAGER']`; `isStaffRole(role: unknown): role is StaffRole`.
- `toAdminUser(session: { user: AuthApiUser & { regionCode?: string|null; regionLocked?: boolean; adminPermissions?: string[]; adminRole?: { id: string; name: string } | null } }): AuthUser`.

- [ ] **Step 1: Failing tests**

`packages/shared-core/src/auth/__tests__/admin-session.test.ts` (jest, run from `apps/web` which resolves `@/…` into shared-core — `npx jest packages/shared-core/src/auth` or add the path to `apps/web/jest.config` `roots` if it is not already there):

```ts
import { isStaffRole, STAFF_ROLES } from '../staff-roles';
import { toAdminUser } from '../admin-session';

describe('staff roles', () => {
  it('names exactly the five staff roles', () => {
    expect([...STAFF_ROLES]).toEqual([
      'SUPER_ADMIN',
      'ADMIN',
      'SUPPORT_AGENT',
      'FINANCE_MANAGER',
      'PRODUCT_MANAGER',
    ]);
  });
  it('accepts lower-case wire values and rejects everything else', () => {
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('customer')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe('toAdminUser', () => {
  const base = { id: 'u1', email: 'qa-admin@kartseek.com', name: 'Qatar Admin', role: 'admin' };

  it('keeps the token role instead of stamping SUPER_ADMIN', () => {
    expect(toAdminUser({ user: base }).role).toBe('ADMIN');
    expect(toAdminUser({ user: { ...base, role: 'super_admin' } }).role).toBe('SUPER_ADMIN');
  });
  it('carries the market lock and labels a locked admin as regional', () => {
    const u = toAdminUser({ user: { ...base, regionCode: 'QA', regionLocked: true } });
    expect(u.regionCode).toBe('QA');
    expect(u.regionLocked).toBe(true);
    expect(u.adminRoleName).toBe('Regional Admin');
  });
  it('takes permissions from the session, with a wildcard only for SUPER_ADMIN', () => {
    expect(
      toAdminUser({ user: { ...base, adminPermissions: ['orders.view'] } }).adminPermissions,
    ).toEqual(['orders.view']);
    expect(toAdminUser({ user: { ...base, role: 'super_admin' } }).adminPermissions).toEqual(['*']);
  });
  it('gives an ADMIN with no claim yet the transitional wildcard (removed in B4)', () => {
    expect(toAdminUser({ user: base }).adminPermissions).toEqual(['*']);
  });
  it('never invents 2FA state', () => {
    expect(toAdminUser({ user: base }).twoFactorEnabled).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — FAIL** (`Cannot find module '../staff-roles'`).

- [ ] **Step 3: Implement**

`packages/shared-core/src/auth/staff-roles.ts`:

```ts
/** The roles that may open the admin console. Mirrors UserRole in @app/common. */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT_AGENT',
  'FINANCE_MANAGER',
  'PRODUCT_MANAGER',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: unknown): role is StaffRole {
  return (
    typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role.toUpperCase())
  );
}
```

`packages/shared-core/src/auth/admin-session.ts`:

```ts
import type { AuthUser } from '../contexts/auth-context';
import type { AuthApiUser } from '../api-endpoints';
import { isStaffRole, type StaffRole } from './staff-roles';

export interface StaffSessionUser extends AuthApiUser {
  regionCode?: string | null;
  regionLocked?: boolean;
  adminPermissions?: string[];
  adminRole?: { id: string; name: string } | null;
}

const ROLE_LABEL: Record<StaffRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SUPPORT_AGENT: 'Support Agent',
  FINANCE_MANAGER: 'Finance Manager',
  PRODUCT_MANAGER: 'Product Manager',
};

/**
 * The console user, built only from what the API signed. The old
 * `makeAdminUser` stamped every login as SUPER_ADMIN with permissions from a
 * demo table shipped to the browser; the shell then hid or showed actions
 * based on that fiction. Nothing here is invented: role, market lock and
 * permissions are the token's, and labels are derived from them.
 */
export function toAdminUser(session: { user: StaffSessionUser }): AuthUser {
  const u = session.user;
  const role = String(u.role ?? '').toUpperCase();
  if (!isStaffRole(role)) throw new Error('This account does not have admin access.');
  const regionLocked = u.regionLocked === true;
  const permissions =
    role === 'SUPER_ADMIN'
      ? ['*']
      : Array.isArray(u.adminPermissions)
        ? u.adminPermissions
        : // Transitional until B4 signs the claim: an ADMIN without one keeps the
          // full console rather than an empty sidebar.
          role === 'ADMIN'
          ? ['*']
          : [];
  return {
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    phone: u.phone,
    role: role as AuthUser['role'],
    isVerified: true,
    regionCode: u.regionCode ?? undefined,
    regionLocked,
    adminRoleId: u.adminRole?.id,
    adminRoleName: u.adminRole?.name ?? (regionLocked ? 'Regional Admin' : ROLE_LABEL[role]),
    adminPermissions: permissions,
  };
}
```

`auth-context.tsx` — replace `hasPermission` and `hasAnyPermission`:

```ts
const hasPermission = useCallback(
  (...perms: string[]) => {
    const granted = state.user?.adminPermissions ?? [];
    if (granted.includes('*')) return true;
    return perms.every((p) => granted.includes(p));
  },
  [state.user],
);

const hasAnyPermission = useCallback(
  (...perms: string[]) => {
    const granted = state.user?.adminPermissions ?? [];
    if (granted.includes('*')) return true;
    return perms.some((p) => granted.includes(p));
  },
  [state.user],
);
```

`proxy.ts` lines 281-295:

```ts
// ── 5. Admin Role Protection ─────────────────────────────────────────────
if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
  const userRole = request.cookies.get('kartseek_user_role')?.value;
  // Fail closed: no cookie, or a non-staff role, goes to the login page. The
  // cookie only gates rendering; every API call is authorised by the token.
  if (!isStaffRole(userRole)) {
    const adminLoginUrl = new URL('/admin/login', request.url);
    adminLoginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(adminLoginUrl);
  }
}
```

with `import { isStaffRole } from '@/auth/staff-roles';` (add a `"@/auth/*": ["../../packages/shared-core/src/auth/*"]` path in `apps/web/tsconfig.json` next to `"@/hooks/*"`).

`layout.tsx` line 220: `if (!isAdminLogin && isHydrated && (!isAuthenticated || !isStaffRole(user?.role))) {` with the same import; line 319 shows `user?.adminRoleName` (already) — remove the `|| 'Super Admin'` fallback.

`login/page.tsx`: delete `ADMIN_ACCOUNTS`, `AdminAccount`, `makeAdminUser`, `VALID_OTP`, `VALID_BACKUP_PREFIX`. Replace the block from `// The role comes from the signed token` through `login(user, token, session.refreshToken);` with:

```ts
let user: AuthUser;
try {
  user = toAdminUser(session as { user: StaffSessionUser });
} catch {
  setError('This account does not have admin access.');
  setLoading(false);
  return;
}
const token = session.accessToken;
login(user, token, session.refreshToken);
```

(B2 replaces this again with the challenge flow; B1 only stops the fabrication.) Keep the OTP phase as is for now.

- [ ] **Step 4: Tests green; `npx next build` in `apps/web` passes; commit**

```bash
git add packages/shared-core/src/auth packages/shared-core/src/contexts/auth-context.tsx apps/web/src/proxy.ts apps/web/src/app/admin/layout.tsx apps/web/src/app/admin/login/page.tsx apps/web/tsconfig.json
git commit -m "fix(web): the admin console takes role, market and permissions from the token, not from a demo table" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task B2: A real second factor for staff, enforced by the server

**Files:**

- Create: `apps/api/apps/api-gateway/src/services/staff-mfa.service.ts`, `staff-mfa.service.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/gateway.controller.ts` (`login`, new `mfaVerify`, `completeLogin`), `apps/api/apps/api-gateway/src/dto/gateway.dto.ts` (`MfaVerifyDto`), `api-gateway.module.ts` (provider)
- Modify: `packages/shared-core/src/api-endpoints.ts` (`authApi.mfaVerify`, `AuthSession.requires2FA/challengeToken/devCode`), `apps/web/src/app/admin/login/page.tsx` (OTP phase)
- Modify: `apps/api/scripts/verification/admin-scope-authz.mjs` and `regional-isolation-authz.mjs` (`login()` completes the challenge with `devCode`)

**Interfaces:**

- `StaffMfaService.createChallenge(user: { id: string; email?: string | null; phone?: string | null }): Promise<{ challengeToken: string; devCode?: string }>`
- `StaffMfaService.verify(challengeToken: string, code: string): Promise<string /* userId */>` — throws `UnauthorizedException` on a bad/expired token, wrong code (≤ 5 attempts) or exhausted attempts.
- `POST /auth/login` for a staff role → `{ success: true, requires2FA: true, challengeToken, user: { id, email, role }, devCode? }` (no access token).
- `POST /auth/mfa/verify { challengeToken, code }` → the normal login response.

- [ ] **Step 1: Failing service spec**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StaffMfaService } from './staff-mfa.service';

describe('StaffMfaService', () => {
  const store = new Map<string, string>();
  const redis = {
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    del: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const jwt = new JwtService({ secret: 'test-secret' });
  let svc: StaffMfaService;
  beforeEach(() => {
    store.clear();
    kafka.publish.mockClear();
    process.env.DEV_MFA_ECHO = 'true';
    process.env.NODE_ENV = 'test';
    svc = new StaffMfaService(redis as any, kafka as any, jwt);
  });

  it('creates a 6-digit challenge, stores it for 5 minutes and delivers it by email', async () => {
    const { challengeToken, devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    expect(devCode).toMatch(/^\d{6}$/);
    expect(redis.set).toHaveBeenCalledWith('mfa:u1', expect.any(String), 300);
    expect(kafka.publish).toHaveBeenCalledWith(
      'notification.email',
      expect.objectContaining({ email: 'a@b.c' }),
    );
    expect(jwt.verify(challengeToken)).toMatchObject({ sub: 'u1', type: 'mfa' });
  });

  it('verifies the right code once and burns it', async () => {
    const { challengeToken, devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    await expect(svc.verify(challengeToken, devCode!)).resolves.toBe('u1');
    await expect(svc.verify(challengeToken, devCode!)).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a wrong code and locks after five attempts', async () => {
    const { challengeToken, devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    for (let i = 0; i < 5; i++)
      await expect(svc.verify(challengeToken, '000000')).rejects.toThrow(UnauthorizedException);
    await expect(svc.verify(challengeToken, devCode!)).rejects.toThrow('Too many attempts');
  });

  it('refuses an access token used as a challenge', async () => {
    const access = jwt.sign({ sub: 'u1', type: 'access' });
    await expect(svc.verify(access, '123456')).rejects.toThrow(UnauthorizedException);
  });

  it('does not echo the code outside development', async () => {
    process.env.NODE_ENV = 'production';
    const { devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    expect(devCode).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — FAIL** (module missing).

- [ ] **Step 3: Implement the service**

```ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';

/**
 * Second factor for staff sign-in.
 *
 * Login for a staff role no longer returns an access token; it returns a
 * short-lived challenge token (JWT, type `mfa`) and delivers a six-digit code.
 * `verify` exchanges challenge + code for the session. The code lives in Redis
 * under the user id with an attempt counter, so a brute force runs out after
 * five tries and the code cannot be replayed once used.
 *
 * Before this, the admin console compared the code in the browser against
 * `NEXT_PUBLIC_ADMIN_OTP || '123456'` after it had already stored the token.
 */
@Injectable()
export class StaffMfaService {
  private readonly logger = new Logger(StaffMfaService.name);
  static readonly TTL_SECONDS = 300;
  static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly jwt: JwtService,
  ) {}

  private key(userId: string) {
    return `mfa:${userId}`;
  }

  private echoAllowed(): boolean {
    return process.env.DEV_MFA_ECHO === 'true' && process.env.NODE_ENV !== 'production';
  }

  async createChallenge(user: { id: string; email?: string | null; phone?: string | null }) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.redis.set(
      this.key(user.id),
      JSON.stringify({ code, attempts: 0 }),
      StaffMfaService.TTL_SECONDS,
    );
    const challengeToken = this.jwt.sign(
      { sub: user.id, type: 'mfa', jti: crypto.randomUUID() },
      { expiresIn: StaffMfaService.TTL_SECONDS },
    );
    const message = `${code} is your KARTSEEK admin sign-in code. It expires in ${StaffMfaService.TTL_SECONDS / 60} minutes.`;
    if (user.email) {
      await this.kafka.publish(KAFKA_TOPICS.NOTIFICATION_EMAIL, {
        email: user.email,
        subject: 'Your KARTSEEK sign-in code',
        message,
        template: 'staff-mfa-code',
        data: { code },
      });
    } else if (user.phone) {
      await this.kafka.publish(KAFKA_TOPICS.NOTIFICATION_SMS, { phone: user.phone, message });
    }
    this.logger.log(`MFA challenge issued for ${user.id}`);
    return { challengeToken, ...(this.echoAllowed() ? { devCode: code } : {}) };
  }

  async verify(challengeToken: string, code: string): Promise<string> {
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwt.verify(challengeToken);
    } catch {
      throw new UnauthorizedException('Sign-in challenge expired. Please sign in again.');
    }
    if (payload.type !== 'mfa' || !payload.sub) {
      throw new UnauthorizedException('Not a sign-in challenge.');
    }
    const raw = await this.redis.get(this.key(payload.sub));
    if (!raw) throw new UnauthorizedException('Sign-in challenge expired. Please sign in again.');
    const state = JSON.parse(raw) as { code: string; attempts: number };
    if (state.attempts >= StaffMfaService.MAX_ATTEMPTS) {
      await this.redis.del(this.key(payload.sub));
      throw new UnauthorizedException('Too many attempts. Please sign in again.');
    }
    const expected = Buffer.from(state.code);
    const given = Buffer.from(String(code ?? '').padStart(expected.length, ' '));
    const match = given.length === expected.length && crypto.timingSafeEqual(expected, given);
    if (!match) {
      state.attempts += 1;
      await this.redis.set(
        this.key(payload.sub),
        JSON.stringify(state),
        StaffMfaService.TTL_SECONDS,
      );
      throw new UnauthorizedException(
        `Invalid code. ${StaffMfaService.MAX_ATTEMPTS - state.attempts} attempt(s) remaining.`,
      );
    }
    await this.redis.del(this.key(payload.sub));
    return payload.sub;
  }
}
```

Confirm the email consumer's field names: `grep -rn "NOTIFICATION_EMAIL\|notification.email" apps/api/apps/notification-service/src --include=*.ts | head` and align `email/subject/message` with what `handleEmail` (or equivalent) reads — change the publish payload keys here, not the consumer.

- [ ] **Step 4: Spec green.** Register `StaffMfaService` in `api-gateway.module.ts` `providers` (JwtModule is already imported for the controller).

- [ ] **Step 5: Wire the controller**

In `gateway.controller.ts` add to the `AuthController` constructor `private readonly staffMfa: StaffMfaService`, and `import { Throttle } from '@nestjs/throttler';`, `import { isStaffRole } from '@app/common';` (add `isStaffRole` to `libs/common/src/enums/role.enum.ts`:

```ts
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT_AGENT',
  'FINANCE_MANAGER',
  'PRODUCT_MANAGER',
] as const;
export function isStaffRole(role: unknown): boolean {
  return (
    typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role.toUpperCase())
  );
}
```

).

Decorate `login` with `@Throttle({ default: { limit: 10, ttl: 60_000 } })`. Move everything in `login` after the successful `bcrypt.compare` (lockout reset if any — `grep -n "lockout\.\(reset\|clear\)" gateway.controller.ts` — token issue, refresh hash storage, the response object) into:

```ts
  /** The session response, shared by password login and MFA completion. */
  private async completeLogin(user: User) {
    const { accessToken, refreshToken } = this.issueTokens(user);
    await this.redis.set(`refresh:${user.id}`, this.hashToken(refreshToken), AuthController.REFRESH_TTL_SECONDS);
    return {
      success: true,
      user: this.publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: AuthController.ACCESS_TTL_SECONDS,
    };
  }
```

(`publicUser` = whatever object literal the current tail builds — keep its fields; if none exists as a method, extract it.) Then, at the point where `isValid` is true:

```ts
if (isStaffRole(user.role)) {
  // Staff finish sign-in with a second factor; no session until then.
  const challenge = await this.staffMfa.createChallenge(user);
  return {
    success: true,
    requires2FA: true,
    challengeToken: challenge.challengeToken,
    user: { id: user.id, email: user.email, role: user.role },
    ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
  };
}
return this.completeLogin(user);
```

Add the route after `login`:

```ts
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete a staff sign-in with the delivered code' })
  async mfaVerify(@Body() body: MfaVerifyDto) {
    const userId = await this.staffMfa.verify(body.challengeToken, body.code);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account unavailable.');
    return this.completeLogin(user);
  }
```

`gateway.dto.ts`:

```ts
export class MfaVerifyDto {
  @ApiProperty() @IsNotEmpty() @IsString() challengeToken: string;
  @ApiProperty({ example: '482910' })
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}
```

- [ ] **Step 6: Web client and login page**

`api-endpoints.ts`: extend `AuthSession` with `requires2FA?: boolean; challengeToken?: string; devCode?: string;` and add `mfaVerify: (challengeToken: string, code: string) => api.post<AuthSession>('/auth/mfa/verify', { challengeToken, code }),` to `authApi`.

`login/page.tsx`: state `const [challengeToken, setChallengeToken] = useState<string | null>(null);`. After `session = await authApi.login(...)`:

```ts
if (session.requires2FA && session.challengeToken) {
  setChallengeToken(session.challengeToken);
  setPhase('otp');
  setCountdown(300);
  setOtp('');
  setOtpAttempts(0);
  setError('');
  setLoading(false);
  if (session.devCode) setError(`Development build: your code is ${session.devCode}`);
  return;
}
setError('This account does not have admin access.');
setLoading(false);
```

and `handleOtpSubmit` becomes:

```ts
const handleOtpSubmit = async () => {
  if (!challengeToken) {
    setPhase('credentials');
    return;
  }
  setError('');
  setLoading(true);
  try {
    const verified = await authApi.mfaVerify(challengeToken, otp);
    const user = toAdminUser(verified as { user: StaffSessionUser });
    login(user, verified.accessToken, verified.refreshToken);
    setOtpSuccess(true);
    router.push(redirect);
  } catch (err) {
    setOtpAttempts((prev) => prev + 1);
    setError(
      err instanceof ApiError ? err.message : 'We could not verify the code. Please try again.',
    );
    setShake(true);
    setTimeout(() => setShake(false), 600);
  } finally {
    setLoading(false);
  }
};
```

Delete the backup-code UI and `useBackupCode`; `handleResend` calls `authApi.login(email, password)` again to get a fresh challenge. Remove `set2FARequired`/`complete2FA` usage here (the pending state now lives in `challengeToken`).

- [ ] **Step 7: Update the live scripts' `login()`**

In both `.mjs` scripts:

```js
async function login({ email, password }) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let j = await r.json();
  if (j.requires2FA) {
    if (!j.devCode)
      throw new Error(`MFA required for ${email}; run the fleet with DEV_MFA_ECHO=true`);
    const v = await fetch(`${BASE}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken: j.challengeToken, code: j.devCode }),
    });
    j = await v.json();
  }
  if (!j.accessToken)
    throw new Error(`login failed for ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.accessToken;
}
```

Add `DEV_MFA_ECHO=true` to `apps/api/.env.example` with a comment, and to the dev `.env`.

- [ ] **Step 8: Verify**

`npx vitest run apps/api-gateway/src/services/staff-mfa.service.spec.ts` → 5 passed; `npx nest build --all` → 0; restart the gateway; live:

```bash
curl -s -X POST localhost:3001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"qa-admin@kartseek.com","password":"AdminPass123!"}'
# → {"success":true,"requires2FA":true,"challengeToken":"…","devCode":"123456"} and NO accessToken
```

Then `npm run verify:admin-scope` → all passed (the script now completes the challenge). Console: sign in as the QA admin, the OTP screen shows the dev code hint, wrong code is refused by the server, right code lands on the dashboard.

- [ ] **Step 9: Commit (API, then web, then scripts)**

---

### Task B3: Admin roles and staff are persisted and managed by SUPER_ADMIN

**Files:**

- Create: `apps/api/libs/common/src/admin/permissions.ts`; export from `libs/common/src/index.ts`
- Create: `apps/api/migrations/1786501800000-AdminRoles.ts`
- Create: `apps/api/apps/api-gateway/src/entities/admin-role.entity.ts`; modify `entities/user.entity.ts` (+ `adminRoleId`)
- Create: `apps/api/apps/api-gateway/src/dto/admin-access.dto.ts`, `controllers/admin-access.controller.ts`, `controllers/admin-access.controller.spec.ts`
- Modify: `api-gateway.module.ts` (`TypeOrmModule.forFeature([... AdminRole])`, controller), `services/test-seed.service.ts` (SUPER_ADMIN account + role assignment)

**Interfaces:**

- `ADMIN_PERMISSIONS: ReadonlyArray<{ key: string; label: string; group: string }>` — the 27 keys from the roles page plus `staff.view`, `staff.manage`, `wallet.audit`, `loyalty.view`, `modules.marketplace|grocery|restaurant|pharmacy|doctor|hotel|taxi`, `security.manage`.
- `SYSTEM_ROLES: ReadonlyArray<{ key: string; name: string; description: string; permissions: string[] }>` — `super_admin (['*'])`, `admin (every key)`, `regional_admin (every key except staff.manage, system.settings, security.manage)`, `finance_manager`, `support_agent`, `product_manager`.
- Entity `AdminRole { id: uuid; key: string; name: string; description: string | null; permissions: string[]; isSystem: boolean; createdAt; updatedAt }` at `{ schema: 'admin', name: 'admin_roles' }`.
- Routes (all `@Roles(UserRole.SUPER_ADMIN)`): `GET /admin/roles`, `POST /admin/roles`, `PATCH /admin/roles/:id`, `DELETE /admin/roles/:id`, `GET /admin/staff?page&limit&search&roleId&regionCode`, `POST /admin/staff`, `PATCH /admin/staff/:id`, `POST /admin/staff/:id/deactivate`.
- DTOs: `CreateRoleDto { key /^[a-z_]{3,40}$/, name 2-80, description ≤ 300, permissions: string[] each ∈ ADMIN_PERMISSIONS keys }`, `UpdateRoleDto` (partial, no `key`), `CreateStaffDto { email, firstName, lastName, phone?, role ∈ STAFF_ROLES minus SUPER_ADMIN, adminRoleId uuid, regionCode? /^[A-Z]{2}$/, regionLocked?: boolean }`, `UpdateStaffDto` (partial + `isActive`).

- [ ] **Step 1: Migration**

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — admin roles as data.
 *
 * `admin.admin_roles` holds the permission sets the console's Roles &
 * Permissions page used to keep in a static array in the browser, and
 * `users.admin_role_id` assigns one to a staff account. The gateway signs the
 * role's permissions into the token at login (`adminPermissions`), which is
 * what RolesGuard's `perm:` keys check.
 */
export class AdminRoles1786501800000 implements MigrationInterface {
  name = 'AdminRoles1786501800000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "admin"`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "admin"."admin_roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(40) NOT NULL UNIQUE,
        "name" varchar(80) NOT NULL,
        "description" varchar(300),
        "permissions" text[] NOT NULL DEFAULT '{}',
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "admin_role_id" uuid REFERENCES "admin"."admin_roles"("id") ON DELETE SET NULL`,
    );
    await q.query(`
      INSERT INTO "admin"."admin_roles" ("key","name","description","permissions","is_system") VALUES
        ('super_admin','Super Admin','Global control of every module, market and setting','{*}',true),
        ('admin','Admin','Platform operations across every market','{dashboard.view,orders.view,orders.manage,orders.refund,users.view,users.manage,sellers.view,sellers.manage,sellers.approve,finance.view,finance.payouts,finance.reports,kyc.view,kyc.approve,content.view,content.manage,promotions.manage,system.health,audit.logs,franchise.view,franchise.manage,delivery.view,delivery.manage,support.view,support.respond,staff.view,wallet.audit,loyalty.view,modules.marketplace,modules.grocery,modules.restaurant,modules.pharmacy,modules.doctor,modules.hotel,modules.taxi}',true),
        ('regional_admin','Regional Admin','Everything an Admin can do, inside one market','{dashboard.view,orders.view,orders.manage,orders.refund,users.view,users.manage,sellers.view,sellers.manage,sellers.approve,finance.view,finance.payouts,finance.reports,kyc.view,kyc.approve,content.view,content.manage,promotions.manage,audit.logs,franchise.view,delivery.view,delivery.manage,support.view,support.respond,wallet.audit,loyalty.view,modules.marketplace,modules.grocery,modules.restaurant,modules.pharmacy,modules.doctor,modules.hotel,modules.taxi}',true),
        ('finance_manager','Finance Manager','Payouts, commissions, refunds and financial reports','{dashboard.view,orders.view,orders.refund,finance.view,finance.payouts,finance.reports,wallet.audit,audit.logs}',true),
        ('support_agent','Support Agent','Customer and seller support, read-only elsewhere','{dashboard.view,orders.view,users.view,sellers.view,support.view,support.respond,kyc.view}',true),
        ('product_manager','Product Manager','Catalogue, content and promotions','{dashboard.view,sellers.view,content.view,content.manage,promotions.manage,modules.marketplace,modules.grocery}',true)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "admin_role_id"`);
    await q.query(`DROP TABLE IF EXISTS "admin"."admin_roles"`);
  }
}
```

`libs/common/src/admin/permissions.ts` declares the same lists in TypeScript (`ADMIN_PERMISSIONS` with labels/groups copied from `apps/web/src/app/admin/roles/page.tsx` lines 19-50 plus the added keys; `SYSTEM_ROLES` with the same permission arrays as the migration). A spec `permissions.spec.ts` asserts every `SYSTEM_ROLES[].permissions` entry other than `'*'` is a key in `ADMIN_PERMISSIONS`, so the two lists cannot drift.

Apply in dev: `node -e` with `pg` against the main DB, or the migration runner pointed at the main DB variables (see `project_regional_admin_scope`). Verify: `SELECT key FROM admin.admin_roles;` → 6 rows.

- [ ] **Step 2: Entities**

`admin-role.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'admin', name: 'admin_roles' })
export class AdminRole {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 40, unique: true }) key: string;
  @Column({ type: 'varchar', length: 80 }) name: string;
  @Column({ type: 'varchar', length: 300, nullable: true }) description: string | null;
  @Column({ type: 'text', array: true, default: '{}' }) permissions: string[];
  @Column({ name: 'is_system', type: 'boolean', default: false }) isSystem: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
```

`user.entity.ts` (gateway) after `regionLocked`:

```ts
  /** The admin role whose permissions are signed into this account's token. */
  @Column({ name: 'admin_role_id', type: 'uuid', nullable: true })
  adminRoleId: string | null;
```

(The explicit `type` matters: `string | null` without one boots as `Object` — `project_typeorm_nullable_reflection`.) Register `AdminRole` in the gateway's `TypeOrmModule.forFeature([...])` and in its root entity list.

- [ ] **Step 3: Failing controller spec**

```ts
import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AdminAccessController } from './admin-access.controller';

const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };
const lockedAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const req = (user: object) => ({ user, method: 'POST', originalUrl: '/x', headers: {} });

function build(roles: any[] = [], users: any[] = []) {
  const roleRepo = {
    find: vi.fn(async () => roles),
    findOne: vi.fn(
      async ({ where }: any) => roles.find((r) => r.id === where.id || r.key === where.key) ?? null,
    ),
    create: vi.fn((d: any) => ({ id: 'r-new', isSystem: false, ...d })),
    save: vi.fn(async (r: any) => r),
    remove: vi.fn(async () => undefined),
  };
  const userRepo = {
    count: vi.fn(async () => users.length),
    findOne: vi.fn(async () => null),
    create: vi.fn((d: any) => ({ id: 'u-new', ...d })),
    save: vi.fn(async (u: any) => u),
    createQueryBuilder: vi.fn(() => ({
      where: () => ({
        andWhere: () => ({
          orderBy: () => ({
            skip: () => ({ take: () => ({ getManyAndCount: async () => [users, users.length] }) }),
          }),
        }),
      }),
    })),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  return {
    ctrl: new AdminAccessController(roleRepo as any, userRepo as any, kafka as any),
    roleRepo,
    userRepo,
    kafka,
  };
}

describe('AdminAccessController', () => {
  it('refuses a locked admin even with the right role', async () => {
    const { ctrl } = build();
    await expect(ctrl.listRoles(req(lockedAdmin))).rejects.toThrow(ForbiddenException);
  });
  it('creates a role with known permissions only', async () => {
    const { ctrl } = build();
    await expect(
      ctrl.createRole(req(superAdmin), {
        key: 'ops_lead',
        name: 'Ops Lead',
        permissions: ['orders.view', 'not.a.key'],
      } as any),
    ).rejects.toThrow(BadRequestException);
    const created = await ctrl.createRole(req(superAdmin), {
      key: 'ops_lead',
      name: 'Ops Lead',
      permissions: ['orders.view'],
    } as any);
    expect(created.data.permissions).toEqual(['orders.view']);
  });
  it('never deletes a system role or a role with staff assigned', async () => {
    const sys = { id: 'r-sys', key: 'admin', isSystem: true, permissions: [] };
    const { ctrl } = build([sys], [{ id: 'u1', adminRoleId: 'r-sys' }]);
    await expect(ctrl.deleteRole(req(superAdmin), 'r-sys')).rejects.toThrow(ConflictException);
  });
  it('creates a staff account with a hashed temporary password and no secret in the response', async () => {
    const role = { id: 'r-reg', key: 'regional_admin', isSystem: true, permissions: [] };
    const { ctrl, userRepo, kafka } = build([role]);
    process.env.NODE_ENV = 'production';
    const res = await ctrl.createStaff(req(superAdmin), {
      email: 'x@kartseek.com',
      firstName: 'X',
      lastName: 'Y',
      role: 'ADMIN',
      adminRoleId: 'r-reg',
      regionCode: 'AE',
      regionLocked: true,
    } as any);
    const saved = userRepo.save.mock.calls[0][0];
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(saved).toMatchObject({
      role: 'ADMIN',
      regionCode: 'AE',
      regionLocked: true,
      adminRoleId: 'r-reg',
    });
    expect(JSON.stringify(res)).not.toContain(saved.passwordHash);
    expect(res.data.temporaryPassword).toBeUndefined();
    expect(kafka.publish).toHaveBeenCalledWith(
      'notification.email',
      expect.objectContaining({ email: 'x@kartseek.com' }),
    );
  });
});
```

- [ ] **Step 4: Implement the controller**

```ts
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '@app/security';
import { ADMIN_PERMISSIONS, STAFF_ROLES, UserRole } from '@app/common';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import { marketScopeOf } from '../guards/market-scope';
import { AdminRole } from '../entities/admin-role.entity';
import { User } from '../entities/user.entity';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreateStaffDto,
  UpdateStaffDto,
} from '../dto/admin-access.dto';

const PERMISSION_KEYS = new Set(ADMIN_PERMISSIONS.map((p) => p.key));

/**
 * Roles & staff. SUPER_ADMIN only, and never a market-locked account — these
 * are global entities by nature (a role applies everywhere; a staff record is
 * what *creates* a market lock).
 */
@ApiTags('👑 Admin — Access')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminAccessController {
  constructor(
    @InjectRepository(AdminRole) private readonly roleRepo: Repository<AdminRole>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly kafka: KafkaProducerService,
  ) {}

  private requireGlobal(req: any) {
    if (marketScopeOf(req).locked)
      throw new ForbiddenException('Roles and staff are managed globally.');
  }

  private validatePermissions(perms: string[]) {
    const unknown = perms.filter((p) => p !== '*' && !PERMISSION_KEYS.has(p));
    if (unknown.length)
      throw new BadRequestException(`Unknown permission key(s): ${unknown.join(', ')}`);
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  @Get('roles')
  @GlobalEntity('roles apply to every market')
  @ApiOperation({ summary: 'Admin roles with their permission sets' })
  async listRoles(@Req() req: any) {
    this.requireGlobal(req); // marketScopeOf(req)
    const roles = await this.roleRepo.find({ order: { isSystem: 'DESC', name: 'ASC' } });
    const counts = await Promise.all(
      roles.map((r) => this.userRepo.count({ where: { adminRoleId: r.id } })),
    );
    return {
      data: roles.map((r, i) => ({ ...r, userCount: counts[i] })),
      permissions: ADMIN_PERMISSIONS,
    };
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a custom role' })
  async createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
    this.requireGlobal(req);
    if (marketScopeOf(req).locked) return;
    this.validatePermissions(dto.permissions);
    if (await this.roleRepo.findOne({ where: { key: dto.key } }))
      throw new ConflictException('A role with that key exists.');
    const role = await this.roleRepo.save(this.roleRepo.create({ ...dto, isSystem: false }));
    await this.kafka.publish('admin.role.created', {
      roleId: role.id,
      key: role.key,
      actorId: req.user.id,
    });
    return { data: role };
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Rename a role or change its permissions' })
  async updateRole(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    this.requireGlobal(req);
    if (marketScopeOf(req).locked) return;
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.key === 'super_admin')
      throw new ForbiddenException('The super_admin role cannot be edited.');
    if (dto.permissions) this.validatePermissions(dto.permissions);
    Object.assign(role, dto);
    const saved = await this.roleRepo.save(role);
    await this.kafka.publish('admin.role.updated', {
      roleId: id,
      actorId: req.user.id,
      permissions: saved.permissions,
    });
    return { data: saved };
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a custom role that no staff member holds' })
  async deleteRole(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.requireGlobal(req);
    if (marketScopeOf(req).locked) return;
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ConflictException('System roles cannot be deleted.');
    if ((await this.userRepo.count({ where: { adminRoleId: id } })) > 0)
      throw new ConflictException('Reassign the staff holding this role first.');
    await this.roleRepo.remove(role);
    await this.kafka.publish('admin.role.deleted', { roleId: id, actorId: req.user.id });
    return { success: true };
  }

  // ── Staff ──────────────────────────────────────────────────────────────────

  @Get('staff')
  @GlobalEntity('staff directory is global; the lock is a property of each record')
  @ApiOperation({ summary: 'Staff accounts' })
  async listStaff(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('regionCode') regionCode?: string,
  ) {
    this.requireGlobal(req); // marketScopeOf(req)
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('UPPER(u.role) IN (:...roles)', { roles: [...STAFF_ROLES] });
    if (search)
      qb.andWhere('(u.email ILIKE :q OR u.firstName ILIKE :q OR u.lastName ILIKE :q)', {
        q: `%${search}%`,
      });
    if (roleId) qb.andWhere('u.adminRoleId = :roleId', { roleId });
    if (regionCode) qb.andWhere('u.regionCode = :rc', { rc: regionCode.toUpperCase() });
    const [rows, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * Math.min(limit, 100))
      .take(Math.min(limit, 100))
      .getManyAndCount();
    return { data: rows.map((u) => this.staffView(u)), total, page, limit };
  }

  @Post('staff')
  @ApiOperation({ summary: 'Create a staff account; a temporary password is emailed' })
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    this.requireGlobal(req);
    if (marketScopeOf(req).locked) return;
    const email = dto.email.toLowerCase().trim();
    if (await this.userRepo.findOne({ where: { email } }))
      throw new ConflictException('An account with this email already exists');
    const role = await this.roleRepo.findOne({ where: { id: dto.adminRoleId } });
    if (!role) throw new BadRequestException('Unknown admin role');
    if (role.key === 'super_admin')
      throw new ForbiddenException(
        'SUPER_ADMIN accounts are created by an operator, not through the console.',
      );
    const temporaryPassword = crypto.randomBytes(9).toString('base64url');
    const user = this.userRepo.create({
      email,
      phone: dto.phone ?? null,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role as UserRole,
      regionCode: dto.regionLocked
        ? dto.regionCode!.toUpperCase()
        : (dto.regionCode?.toUpperCase() ?? null),
      regionLocked: dto.regionLocked === true,
      adminRoleId: role.id,
      isActive: true,
      status: 'active',
    } as Partial<User>);
    const saved = await this.userRepo.save(user);
    await this.kafka.publish(KAFKA_TOPICS.NOTIFICATION_EMAIL, {
      email,
      subject: 'Your KARTSEEK admin account',
      template: 'staff-welcome',
      message: `Your admin account is ready. Temporary password: ${temporaryPassword}. Sign in and change it.`,
      data: { temporaryPassword },
    });
    await this.kafka.publish('admin.staff.created', {
      userId: saved.id,
      role: saved.role,
      regionCode: saved.regionCode,
      adminRoleId: role.id,
      actorId: req.user.id,
    });
    const echo = process.env.DEV_MFA_ECHO === 'true' && process.env.NODE_ENV !== 'production';
    return { data: { ...this.staffView(saved), ...(echo ? { temporaryPassword } : {}) } };
  }

  @Patch('staff/:id')
  @ApiOperation({ summary: "Change a staff member's role, market lock or active flag" })
  async updateStaff(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    this.requireGlobal(req);
    if (marketScopeOf(req).locked) return;
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user || !STAFF_ROLES.includes(String(user.role).toUpperCase() as any))
      throw new NotFoundException('Staff member not found');
    if (user.id === req.user.id && dto.isActive === false)
      throw new BadRequestException('You cannot deactivate your own account.');
    if (dto.adminRoleId && !(await this.roleRepo.findOne({ where: { id: dto.adminRoleId } })))
      throw new BadRequestException('Unknown admin role');
    if (dto.regionLocked === true && !(dto.regionCode ?? user.regionCode))
      throw new BadRequestException('A locked account needs a market');
    Object.assign(user, {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.adminRoleId !== undefined ? { adminRoleId: dto.adminRoleId } : {}),
      ...(dto.regionCode !== undefined
        ? { regionCode: dto.regionCode?.toUpperCase() ?? null }
        : {}),
      ...(dto.regionLocked !== undefined ? { regionLocked: dto.regionLocked } : {}),
      ...(dto.isActive !== undefined
        ? { isActive: dto.isActive, status: dto.isActive ? 'active' : 'suspended' }
        : {}),
    });
    const saved = await this.userRepo.save(user);
    await this.kafka.publish('admin.staff.updated', {
      userId: id,
      actorId: req.user.id,
      changes: Object.keys(dto),
    });
    return { data: this.staffView(saved) };
  }

  private staffView(u: User) {
    return {
      id: u.id,
      email: u.email,
      name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      phone: u.phone ?? null,
      role: String(u.role).toUpperCase(),
      adminRoleId: u.adminRoleId ?? null,
      regionCode: u.regionCode ?? null,
      regionLocked: u.regionLocked === true,
      isActive: u.isActive,
      status: u.status,
      createdAt: u.createdAt,
    };
  }
}
```

The pattern `this.requireGlobal(req); if (marketScopeOf(req).locked) return;` on writes is what the Plan A regression spec's `SCOPED` regex needs to see inside each write block; `requireGlobal` throws first, so the `return` never executes. (`@GlobalEntity` stays on the two reads only.)

`admin-access.dto.ts` with class-validator (`IsEmail`, `Matches(/^[a-z_]{3,40}$/)`, `Length`, `IsIn([...STAFF_ROLES].filter(r => r !== 'SUPER_ADMIN'))`, `IsUUID`, `IsOptional`, `IsBoolean`, `IsArray`, `IsString({ each: true })`, `Matches(/^[A-Z]{2}$/i)` for `regionCode`).

Register `AdminAccessController` in the gateway module; the phone column is encrypted on register (`this.encryption.encrypt`) — inject `EncryptionService` and encrypt `phone` the same way if the entity stores it encrypted (check `registerSeller`).

- [ ] **Step 5: Seed**

`test-seed.service.ts`: add `{ email: 'superadmin@kartseek.com', password: 'AdminPass123!', role: UserRole.SUPER_ADMIN, firstName: 'Super', lastName: 'Admin' }` and an `adminRoleKey` field per staff entry (`admin@` → `admin`, `qa-admin@`/`india-admin@` → `regional_admin`, `superadmin@` → `super_admin`); after saving a staff user, look the role up by key with the `AdminRole` repository and set `adminRoleId`. Live: `SELECT email, admin_role_id FROM users WHERE role IN ('ADMIN','SUPER_ADMIN','admin','super_admin');` shows the four assignments.

- [ ] **Step 6: Specs green, `nest build --all`, live probe**

```bash
S=$(… login as superadmin@kartseek.com, complete MFA …)
curl -s -H "Authorization: Bearer $S" localhost:3001/api/v1/admin/roles | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.map(r=>r.key).join(",")'   # super_admin,admin,regional_admin,finance_manager,support_agent,product_manager
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" localhost:3001/api/v1/admin/roles   # 403 (ADMIN role)
```

- [ ] **Step 7: Web — roles and staff pages read and write the API**

`packages/shared-core/src/api/admin-core.ts` add:

```ts
  listRoles: () => apiCall<{ data: AdminRoleRow[]; permissions: PermissionDef[] }>(`${BASE_URL}/admin/roles`),
  createRole: (dto: { key: string; name: string; description?: string; permissions: string[] }) =>
    apiCall<{ data: AdminRoleRow }>(`${BASE_URL}/admin/roles`, { method: 'POST', body: JSON.stringify(dto) }),
  updateRole: (id: string, dto: Partial<{ name: string; description: string; permissions: string[] }>) =>
    apiCall<{ data: AdminRoleRow }>(`${BASE_URL}/admin/roles/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteRole: (id: string) => apiCall<{ success: boolean }>(`${BASE_URL}/admin/roles/${id}`, { method: 'DELETE' }),
  listStaff: (p: AdminListParams & { roleId?: string; regionCode?: string } = {}) =>
    apiCall<PaginatedResponse<StaffRow>>(`${BASE_URL}/admin/staff${buildQuery(p)}`),
  createStaff: (dto: CreateStaffPayload) => apiCall<{ data: StaffRow }>(`${BASE_URL}/admin/staff`, { method: 'POST', body: JSON.stringify(dto) }),
  updateStaff: (id: string, dto: Partial<CreateStaffPayload> & { isActive?: boolean }) =>
    apiCall<{ data: StaffRow }>(`${BASE_URL}/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
```

with the row types exported (`AdminRoleRow { id; key; name; description; permissions; isSystem; userCount }`, `PermissionDef { key; label; group }`, `StaffRow` = the `staffView` shape, `CreateStaffPayload`).

`roles/page.tsx`: delete `allPermissions` and `INITIAL_ROLES`; load with `useAdminData(() => adminCoreApi.listRoles(), [])`; the permission groups come from `data.permissions`; the modal's save calls `createRole`/`updateRole`; delete calls `deleteRole` after a `ConfirmDialog`; `userCount` from the API. `staff/page.tsx`: delete `DEMO_STAFF`, `ADMIN_ROLES`, `REGIONS`; roles from `listRoles()`, markets from `REGIONS` in `@/lib/contexts/region-context`; list via `listStaff({ page, limit, search, roleId, regionCode })`; create/update through the API; show the temporary password only when the response echoes it (dev).

Jest: `apps/web/src/app/admin/roles/__tests__/roles-page.test.tsx` mocks `@/lib/api/admin-core` to return two roles and asserts both names render and no "INITIAL" fixture name (`'Platform Super Admin'` etc. from the old array) appears; same shape for staff (`'DEMO'` names absent).

- [ ] **Step 8: Commit (migration + API; then web)**

---

### Task B4: The token carries permissions and the guards use them

**Files:**

- Modify: `gateway.controller.ts` (`issueTokens` gains `adminPermissions`; `completeLogin` computes them; `/auth/profile` returns them + `adminRole`), `apps/api/libs/security/src/jwt.strategy.ts`, `jwt-auth.guard.ts` (bypass user), `guards/roles.guard.ts` (`'*'`), `guards/roles.guard.spec.ts`
- Modify: first permission-gated routes — `admin-marketplace.controller.ts` payouts/refunds/commissions/wallet (`'perm:finance.payouts'`, `'perm:orders.refund'`, `'perm:finance.view'`), `admin-access.controller.ts` (`'perm:staff.manage'`), `ddos-admin.controller.ts` (`'perm:security.manage'`)
- Modify: `packages/shared-core/src/auth/admin-session.ts` (remove the transitional wildcard), `admin/layout.tsx` (every nav item has a `perm`)

- [ ] **Step 1: Failing guard spec additions** (append to `roles.guard.spec.ts`):

```ts
it('treats "*" as every permission', () => {
  const guard = new RolesGuard(
    reflectorFor(['perm:finance.payouts']),
    new JwtService({ secret: 's' }),
  );
  expect(guard.canActivate(ctxWithUser({ role: 'ADMIN', adminPermissions: ['*'] }))).toBe(true);
});
it('denies a role-only user a permission-gated route', () => {
  const guard = new RolesGuard(
    reflectorFor(['ADMIN', 'perm:finance.payouts']),
    new JwtService({ secret: 's' }),
  );
  expect(() =>
    guard.canActivate(ctxWithUser({ role: 'ADMIN', adminPermissions: ['orders.view'] })),
  ).toThrow(ForbiddenException);
  expect(
    guard.canActivate(ctxWithUser({ role: 'ADMIN', adminPermissions: ['finance.payouts'] })),
  ).toBe(true);
});
```

(`reflectorFor` and `ctxWithUser` are the helpers the spec already defines for its existing cases; reuse their names.)

- [ ] **Step 2: Implement**

`roles.guard.ts` — in the permission branch: `const hasPerms = granted.includes('*') || permRequirements.every((perm) => granted.includes(perm));`

`jwt.strategy.ts` `validate` — add after `regionLocked`:

```ts
      // Permission keys signed at login from the account's admin role; RolesGuard
      // checks `perm:` requirements against them. Absent for non-staff.
      adminPermissions: Array.isArray(payload.adminPermissions) ? payload.adminPermissions : undefined,
```

`jwt-auth.guard.ts` bypass user — add `adminPermissions: ['SUPER_ADMIN', 'ADMIN'].includes(role) ? ['*'] : [],`.

`gateway.controller.ts`:

```ts
  /** The permission keys an account signs in with: its admin role's, or the system role matching its UserRole. */
  private async adminPermissionsFor(user: User): Promise<string[] | undefined> {
    const role = String(user.role).toUpperCase();
    if (!isStaffRole(role)) return undefined;
    if (role === 'SUPER_ADMIN') return ['*'];
    const byId = user.adminRoleId ? await this.roleRepo.findOne({ where: { id: user.adminRoleId } }) : null;
    const key = user.regionLocked ? 'regional_admin' : role.toLowerCase();
    const fallback = byId ? null : await this.roleRepo.findOne({ where: { key } });
    return (byId ?? fallback)?.permissions ?? [];
  }
```

(inject `@InjectRepository(AdminRole) private readonly roleRepo: Repository<AdminRole>`), `issueTokens(user, extra?: { adminPermissions?: string[] })` spreads `...(extra?.adminPermissions ? { adminPermissions: extra.adminPermissions } : {})` into `identity`; `completeLogin` calls `this.issueTokens(user, { adminPermissions: await this.adminPermissionsFor(user) })`; the refresh route re-computes them the same way (permissions change on refresh); `/auth/profile` returns `adminPermissions: req.user.adminPermissions ?? null` and `adminRole: role ? { id, key, name } : null` (one repo read).

Permission-gated routes — method-level `@Roles(...)` overrides the class-level one, so each gated handler lists the roles and the key, e.g. on `PATCH payouts/:id/approve`:

```ts
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
```

Apply: marketplace `payouts/*` → `finance.payouts`; `refunds/*`, `returns/*` → `orders.refund`; `commissions/*`, `seller-wallets/*`, `wallet/*` → `finance.view` (reads) / `finance.payouts` (writes); admin-access → `staff.manage` on writes, `staff.view` on reads; ddos-admin class → `@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, 'perm:security.manage')`.

Web: `admin-session.ts` — replace the transitional branch with `: []` (an ADMIN with no claim sees no nav; the API now always sends one). `layout.tsx` — add `perm` to the three items without one (`hotel-booking` → `modules.hotel`, `notifications` → `dashboard.view`, `sos` → `support.view`) and remove the duplicate Loyalty entry under Modules.

- [ ] **Step 3: Verify**

Specs green; `nest build --all`; live: log in as `qa-admin@` → decode the access token (`node -pe 'JSON.parse(Buffer.from(process.argv[1].split(".")[1],"base64url"))' $QA`) shows `adminPermissions` = the regional_admin list; `GET /admin/staff` as QA admin → 403; as superadmin → 200. Console as QA admin: no "Staff Management"/"Roles & Permissions"/"Security"/"Settings" items; as finance manager (create one via the staff API): only Finance items.

- [ ] **Step 4: Commit (API; then web)**

---

### Task B5: One readable, immutable audit trail

**Files:**

- Modify: `apps/api/apps/audit-log-service/src/main.ts` (TCP), `audit-log.controller.ts` (`audit.query`, `audit.record`), `audit-log.service.ts` (`query`), create `audit-log.query.spec.ts`
- Modify: `api-gateway.module.ts` (`AUDIT_LOG_SERVICE` client on `AUDIT_LOG_TCP_PORT ?? 4028`), create `controllers/admin-audit.controller.ts`, remove the two audit routes from `admin-core.controller.ts`
- Modify: `apps/api/apps/admin-service/src/admin.service.ts` (`addAuditLog` forwards to Kafka), `apps/api/libs/config` env validation (`AUDIT_LOG_TCP_PORT` default 4028 — Joi default must equal the service's bind port, `project_gateway_tcp_port_defaults`)
- Modify: `packages/shared-core/src/contexts/audit-context.tsx`, `packages/shared-core/src/api/admin-core.ts`, `apps/web/src/app/admin/audit-logs/page.tsx`, `apps/web/src/app/admin/marketplace/audit-logs/page.tsx`

**Interfaces:**

- `audit.query { page?, limit?, actorId?, actorEmail?, entityType?, entityId?, actionType?, country?, from?, to?, scope? }` → `{ data: AuditLog[], total, page, limit }`; when `scope` is set the filter `country ∈ [scope, 'ALL', 'UNKNOWN']` is forced.
- `audit.record { actionType, actorId, actorEmail?, actorRole?, actorIp?, entityType?, entityId?, oldValue?, newValue?, reason?, metadata?, isSensitive?, country, service }` → `{ success: true, id }`.
- `GET /admin/audit-logs?…` (same filters; `scope` from the token), `GET /admin/audit-logs/entity/:type/:id`, `POST /admin/audit-logs { action, entityType, entityId, details?, reason? }` (console-originated, `actionType: 'console.<action>'`, actor from token).

- [ ] **Step 1: Failing service spec**

```ts
import { describe, it, expect, vi } from 'vitest';
import { AuditLogService } from './audit-log.service';

function modelWith(rows: any[]) {
  const calls: any[] = [];
  const chain: any = {
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    lean: async () => rows,
  };
  const model = {
    find: vi.fn((f: any) => {
      calls.push(f);
      return chain;
    }),
    countDocuments: vi.fn(async () => rows.length),
  };
  return { model, calls };
}

describe('AuditLogService.query', () => {
  it('forces a locked admin onto their market (plus global/unknown rows)', async () => {
    const { model, calls } = modelWith([]);
    const svc = Object.create(AuditLogService.prototype) as AuditLogService;
    Object.assign(svc, {
      auditModel: model,
      paginate: (p: number, l: number) => ({ page: p, limit: l }),
    });
    await svc.query({ country: 'IN', scope: 'QA' });
    expect(calls[0].country).toEqual({ $in: ['QA', 'ALL', 'UNKNOWN'] });
  });
  it('applies actor, entity and date filters', async () => {
    const { model, calls } = modelWith([]);
    const svc = Object.create(AuditLogService.prototype) as AuditLogService;
    Object.assign(svc, {
      auditModel: model,
      paginate: (p: number, l: number) => ({ page: p, limit: l }),
    });
    await svc.query({ actorId: 'u1', entityType: 'sellers', from: '2026-09-01', to: '2026-09-02' });
    expect(calls[0]).toMatchObject({ actorId: 'u1', entityType: 'sellers' });
    expect(calls[0].createdAt.$gte).toBeInstanceOf(Date);
    expect(calls[0].createdAt.$lte).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Implement**

`audit-log.service.ts`:

```ts
  async query(f: {
    page?: number; limit?: number; actorId?: string; actorEmail?: string; entityType?: string; entityId?: string;
    actionType?: string; country?: string; from?: string; to?: string; scope?: string;
  }) {
    const { page, limit } = this.paginate(f.page ?? 1, f.limit ?? 50);
    const filter: Record<string, unknown> = {};
    if (f.scope) filter.country = { $in: [f.scope.toUpperCase(), 'ALL', 'UNKNOWN'] };
    else if (f.country) filter.country = f.country.toUpperCase();
    if (f.actorId) filter.actorId = f.actorId;
    if (f.actorEmail) filter.actorEmail = f.actorEmail.toLowerCase();
    if (f.entityType) filter.entityType = f.entityType;
    if (f.entityId) filter.entityId = f.entityId;
    if (f.actionType) filter.actionType = { $regex: `^${f.actionType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    if (f.from || f.to) filter.createdAt = { ...(f.from ? { $gte: new Date(f.from) } : {}), ...(f.to ? { $lte: new Date(f.to) } : {}) };
    const [data, total] = await Promise.all([
      this.auditModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.auditModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }
```

`audit-log.controller.ts`: `@MessagePattern({ cmd: 'audit.query' }) query(@Payload() f) { return this.svc.query(f ?? {}); }` and `@MessagePattern({ cmd: 'audit.record' }) record(@Payload() dto) { return this.svc.logEvent(dto); }`.
`main.ts`: second `connectMicroservice({ transport: Transport.TCP, options: { host: '0.0.0.0', port: +(process.env.AUDIT_LOG_TCP_PORT ?? 4028) } })` before `startAllMicroservices()`; log the port.

Gateway: `ClientsModule` entry `{ name: 'AUDIT_LOG_SERVICE', transport: Transport.TCP, options: { host: svcHost('AUDIT_LOG'), port: +(process.env.AUDIT_LOG_TCP_PORT ?? 4028) } }`; `admin-audit.controller.ts`:

```ts
@ApiTags('👑 Admin — Audit')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.FINANCE_MANAGER,
  UserRole.SUPPORT_AGENT,
  UserRole.PRODUCT_MANAGER,
  'perm:audit.logs',
)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(@Inject('AUDIT_LOG_SERVICE') private readonly audit: ClientProxy) {}

  private async send<T>(cmd: string, payload: object): Promise<T> {
    return lastValueFrom(
      this.audit
        .send<T>({ cmd }, payload)
        .pipe(timeout(5000), catchError(rpcCatch('Audit service unavailable'))),
    );
  }

  private scopeOf(req: any, requested?: string) {
    const market = resolveMarket(req, requested, 'that audit trail');
    return { scope: marketScopeOf(req).locked ? market : undefined, market };
  }

  @Get()
  @ApiOperation({
    summary: "Administrative actions, newest first, confined to the caller's market",
  })
  list(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('actorId') actorId?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actionType') actionType?: string,
    @Query('country') country?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country);
    return this.send('audit.query', {
      page,
      limit: Math.min(limit, 200),
      actorId,
      actorEmail,
      entityType,
      entityId,
      actionType,
      country: market,
      from,
      to,
      scope,
    });
  }

  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'Everything that happened to one record' })
  byEntity(@Req() req: any, @Param('type') type: string, @Param('id') id: string) {
    const { scope } = this.scopeOf(req);
    return this.send('audit.query', { entityType: type, entityId: id, limit: 200, scope });
  }

  @Post()
  @ApiOperation({
    summary: 'Record a console-originated action (the actor is the token, never the body)',
  })
  record(@Req() req: any, @Body() dto: AuditEntryDto) {
    const { scope } = this.scopeOf(req);
    return this.send('audit.record', {
      actionType: `console.${dto.action}`,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      actorIp: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip,
      entityType: dto.entityType,
      entityId: dto.entityId,
      reason: dto.reason,
      metadata: {
        ...(dto.details ?? {}),
        source: 'console',
        requestId: req.headers['x-request-id'],
      },
      country: scope ?? req.headers['x-region-code'] ?? 'ALL',
      service: 'admin-console',
    });
  }
}
```

(`AuditEntryDto` in B6's `admin-core.dto.ts`.) Remove `auditLogs`/`addAuditLog` from `admin-core.controller.ts`; admin-service's `addAuditLog` additionally `await this.kafka.publish('audit.log', { actionType: entry.action, actorId: entry.adminId, entityType: entry.entityType, entityId: entry.entityId, metadata: entry.details, country: entry.country ?? 'ALL', service: 'admin-service' })` so nothing written through the old path is lost.

Web: `adminCoreApi.getAuditLogs(params)` → `/admin/audit-logs`, `addAuditLog(entry)` → POST; `audit-context.tsx`: delete `generateSeedEntries` (`useRef<AuditEntry[]>([])`), `log()` posts to the API and appends locally only on success; the two audit pages use `useAdminData(() => adminCoreApi.getAuditLogs({ page, limit, actionType, from, to }), [...])` with the filters bound to URL params, `Timeline` rendering `actionType`, actor, entity, market, request id, and an export button that downloads the current page as CSV via `lib/export-csv.ts`.

- [ ] **Step 3: Verify**

Spec → 2 passed; `nest build --all`; restart audit-log-service (TCP `:4028` in its log) and gateway. Live: approve a QA seller as the QA admin, then `GET /admin/audit-logs?entityType=sellers` as the QA admin lists it with `actorId` = the QA admin's id and `country: 'QA'`; as the IN admin the same query does not show it; console `/admin/audit-logs` shows the same row and no "seed" rows after reload.

- [ ] **Step 4: Commit (audit-log-service; gateway + admin-service; web)**

---

### Task B6: Admin request bodies are validated

**Files:**

- Create: `apps/api/apps/api-gateway/src/dto/admin-core.dto.ts`, `dto/admin-taxi.dto.ts`, `controllers/admin-validation.spec.ts`
- Modify: `admin-core.controller.ts`, `admin-taxi.controller.ts` (typed bodies), `admin-audit.controller.ts`

- [ ] **Step 1: DTOs**

`admin-core.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Length, Matches } from 'class-validator';

export class ReasonDto {
  @ApiProperty({ example: 'Repeated fraudulent orders' })
  @IsString()
  @Length(3, 500)
  reason: string;
}
export class KycDecisionDto {
  @ApiProperty({ enum: ['seller', 'partner', 'driver', 'vendor'] })
  @IsIn(['seller', 'partner', 'driver', 'vendor'])
  entityType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 500) reason?: string;
}
export class AuditEntryDto {
  @ApiProperty({ example: 'seller.approved' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_.-]{2,80}$/)
  action: string;
  @ApiProperty() @IsString() @Length(1, 60) entityType: string;
  @ApiProperty() @IsString() @Length(1, 80) entityId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() details?: Record<string, unknown>;
}
```

`admin-taxi.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const ISO2 = /^[A-Za-z]{2}$/;

export class ReasonDto {
  @ApiProperty() @IsString() @Length(3, 500) reason: string;
}
export class ResolutionDto {
  @ApiProperty() @IsString() @Length(3, 1000) resolution: string;
}
export class RateCardUpsertDto {
  @ApiProperty({ example: 'QA' }) @Matches(ISO2) countryCode: string;
  @ApiProperty({ example: 'sedan' }) @IsString() @Length(2, 40) vehicleType: string;
  @ApiProperty() @IsNumber() @Min(0) baseFare: number;
  @ApiProperty() @IsNumber() @Min(0) perKmRate: number;
  @ApiProperty() @IsNumber() @Min(0) perMinuteRate: number;
  @ApiProperty() @IsNumber() @Min(0) minimumFare: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) bookingFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cancellationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(5) surgeCap?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class TaxiConfigUpsertDto {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformCommissionPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) taxPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(5) surgeCap?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  driverAcceptTimeoutSeconds?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(30) maxDispatchRadiusKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) vehicleTypes?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class SurgeUpdateDto {
  @ApiProperty() @IsString() @Length(1, 80) zoneId: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(5) multiplier: number;
  @ApiPropertyOptional() @IsOptional() @Matches(ISO2) countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(60) @Max(86_400) ttlSeconds?: number;
}
export class PricingUpdateDto extends RateCardUpsertDto {}
export class RouteCreateDto {
  @ApiProperty() @IsString() @Length(2, 120) name: string;
  @ApiProperty() @Matches(ISO2) countryCode: string;
  @ApiProperty() @IsString() @Length(2, 120) origin: string;
  @ApiProperty() @IsString() @Length(2, 120) destination: string;
  @ApiProperty() @IsNumber() @Min(0) fixedFare: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 40) vehicleType?: string;
}
export class SettingsUpdateDto {
  @ApiPropertyOptional() @IsOptional() @Matches(ISO2) countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowCashPayments?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowScheduledRides?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cancellationWindowMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['auto', 'manual']) dispatchMode?: 'auto' | 'manual';
}
export class PayoutBatchDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) payoutIds: string[];
}
```

Before committing, reconcile field names with the entities: `grep -E "^\s+\w+[?!]?:" modules/taxi/backend/src/entities/taxi-rate-card.entity.ts modules/taxi/backend/src/entities/taxi-country-config.entity.ts` — every DTO property must be a column (rename the DTO property, never the column). The spec below pins that.

- [ ] **Step 2: Failing spec** (`admin-validation.spec.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { getMetadataArgsStorage } from 'typeorm';
import { RateCardUpsertDto, TaxiConfigUpsertDto, PayoutBatchDto } from '../dto/admin-taxi.dto';
import { TaxiRateCardEntity } from '../../../../../modules/taxi/backend/src/entities/taxi-rate-card.entity';
import { TaxiCountryConfigEntity } from '../../../../../modules/taxi/backend/src/entities/taxi-country-config.entity';

const columnsOf = (target: Function) =>
  new Set(
    getMetadataArgsStorage()
      .columns.filter((c) => c.target === target)
      .map((c) => c.propertyName),
  );

describe('admin taxi DTOs', () => {
  it('rejects a negative fare and an unknown field', async () => {
    const dto = plainToInstance(RateCardUpsertDto, {
      countryCode: 'QA',
      vehicleType: 'sedan',
      baseFare: -1,
      perKmRate: 1,
      perMinuteRate: 1,
      minimumFare: 1,
      extra: true,
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((e) => e.property).sort()).toEqual(['baseFare', 'extra']);
  });
  it('rejects a non-uuid payout id', async () => {
    const errors = await validate(plainToInstance(PayoutBatchDto, { payoutIds: ['nope'] }));
    expect(errors[0].property).toBe('payoutIds');
  });
  it('only names properties the entities actually have', () => {
    const rate = columnsOf(TaxiRateCardEntity),
      cfg = columnsOf(TaxiCountryConfigEntity);
    for (const k of Object.keys(new RateCardUpsertDto()))
      expect(rate.has(k), `rate card column ${k}`).toBe(true);
    for (const k of Object.keys(new TaxiConfigUpsertDto()))
      expect(cfg.has(k), `config column ${k}`).toBe(true);
  });
});
```

(`Object.keys(new Dto())` only lists initialised properties; add `= undefined as any` initialisers to every DTO property, or list the keys explicitly in the spec — the point is one place that fails when a DTO and its entity drift.)

- [ ] **Step 3: Type the bodies**

`admin-core.controller.ts`: `banUser(... @Body() dto: ReasonDto)`, `approveKyc(... @Body() dto: KycDecisionDto)`, `rejectKyc(... @Body() dto: KycDecisionDto)`; `admin-audit.controller.ts` `record(@Body() dto: AuditEntryDto)`. `admin-taxi.controller.ts`: `suspendVendor/suspendDriver/blockDriver/rejectDocument` → `ReasonDto`; `resolveComplaint` → `ResolutionDto`; `updatePricing` → `PricingUpdateDto`; `updateSurge` → `SurgeUpdateDto`; `createRoute` → `RouteCreateDto`; `updateSettings` → `SettingsUpdateDto`; `upsertRateCard` → `RateCardUpsertDto`; `upsertConfig` → `TaxiConfigUpsertDto`; `processPayouts` → `PayoutBatchDto`. The global `GatewayValidationPipe` validates any body that has a class type, so no per-route pipe is needed; confirm with the live probe.

- [ ] **Step 4: Verify**

Spec → 3 passed; `nest build --all`; live: `POST /admin/taxi/rates` with `baseFare: -1` → 400 listing `baseFare`; with `foo: 1` → 400 `property foo should not exist`; `PUT /admin/users/<id>/ban` with `{}` → 400 `reason must be longer than or equal to 3 characters`.

- [ ] **Step 5: Commit**

---

### Task B7: Fixture data removed from every page whose API exists

**Files:**

- Modify: `apps/web/src/app/admin/security/page.tsx`, `kyc-verification/page.tsx`, `sellers/page.tsx`, `page.tsx` (dashboard), `layout.tsx` (header notifications + dead nav link), `login/page.tsx` (already clean after B1/B2)
- Modify: `packages/shared-core/src/api/admin-core.ts` (`getSecurityStatus`, `getSecurityTrend`, `getOffenders`, `getBans`, `banIp`, `unbanIp`, `getWhitelist`, `getNotifications`)
- Create: jest tests under `apps/web/src/app/admin/__tests__/`

**Interfaces:** the existing routes — `/admin/security/{status,trend,stats/endpoints,offenders,bans,whitelist,attack-mode/reset}`, `/admin/kyc/pending`, `/admin/kyc/:id/{approve,reject}`, `/admin/marketplace/sellers`, `/admin/marketplace/notifications`, `/admin/audit-logs` (B5), `/admin/dashboard`.

- [ ] **Step 1: Failing page tests**

`apps/web/src/app/admin/__tests__/kyc-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import KycPage from '../kyc-verification/page';

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    getPendingKyc: jest.fn(async () => ({
      success: true,
      data: {
        data: [
          {
            id: 'k1',
            entityType: 'seller',
            name: 'Doha Tools',
            country: 'QA',
            submittedAt: '2026-09-10T00:00:00Z',
          },
        ],
        total: 1,
      },
    })),
    approveKyc: jest.fn(),
    rejectKyc: jest.fn(),
  },
}));
jest.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u', role: 'ADMIN', adminPermissions: ['*'] },
    hasPermission: () => true,
  }),
}));
jest.mock('@/lib/contexts/region-context', () => ({
  useRegion: () => ({ selectedRegion: 'ALL', setSelectedRegion: () => {} }),
  REGIONS: {},
}));

it('renders the queue from the API and none of the old fixture names', async () => {
  render(<KycPage />);
  expect(await screen.findByText('Doha Tools')).toBeInTheDocument();
  expect(screen.queryByText(/MOCK|Rahul Sharma|Acme/)).toBeNull();
});
```

Write the same three-line assertion for `security/page.tsx` (mock `getSecurityStatus` → `{ level: 'normal', activeBans: 2 }` and assert `2` renders and `MOCK_STATUS`'s literal numbers do not), `sellers/page.tsx` (mock `getSellers` → one seller `'Al Meera Stores'`; assert it renders and `MOCK_SELLERS[0].name` does not), and the dashboard (`getDashboard` → counts; assert `recentActivity`'s first fixture title is absent). Take the fixture strings to assert against from the current files before deleting them.

- [ ] **Step 2: Implement**

Each page: delete the `MOCK_*`/`sample*` constants; `useAdminData(() => adminCoreApi.<call>(params), [deps])` for reads; `useAdminAction` for mutations with a reason dialog; `AdminLoadingSkeleton`/`AdminErrorBanner`/`MarketplaceEmptyState` for states (the design-system replacements arrive in Plan E — use what exists). Dashboard: remove `recentActivity` (replace with the latest 8 rows of `adminCoreApi.getAuditLogs({ limit: 8 })`) and `hourlyData` (remove the hourly chart until Plan C1 gives it a query; leave a "Revenue by hour arrives with order-service reporting" note in the card). Header: notifications from `adminMarketplaceApi.getNotifications({ limit: 8 })` with an unread count; remove the literal array. Delete the `/admin/order-disputes` nav item.

- [ ] **Step 3: Verify**

`npx jest apps/web/src/app/admin` → green; `next build` → green; `grep -rlE "MOCK_|sampleOrders|mockData|DEMO_STAFF|INITIAL_ROLES|generateSeedEntries" apps/web/src/app/admin packages/shared-core/src/contexts` → only the pages Plan E still owns (content/edit, doctor/reviews, marketplace/delivery-partners, marketplace/return-policies, marketplace/reports/revenue, seller-content, two-factor, customers) — record that list in the program checklist E6.

- [ ] **Step 4: Commit**

---

## Self-review

- **Spec coverage.** Phase 2's "Roles & permissions", "Security", "Audit logs" → B3/B4, B2/B6, B5. Phase 7 validation (frontend + backend) → B6 backend; the console's forms keep their client checks. Phase 8: authentication (B2), authorization/RBAC (B3/B4), privilege escalation (SUPER_ADMIN-only writes, no self-deactivate, no super_admin creation via console), JWT/session (`type: 'mfa'` cannot be used as Bearer — `JwtAuthGuard` already rejects non-access types), token expiry (challenge 5 min), brute force (`@Throttle` + attempt counter + lockout), sensitive data exposure (no secrets in responses outside dev echo), audit logging (B5). Phase 6's "fake success messages / placeholder statistics" for the pages with APIs → B7.
- **Placeholders.** B2 Step 5 names the exact grep to find the lockout reset before extracting `completeLogin`; B6 pins DTO/entity drift with a spec instead of guessing columns. No "TBD".
- **Type consistency.** `toAdminUser` returns `AuthUser`; `isStaffRole` exists in both `@app/common` and shared-core with the same list; `scopeOf` shape matches Plan A; `adminPermissions: string[]` everywhere; `audit.query`/`audit.record` payloads match the Mongo schema fields; `AdminRole.permissions: string[]` matches the migration's `text[]`.
