import { JwtAuthGuard } from './jwt-auth.guard';

function contextFor(headers: Record<string, string> = {}) {
  const request: any = { headers, method: 'GET', path: '/api/v1/admin/layouts/taxi/homepage' };
  return {
    ctx: {
      getHandler: () => (): undefined => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as any,
    request,
  };
}

/** Reflector stub: the route is not @Public(). */
const notPublic = { getAllAndOverride: () => false } as any;

describe('JwtAuthGuard dev bypass', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env, NODE_ENV: 'development', DEV_AUTH_BYPASS: 'true' };
  });
  afterAll(() => {
    process.env = env;
  });

  it('injects a CUSTOMER by default, leaving admin routes closed', async () => {
    delete process.env.DEV_AUTH_BYPASS_ROLE;
    const { ctx, request } = contextFor();
    await expect(new JwtAuthGuard(notPublic).canActivate(ctx)).resolves.toBe(true);
    expect(request.user.role).toBe('CUSTOMER');
  });

  it('injects the role named by DEV_AUTH_BYPASS_ROLE when a developer opts in', async () => {
    process.env.DEV_AUTH_BYPASS_ROLE = 'SUPER_ADMIN';
    const { ctx, request } = contextFor();
    await expect(new JwtAuthGuard(notPublic).canActivate(ctx)).resolves.toBe(true);
    expect(request.user.role).toBe('SUPER_ADMIN');
  });

  it('injects the same identity fields a real token produces', async () => {
    // `JwtStrategy.validate()` returns `userId`, `id` and `sub` — all three,
    // because handlers across the gateway read different ones. The bypass used
    // to set only `id`, so every user-scoped route behaved as though nobody was
    // signed in and reported a missing customer id rather than acting as the
    // dev user.
    const { ctx, request } = contextFor();
    await expect(new JwtAuthGuard(notPublic).canActivate(ctx)).resolves.toBe(true);
    expect(request.user.userId).toBeTruthy();
    expect(request.user.sub).toBe(request.user.userId);
    expect(request.user.id).toBe(request.user.userId);
  });

  it('gives an admin bypass user the wildcard, and everyone else none', async () => {
    // The bypass stands in for a signed-in account, and since B4 a staff
    // account's token carries `adminPermissions`. Without one here, every
    // `perm:`-gated route answers 403 under DEV_AUTH_BYPASS_ROLE=SUPER_ADMIN —
    // the bypass would look active while the route it exists to open stayed
    // shut, which is the same trap the role default fell into.
    process.env.DEV_AUTH_BYPASS_ROLE = 'SUPER_ADMIN';
    const admin = contextFor();
    await new JwtAuthGuard(notPublic).canActivate(admin.ctx);
    expect(admin.request.user.adminPermissions).toEqual(['*']);

    process.env.DEV_AUTH_BYPASS_ROLE = 'CUSTOMER';
    const customer = contextFor();
    await new JwtAuthGuard(notPublic).canActivate(customer.ctx);
    expect(customer.request.user.adminPermissions).toEqual([]);
  });

  it('normalises the configured role to upper case', async () => {
    process.env.DEV_AUTH_BYPASS_ROLE = 'admin';
    const { ctx, request } = contextFor();
    await new JwtAuthGuard(notPublic).canActivate(ctx);
    expect(request.user.role).toBe('ADMIN');
  });

  it('never bypasses in production, however the role is configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEV_AUTH_BYPASS_ROLE = 'SUPER_ADMIN';
    const { ctx, request } = contextFor();
    // Falls through to passport, which has no strategy registered under test —
    // what matters is that no user was fabricated.
    await new JwtAuthGuard(notPublic).canActivate(ctx).catch((): undefined => undefined);
    expect(request.user).toBeUndefined();
  });

  it('does not bypass when the caller sent an Authorization header', async () => {
    process.env.DEV_AUTH_BYPASS_ROLE = 'SUPER_ADMIN';
    const { ctx, request } = contextFor({ authorization: 'Bearer some.jwt.token' });
    await new JwtAuthGuard(notPublic).canActivate(ctx).catch((): undefined => undefined);
    expect(request.user).toBeUndefined();
  });

  it('stays off unless DEV_AUTH_BYPASS is explicitly true', async () => {
    process.env.DEV_AUTH_BYPASS = 'false';
    const { ctx, request } = contextFor();
    await new JwtAuthGuard(notPublic).canActivate(ctx).catch((): undefined => undefined);
    expect(request.user).toBeUndefined();
  });
});

describe('JwtAuthGuard token type', () => {
  /**
   * Reaching the type check means getting past passport, which has no strategy
   * registered under test. `super.canActivate` is swapped for a stand-in that
   * populates `request.user` exactly as `JwtStrategy.validate()` would, so what
   * is under test is the guard's own decision about the `type` claim.
   */
  const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
  const realCanActivate = parentProto.canActivate;
  const env = process.env;

  const authenticateAs = (user: Record<string, unknown>) => {
    parentProto.canActivate = function (ctx: any) {
      ctx.switchToHttp().getRequest().user = user;
      return true;
    };
  };

  beforeEach(() => {
    // The bypass would answer before the type check ever ran.
    process.env = { ...env, NODE_ENV: 'test', DEV_AUTH_BYPASS: 'false' };
  });
  afterEach(() => {
    parentProto.canActivate = realCanActivate;
    process.env = env;
  });

  it('refuses an MFA challenge token used as a Bearer credential', async () => {
    // The challenge token is handed to a browser that has not yet proved the
    // second factor. If it opened protected routes, the factor would be
    // optional in practice — sign in, ignore the code, use the token.
    authenticateAs({ sub: 'u1', userId: 'u1', role: 'SUPER_ADMIN', type: 'mfa' });
    const { ctx } = contextFor({ authorization: 'Bearer mfa.challenge.token' });
    await expect(new JwtAuthGuard(notPublic).canActivate(ctx)).rejects.toThrow(
      'This token cannot be used to access resources.',
    );
  });

  it('refuses a refresh token used as a Bearer credential', async () => {
    authenticateAs({ sub: 'u1', userId: 'u1', role: 'CUSTOMER', type: 'refresh' });
    const { ctx } = contextFor({ authorization: 'Bearer refresh.token' });
    await expect(new JwtAuthGuard(notPublic).canActivate(ctx)).rejects.toThrow(
      'This token cannot be used to access resources.',
    );
  });

  it('admits an access token', async () => {
    authenticateAs({ sub: 'u1', userId: 'u1', role: 'CUSTOMER', type: 'access' });
    const { ctx } = contextFor({ authorization: 'Bearer access.token' });
    await expect(new JwtAuthGuard(notPublic).canActivate(ctx)).resolves.toBe(true);
  });

  it('still admits a token minted before the type claim existed', async () => {
    // Sessions live at rollout carry no `type`; they age out with their own
    // expiry rather than being cut off mid-flight.
    authenticateAs({ sub: 'u1', userId: 'u1', role: 'CUSTOMER' });
    const { ctx } = contextFor({ authorization: 'Bearer legacy.token' });
    await expect(new JwtAuthGuard(notPublic).canActivate(ctx)).resolves.toBe(true);
  });
});
