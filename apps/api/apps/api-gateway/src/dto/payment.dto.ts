import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

/**
 * Query for the six `/payments/admin/*` settlement reads.
 *
 * These routes used to take `@Query() filters: any` and forward the object
 * verbatim to payment-service. Two consequences, both closed by declaring the
 * shape here:
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
