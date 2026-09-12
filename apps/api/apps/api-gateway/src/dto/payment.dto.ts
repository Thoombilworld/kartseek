import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * The values payment-service's own enums hold, mirrored here.
 *
 * Not imported from `apps/payment-service/src/entities/payment.entity.ts`: an
 * enum is a runtime value, so importing it would pull an entity file — and the
 * TypeORM decorators and sibling entities it imports — into the gateway
 * bundle, across an app boundary the builder keeps separate on purpose (the
 * same reason `payment.controller.ts` inlines its region payment-method
 * table). Two copies of a list that may drift are worse than one in the wrong
 * place, so `payment-scope.spec.ts` compares these three arrays against the
 * enums themselves and fails when they diverge. The spec can import the entity
 * file freely; the bundle cannot.
 */
export const PAYMENT_MODULES = [
  'marketplace',
  'grocery',
  'restaurant',
  'pharmacy',
  'hotel',
  'taxi',
  'doctor',
  'wallet_topup',
] as const;

export const PAYMENT_STATUSES = [
  'INITIATED',
  'PROCESSING',
  'PREAUTHORIZED',
  'SUCCESS',
  'FAILED',
  'ESCROW_HOLD',
  'ESCROW_RELEASED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELLED',
  'EXPIRED',
] as const;

export const PAYMENT_GATEWAYS = [
  'razorpay',
  'stripe',
  'mada',
  'upi',
  'wallet',
  'cod',
  'pay_at_venue',
] as const;

/**
 * The reporting window and the market — shared by the settlement dashboard and
 * the payments dashboard below.
 *
 * These routes used to take `@Query() filters: any` and forward the object
 * verbatim to payment-service. Two consequences, both closed by declaring the
 * shape:
 *
 *  * `scope` is the gateway's own key — the proof that the caller's market came
 *    from a verified token rather than from the request. Forwarding the query
 *    object as-is meant `?scope=IN` arrived at payment-service indistinguishable
 *    from a scope the gateway had resolved. `GatewayValidationPipe` runs
 *    `whitelist` + `forbidNonWhitelisted`, so an undeclared `scope` is now a 400
 *    before the handler runs, and the handler writes the key itself.
 *  * a date that is not a date reached the report query and came back as a 500.
 *
 * `countryCode` is ISO 3166-1 alpha-2 in either case: `resolveMarket`
 * upper-cases, and a locked admin naming any market but their own is refused.
 */
export class PaymentAdminFilterDto {
  @ApiPropertyOptional({ description: 'ISO 8601 start of the reporting window' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 end of the reporting window' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 market, e.g. QA' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'countryCode must be an ISO 3166-1 alpha-2 code.' })
  countryCode?: string;
}

/**
 * `GET /payments/admin/dashboard`.
 *
 * Every field `PaymentOrchestratorService.getPaymentsDashboard` reads is
 * declared here, because under `forbidNonWhitelisted` a field this class omits
 * is a 400 — and an omitted field the service still reads is worse than that:
 * it is a filter the console cannot use and a page the caller cannot leave.
 * `module`, `status`, `gateway`, `sellerId`, `page` and `limit` were live in
 * that query builder before this DTO existed and are live in it now.
 *
 * Bounds rather than bare types: `limit` is what a caller could otherwise set
 * to a million and read the whole payments table in one response, and `page`
 * below 1 produces a negative `skip` that Postgres rejects as a 500.
 */
export class PaymentDashboardFilterDto extends PaymentAdminFilterDto {
  @ApiPropertyOptional({ enum: PAYMENT_MODULES })
  @IsOptional()
  @IsIn(PAYMENT_MODULES as unknown as string[], {
    message: `module must be one of: ${PAYMENT_MODULES.join(', ')}.`,
  })
  module?: string;

  @ApiPropertyOptional({ enum: PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(PAYMENT_STATUSES as unknown as string[], {
    message: `status must be one of: ${PAYMENT_STATUSES.join(', ')}.`,
  })
  status?: string;

  @ApiPropertyOptional({ enum: PAYMENT_GATEWAYS })
  @IsOptional()
  @IsIn(PAYMENT_GATEWAYS as unknown as string[], {
    message: `gateway must be one of: ${PAYMENT_GATEWAYS.join(', ')}.`,
  })
  gateway?: string;

  /**
   * Bounded, not `@IsUUID`. `payments.seller_id` is a `varchar` holding "seller
   * / vendor / doctor / hotel owner" ids from several modules, so requiring a
   * uuid here would narrow a working filter exactly the way an undeclared field
   * does.
   */
  @ApiPropertyOptional({ description: 'Seller, vendor, doctor or hotel-owner id' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  sellerId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/**
 * `POST /payments/refund`.
 *
 * The body was `dto: any`, forwarded verbatim to payment-service, on a route
 * that declared no role at all — so a refund could be initiated on any payment
 * id by any authenticated caller, with `initiatedBy` set to whatever the body
 * said (whole-branch review, finding A-7). Declaring the shape closes three
 * things at once, in the order they bite:
 *
 *  * `scope` cannot be sent. It is the gateway's own key, written by the
 *    handler from the verified token; under `GatewayValidationPipe`'s
 *    `whitelist` + `forbidNonWhitelisted` an undeclared `scope` is a 400 before
 *    the handler runs, rather than a market the gateway never resolved.
 *  * `initiatedBy` cannot be sent either. The actor on a money movement comes
 *    from the token, not from the request.
 *  * `amount` is bounded and positive. A zero or negative amount reached
 *    `initiateRefund`'s `amount > maxRefundable` check, passed it, and asked
 *    the provider to refund a nonsense sum.
 */
export class PaymentRefundDto {
  @ApiPropertyOptional({ description: 'The payment to refund' })
  @IsString()
  @Length(1, 64)
  paymentId!: string;

  @ApiPropertyOptional({ description: 'Amount to refund, in the payment currency' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Why the refund is being made — recorded on the refund' })
  @IsString()
  @Length(1, 500)
  reason!: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 market, e.g. QA' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'countryCode must be an ISO 3166-1 alpha-2 code.' })
  countryCode?: string;
}
