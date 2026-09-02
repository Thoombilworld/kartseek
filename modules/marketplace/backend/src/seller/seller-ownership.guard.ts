import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller } from '../entities/seller.entity';
import { IS_PUBLIC_KEY } from './public.decorator';

/** Roles allowed to act on any seller, not just their own. */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/**
 * SellerOwnershipGuard — object-level authorisation for `/sellers/:id/*` routes.
 *
 * Every seller route takes the seller id from the URL path. Authentication alone is
 * not enough: without this guard any authenticated user could pass someone else's
 * seller id and read their revenue and KYC, change their store settings, accept or
 * reject their orders, or request a payout against their account.
 *
 * Runs AFTER JwtAuthGuard, so `request.user` is populated.
 *
 * Decision order:
 *   1. no authenticated user            → 401
 *   2. admin role                       → allow (support/moderation paths)
 *   3. no `:id` param                   → allow (collection routes carry no object)
 *   4. seller not found                 → 403 (never reveal existence to a non-owner)
 *   5. `seller.ownerId === user.id`     → allow
 *   6. anything else, incl. NULL owner  → 403
 *
 * Step 6 is deliberately fail-closed: a seller row with no `owner_id` is treated as
 * owned by nobody. Legacy rows must be backfilled (see migration SellerOwnership).
 */
@Injectable()
export class SellerOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(SellerOwnershipGuard.name);

  constructor(
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    // @Public() routes skip JwtAuthGuard, so there is no user to authorise against.
    // Such routes must not expose seller-scoped data — see the decorator's note.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('You must be logged in to access seller resources.');
    }

    const role = String(user.role ?? '').toUpperCase();
    if (ADMIN_ROLES.has(role)) return true;

    const sellerId = request.params?.id;
    if (!sellerId) return true;

    const userId = user.id ?? user.userId ?? user.sub;

    const seller = await this.sellerRepo.findOne({
      where: { id: sellerId },
      select: ['id', 'ownerId'],
    });

    // Deny rather than 404 — a non-owner should not be able to probe which seller
    // ids exist.
    if (!seller) {
      throw new ForbiddenException('You do not have access to this seller account.');
    }

    if (seller.ownerId && userId && seller.ownerId === userId) return true;

    this.logger.warn(
      `Blocked seller access: user=${userId} role=${role} attempted seller=${sellerId}` +
        (seller.ownerId ? '' : ' (seller has no owner_id — needs backfill)'),
    );
    throw new ForbiddenException('You do not have access to this seller account.');
  }
}
