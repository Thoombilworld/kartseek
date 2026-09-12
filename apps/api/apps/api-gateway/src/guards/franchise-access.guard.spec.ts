import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { FranchiseAccessGuard } from './franchise-access.guard';

/**
 * `id` is `string | null`, not `string | undefined`: a default parameter is
 * applied for `undefined` as well as for an omitted argument, so the brief's
 * `ctx(ownerUser, undefined)` still produced `params: { id: 'fr-in' }` and the
 * "no :id" case could not be expressed at all. `null` is the only value that
 * reaches the ternary below as an absence.
 */
const ctx = (user: any, id: string | null = 'fr-in') =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: id ? { id } : {},
        method: 'GET',
        originalUrl: `/api/v1/franchise/${id}/dashboard`,
        headers: {},
      }),
    }),
  }) as any;

const customer = { id: 'u-c', role: 'CUSTOMER' };
const ownerUser = { id: 'owner-1', role: 'FRANCHISE_OWNER' };
const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };

function build(row = { ownerId: 'owner-1', countryCode: 'IN' }) {
  const client = { send: vi.fn(() => of({ id: 'fr-in', ...row })) };
  const redis = { get: vi.fn(async () => null), set: vi.fn(async () => undefined) };
  return { guard: new FranchiseAccessGuard(client as any, redis as any), client, redis };
}

describe('FranchiseAccessGuard', () => {
  it('X-47 refuses a plain customer asking for any franchise by id', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(customer))).rejects.toThrow(ForbiddenException);
  });

  it('admits the franchise owner', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(ownerUser))).resolves.toBe(true);
  });

  it('refuses an owner asking for a franchise they do not own', async () => {
    const { guard } = build({ ownerId: 'someone-else', countryCode: 'IN' });
    await expect(guard.canActivate(ctx(ownerUser))).rejects.toThrow(
      'You do not have access to this franchise.',
    );
  });

  it('X-46 refuses a QA-locked admin on an IN franchise', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'Your account is restricted to the QA market; this franchise belongs to IN.',
    );
  });

  it('admits a QA-locked admin on a QA franchise — the control', async () => {
    const { guard } = build({ ownerId: 'owner-1', countryCode: 'QA' });
    await expect(guard.canActivate(ctx(qaAdmin))).resolves.toBe(true);
  });

  it('admits a global admin anywhere', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(superAdmin))).resolves.toBe(true);
  });

  it('lets a route with no :id through — GET /franchise/me resolves from the token', async () => {
    const { guard, client } = build();
    await expect(guard.canActivate(ctx(ownerUser, null))).resolves.toBe(true);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('fails closed when the lookup throws', async () => {
    const { guard, client } = build();
    client.send = vi.fn(() => {
      throw new Error('franchise-service down');
    });
    await expect(guard.canActivate(ctx(ownerUser))).rejects.toThrow(ForbiddenException);
  });
});
