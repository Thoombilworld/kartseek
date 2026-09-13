import { IsIn, IsInt, IsOptional, IsString, Max, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * The admin order statuses, in the order the fulfilment path moves through
 * them. Declared here rather than imported from `order.service.ts` so the DTO
 * layer does not pull the service (and its repository, Redis and Kafka
 * dependencies) into a validation-only import.
 */
export const ADMIN_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUND_REQUESTED',
  'REFUNDED',
] as const;
export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

/**
 * The admin list payload. `scope` is written by the gateway from the token and
 * is the only market a locked caller can be given; `region` is what a global
 * admin asked to filter on. Never read a market from anywhere else.
 *
 * Both slots exist because collapsing them into one field is how a LOCK comes
 * to arrive in the `requested` slot, where `marketPredicate` is deliberately
 * permissive — and "permissive" there means no predicate at all, which is every
 * market's orders under one market's heading.
 */
export class AdminListOrdersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  // Constrained to the enum rather than any 40-character string: an unknown
  // status silently matched nothing and read on screen as "this market has no
  // orders in that state", which is the same lie this task exists to remove.
  @IsOptional()
  @IsString()
  @IsIn(ADMIN_ORDER_STATUSES as unknown as string[])
  status?: AdminOrderStatus;
  @IsOptional() @IsString() @Length(1, 120) search?: string;
  @IsOptional() @IsString() @Length(2, 8) region?: string;
  @IsOptional() @IsString() @Length(2, 8) scope?: string;
}

export class AdminGetOrderDto {
  @IsString() @Length(1, 64) orderNumber!: string;
  @IsOptional() @IsString() @Length(2, 8) scope?: string;
}
