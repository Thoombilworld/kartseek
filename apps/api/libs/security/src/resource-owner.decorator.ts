import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by ResourceOwnershipGuard to read ownership config.
 */
export const RESOURCE_OWNER_KEY = 'resource_owner';

/**
 * Options for the @ResourceOwner() decorator.
 *
 * @example Direct ownership (param value === req.user.userId):
 *   @ResourceOwner({ paramKey: 'userId' })
 *
 * @example Indirect ownership (look up entity, compare ownerField):
 *   @ResourceOwner({ paramKey: 'orderId', ownerField: 'customerId', entity: 'Order' })
 */
export interface ResourceOwnerOptions {
  /** The route parameter name that holds the resource identifier (e.g. 'userId', 'orderId'). */
  paramKey: string;

  /**
   * For indirect ownership: the field on the entity that holds the owner's user ID.
   * When omitted, the guard assumes `paramKey` value === `req.user.userId` (direct match).
   */
  ownerField?: string;

  /**
   * Entity name for indirect lookups.
   * The guard will use EntityManager.findOne(entity, { where: { id: paramValue } })
   * and check result[ownerField] against req.user.userId.
   */
  entity?: string;

  /**
   * Additional roles that bypass the ownership check entirely (e.g. admin roles).
   * Defaults to ['SUPER_ADMIN'].
   */
  bypassRoles?: string[];
}

/**
 * @ResourceOwner — Marks a route handler as requiring resource ownership verification.
 *
 * The ResourceOwnershipGuard reads this metadata to determine how to verify
 * that the authenticated user owns or is authorized to access the resource.
 *
 * @example
 * ```typescript
 * @Get(':userId/balance')
 * @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
 * @ResourceOwner({ paramKey: 'userId' })
 * async getBalance(@Param('userId') userId: string) { ... }
 * ```
 */
export const ResourceOwner = (options: ResourceOwnerOptions) =>
  SetMetadata(RESOURCE_OWNER_KEY, options);
