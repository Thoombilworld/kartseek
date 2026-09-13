import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ADMIN_ORDER_STATUSES,
  ADMIN_PAYMENT_STATUSES,
  ADMIN_REFUND_STATUSES,
  ADMIN_RETURN_STATUSES,
  normaliseStatusFilter,
} from '@app/common';

/**
 * The query DTOs for the five admin money reads.
 *
 * Until M1 these routes answered a literal, so `?status=` never reached a
 * database and nobody found out that three surfaces spell the same state three
 * different ways: the orders console sends `delivered`, the returns console
 * sends `Picked Up`, and the tables behind them hold `DELIVERED` and
 * `PICKED_UP`. The moment the routes became real reads, an unvalidated status
 * was one of two failures — a silent no-match, which reads on screen as "this
 * market has none of those" and is the exact lie M1 exists to remove, or (on
 * returns, whose column is a Postgres `enum`) a cast error surfacing as a 500.
 *
 * So the fold happens HERE, at the edge, before anything is forwarded: what the
 * human clicked becomes the value the wire carries, and a word that is not a
 * state this platform has is a 400 that names the set. The service DTO behind
 * it validates the same list from the same constant, so nothing is accepted at
 * the edge and refused a hop later.
 *
 * `country` is a REQUESTED market. It is bounded here and resolved by
 * `scopeOf` in the handler — a locked admin naming another market is refused
 * there, before any RPC, and never widened into a query.
 */
class AdminMarketQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Capped rather than clamped. `ParseLimitPipe` used to fold an oversized
   * value down to the maximum silently, which means an export script asking for
   * 5000 rows gets 100 and no indication that it did not get the rest.
   */
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  country?: string;
}

export class AdminOrdersQueryDto extends AdminMarketQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_ORDER_STATUSES })
  @IsOptional()
  @Transform(({ value }) => normaliseStatusFilter(value))
  @IsString()
  @IsIn(ADMIN_ORDER_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ description: 'Order number or customer id' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;
}

export class AdminReturnsQueryDto extends AdminMarketQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_RETURN_STATUSES })
  @IsOptional()
  @Transform(({ value }) => normaliseStatusFilter(value))
  @IsString()
  @IsIn(ADMIN_RETURN_STATUSES as unknown as string[])
  status?: string;
}

export class AdminRefundsQueryDto extends AdminMarketQueryDto {
  /**
   * Absent, the route answers the decision queue — PENDING and UNDER_REVIEW.
   * Named, it answers that one state, so the queue can also be read as a
   * history without a second route.
   */
  @ApiPropertyOptional({ enum: ADMIN_REFUND_STATUSES })
  @IsOptional()
  @Transform(({ value }) => normaliseStatusFilter(value))
  @IsString()
  @IsIn(ADMIN_REFUND_STATUSES as unknown as string[])
  status?: string;
}

export class AdminPaymentsQueryDto extends AdminMarketQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_PAYMENT_STATUSES })
  @IsOptional()
  @Transform(({ value }) => normaliseStatusFilter(value))
  @IsString()
  @IsIn(ADMIN_PAYMENT_STATUSES as unknown as string[])
  status?: string;
}

/** The order detail route takes no filters — only the market it is read from. */
export class AdminOrderDetailQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 8)
  country?: string;
}
