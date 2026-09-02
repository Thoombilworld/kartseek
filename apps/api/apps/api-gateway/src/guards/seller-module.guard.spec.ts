import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { SellerModuleGuard } from './seller-module.guard';

function contextFor(user: any, type: 'http' | 'rpc' = 'http') {
  return {
    getType: () => type,
    getHandler: () => (): undefined => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

const guardRequiring = (modules: string[] | undefined) =>
  new SellerModuleGuard({ getAllAndOverride: () => modules } as unknown as Reflector);

describe('SellerModuleGuard', () => {
  it('admits a seller whose module matches the route', () => {
    expect(guardRequiring(['marketplace'])
      .canActivate(contextFor({ id: 'u1', role: 'seller', sellerType: 'marketplace' }))).toBe(true);
  });

  it('refuses a seller from another module', () => {
    // The defect this guard exists for: /seller/* takes the seller from the token,
    // so SellerOwnershipGuard is a no-op there and @Roles(SELLER) admitted every
    // seller of every module.
    expect(() => guardRequiring(['marketplace'])
      .canActivate(contextFor({ id: 'u2', role: 'seller', sellerType: 'grocery' })))
      .toThrow(ForbiddenException);
  });

  it('refuses a seller carrying no module — fail closed', () => {
    expect(() => guardRequiring(['marketplace'])
      .canActivate(contextFor({ id: 'u3', role: 'seller' })))
      .toThrow(ForbiddenException);
  });

  it('refuses an unrecognised sellerType rather than trusting it', () => {
    expect(() => guardRequiring(['marketplace'])
      .canActivate(contextFor({ id: 'u4', role: 'seller', sellerType: 'casino' })))
      .toThrow(ForbiddenException);
  });

  it('admits an admin across modules', () => {
    expect(guardRequiring(['marketplace'])
      .canActivate(contextFor({ id: 'a1', role: 'SUPER_ADMIN' }))).toBe(true);
  });

  it('rejects an unauthenticated request', () => {
    expect(() => guardRequiring(['marketplace']).canActivate(contextFor(undefined)))
      .toThrow(UnauthorizedException);
  });

  it('ignores routes that declare no module', () => {
    expect(guardRequiring(undefined)
      .canActivate(contextFor({ id: 'u5', role: 'seller', sellerType: 'grocery' }))).toBe(true);
  });

  it('leaves RPC alone — the gateway authorises before forwarding', () => {
    expect(guardRequiring(['marketplace'])
      .canActivate(contextFor({ id: 'u6', role: 'seller', sellerType: 'grocery' }, 'rpc'))).toBe(true);
  });

  it('accepts a route that allows several modules', () => {
    expect(guardRequiring(['grocery', 'marketplace'])
      .canActivate(contextFor({ id: 'u7', role: 'seller', sellerType: 'grocery' }))).toBe(true);
  });
});
