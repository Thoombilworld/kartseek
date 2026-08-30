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
  beforeEach(() => { process.env = { ...env, NODE_ENV: 'development', DEV_AUTH_BYPASS: 'true' }; });
  afterAll(() => { process.env = env; });

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
