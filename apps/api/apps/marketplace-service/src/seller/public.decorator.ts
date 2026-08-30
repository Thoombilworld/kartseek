import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key read by JwtAuthGuard to skip authentication.
 * Must match IS_PUBLIC_KEY in libs/security/src/jwt-auth.guard.ts.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — exempts a route from JwtAuthGuard.
 *
 * Use sparingly, and never on a route that takes a `:id` it does not
 * independently authorise: SellerOwnershipGuard relies on `request.user`,
 * so an unauthenticated route is also an unauthorised one.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
