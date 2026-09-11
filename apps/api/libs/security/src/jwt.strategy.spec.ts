import type { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

/**
 * What `validate()` puts on `request.user` is the whole of what every guard and
 * handler downstream knows about the caller. A claim the login route signs but
 * this method drops does not exist as far as the gateway is concerned — which
 * is exactly what happened to `adminPermissions` until B4: `RolesGuard` had
 * understood `perm:` requirements for a while, and nothing ever reached it.
 */
function strategy() {
  return new JwtStrategy({ get: () => 'test-secret' } as unknown as ConfigService);
}

describe('JwtStrategy.validate', () => {
  const base = { sub: 'u-1', email: 'ops@kartseek.com', role: 'ADMIN' };

  it('rejects a payload with no subject', async () => {
    await expect(strategy().validate({ email: 'x@y.z' })).rejects.toThrow(UnauthorizedException);
  });

  it('maps the admin permission claim onto the request user', async () => {
    const user = await strategy().validate({ ...base, adminPermissions: ['finance.payouts'] });
    expect(user.adminPermissions).toEqual(['finance.payouts']);
  });

  it('carries the wildcard through untouched', async () => {
    expect(
      (await strategy().validate({ ...base, adminPermissions: ['*'] })).adminPermissions,
    ).toEqual(['*']);
  });

  it('leaves the claim undefined for a token that carries none', async () => {
    // A customer's token has no such claim, and `undefined` is what RolesGuard
    // reads as "holds no permissions" — not as "holds all of them".
    expect((await strategy().validate(base)).adminPermissions).toBeUndefined();
  });

  it('ignores a claim that is not an array', async () => {
    // Anything else reaching `granted.includes(...)` would throw inside the
    // guard, and a guard that throws a TypeError answers 500, not 403.
    expect(
      (await strategy().validate({ ...base, adminPermissions: '*' })).adminPermissions,
    ).toBeUndefined();
    expect(
      (await strategy().validate({ ...base, adminPermissions: { all: true } })).adminPermissions,
    ).toBeUndefined();
  });

  it('still returns the identity and session fields every handler reads', async () => {
    const user = await strategy().validate({
      ...base,
      sellerType: 'marketplace',
      regionCode: 'QA',
      regionLocked: true,
      type: 'access',
      jti: 'j-1',
      exp: 123,
    });
    expect(user).toMatchObject({
      userId: 'u-1',
      id: 'u-1',
      sub: 'u-1',
      role: 'ADMIN',
      sellerType: 'marketplace',
      regionCode: 'QA',
      regionLocked: true,
      type: 'access',
      jti: 'j-1',
      exp: 123,
    });
  });
});
