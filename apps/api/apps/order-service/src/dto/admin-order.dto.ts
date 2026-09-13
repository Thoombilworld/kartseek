import { IsIn, IsInt, IsOptional, IsString, Max, Min, Length } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ADMIN_ORDER_STATUSES, type AdminOrderStatus, normaliseStatusFilter } from '@app/common';

/**
 * The order statuses, re-exported from `@app/common` where the gateway DTO
 * reads the same list. Two copies is how a status comes to be accepted at the
 * edge and refused one hop later; this file kept the name it had.
 */
export { ADMIN_ORDER_STATUSES, type AdminOrderStatus };

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
  /**
   * Constrained to the enum rather than any 40-character string: an unknown
   * status silently matched nothing and read on screen as "this market has no
   * orders in that state", which is the same lie this task exists to remove.
   *
   * Case-folded first. The gateway normalises the query before forwarding, but
   * this service is also reachable over TCP without passing through it, and an
   * enum that refuses `delivered` while the platform's own console sends
   * exactly that is a gate nobody can get through.
   */
  @IsOptional()
  @Transform(({ value }) => normaliseStatusFilter(value))
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
