import { Test, type TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SellerOwnershipGuard } from './seller-ownership.guard';
import { Seller } from '../entities/seller.entity';

/**
 * These tests pin the authorisation rules for /sellers/:id/*.
 *
 * Before this guard existed the seller routes had no authorisation at all: the
 * seller id came from the URL and nothing checked the caller against it.
 */
describe('SellerOwnershipGuard', () => {
  let guard: SellerOwnershipGuard;
  let sellerRepo: { findOne: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  const OWNER = 'user-1111';
  const OTHER = 'user-9999';
  const SELLER_ID = 'seller-abcd';

  /** Builds an HTTP ExecutionContext with the given user and route params. */
  const ctx = (user: any, params: Record<string, string> = { id: SELLER_ID }): ExecutionContext =>
    ({
      getType: () => 'http',
      getHandler: () => (): undefined => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    sellerRepo = { findOne: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerOwnershipGuard,
        { provide: getRepositoryToken(Seller), useValue: sellerRepo },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get(SellerOwnershipGuard);
  });

  it('allows the owner through', async () => {
    sellerRepo.findOne.mockResolvedValue({ id: SELLER_ID, ownerId: OWNER });
    await expect(guard.canActivate(ctx({ id: OWNER, role: 'SELLER' }))).resolves.toBe(true);
  });

  it('blocks a different seller from reading someone else\'s account', async () => {
    sellerRepo.findOne.mockResolvedValue({ id: SELLER_ID, ownerId: OWNER });
    await expect(guard.canActivate(ctx({ id: OTHER, role: 'SELLER' }))).rejects.toThrow(ForbiddenException);
  });

  it('blocks an authenticated customer', async () => {
    sellerRepo.findOne.mockResolvedValue({ id: SELLER_ID, ownerId: OWNER });
    await expect(guard.canActivate(ctx({ id: OTHER, role: 'CUSTOMER' }))).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unauthenticated caller', async () => {
    await expect(guard.canActivate(ctx(undefined))).rejects.toThrow(UnauthorizedException);
    expect(sellerRepo.findOne).not.toHaveBeenCalled();
  });

  it('fails closed when the seller row has no owner (legacy, un-backfilled)', async () => {
    sellerRepo.findOne.mockResolvedValue({ id: SELLER_ID, ownerId: null });
    await expect(guard.canActivate(ctx({ id: OWNER, role: 'SELLER' }))).rejects.toThrow(ForbiddenException);
  });

  it('returns 403 rather than 404 for an unknown seller, so ids cannot be probed', async () => {
    sellerRepo.findOne.mockResolvedValue(null);
    await expect(guard.canActivate(ctx({ id: OWNER, role: 'SELLER' }))).rejects.toThrow(ForbiddenException);
  });

  it.each(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN', 'super_admin'])(
    'lets %s act on any seller without a lookup',
    async (role) => {
      await expect(guard.canActivate(ctx({ id: OTHER, role }))).resolves.toBe(true);
      expect(sellerRepo.findOne).not.toHaveBeenCalled();
    },
  );

  it('accepts the alternate JWT subject claims (userId / sub)', async () => {
    sellerRepo.findOne.mockResolvedValue({ id: SELLER_ID, ownerId: OWNER });
    await expect(guard.canActivate(ctx({ userId: OWNER, role: 'SELLER' }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx({ sub: OWNER, role: 'SELLER' }))).resolves.toBe(true);
  });

  it('skips collection routes that carry no :id', async () => {
    await expect(guard.canActivate(ctx({ id: OWNER, role: 'SELLER' }, {}))).resolves.toBe(true);
    expect(sellerRepo.findOne).not.toHaveBeenCalled();
  });

  it('lets @Public() routes through without a user', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctx(undefined))).resolves.toBe(true);
  });

  it('does not apply to RPC contexts (TCP handlers are a separate controller)', async () => {
    const rpcCtx = { getType: () => 'rpc' } as unknown as ExecutionContext;
    await expect(guard.canActivate(rpcCtx)).resolves.toBe(true);
  });
});
