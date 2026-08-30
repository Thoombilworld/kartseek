import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isSellerType, type SellerType } from '@app/common';

export const SELLER_MODULE_KEY = 'sellerModule';

/**
 * Declare which seller portal(s) a route belongs to.
 *
 *   @SellerModule('marketplace')
 *   @Controller('seller')
 */
export const SellerModule = (...modules: SellerType[]) =>
  SetMetadata(SELLER_MODULE_KEY, modules);

/** Roles allowed across every module (support, moderation, back-office). */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/**
 * SellerModuleGuard — keeps a seller inside the module they registered for.
 *
 * `SellerOwnershipGuard` answers "do you own THIS seller id?", which only helps on
 * routes that name one. The marketplace seller's own-account routes — /seller/
 * dashboard, orders, products, payouts, settings — take the seller from the token
 * instead, so that guard waves them through and the only remaining check was
 * `@Roles(SELLER)`. Every seller of every module holds that role, so a grocery
 * seller could read the marketplace seller API: verified 200 on all five.
 *
 * The web guard and the edge middleware already scope navigation by `sellerType`.
 * This is the same rule applied where it actually matters — anyone can call the
 * API directly, without going near a page.
 *
 * Fail-closed: a seller with no `sellerType` claim is refused rather than treated
 * as belonging everywhere, which is the mistake the client guard originally made.
 */
@Injectable()
export class SellerModuleGuard implements CanActivate {
  private readonly logger = new Logger(SellerModuleGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SellerType[]>(SELLER_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Route is not module-scoped — nothing to enforce.
    if (!required?.length) return true;

    // Same contract as SellerOwnershipGuard: RPC callers are authorised by the
    // gateway before forwarding, so this only applies to inbound HTTP.
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to access seller resources.');
    }

    if (ADMIN_ROLES.has(String(user.role ?? '').toUpperCase())) return true;

    const sellerType = user.sellerType;
    if (!isSellerType(sellerType)) {
      this.logger.warn(
        `Blocked seller-module access: user=${user.id ?? user.sub} has no sellerType ` +
        `(route requires ${required.join(' | ')})`,
      );
      throw new ForbiddenException('This account is not assigned to a seller portal.');
    }

    if (!required.includes(sellerType)) {
      this.logger.warn(
        `Blocked cross-module access: user=${user.id ?? user.sub} sellerType=${sellerType} ` +
        `attempted a ${required.join(' | ')} route`,
      );
      throw new ForbiddenException('Your seller account does not have access to this module.');
    }

    return true;
  }
}
