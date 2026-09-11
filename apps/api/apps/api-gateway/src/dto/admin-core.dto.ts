import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * Bodies for the platform-wide admin surface (`AdminCoreController`).
 *
 * The gateway's `GatewayValidationPipe` runs `whitelist`,
 * `forbidNonWhitelisted` and `transform`, so a body parameter with a class
 * type is validated automatically and any field not declared here is refused
 * with 400. That cuts both ways: every field the console legitimately sends
 * has to appear below, and anything a caller must *not* be able to set has to
 * stay out.
 *
 * What is deliberately absent from every class here is `adminId`. The acting
 * administrator is read from the verified token by the controller
 * (`actorId(req)`), so a caller cannot ban a user or clear a KYC check under
 * somebody else's name. `AuditEntryDto` made the same choice in B5 and the
 * console's `addAuditLog` strips the field before sending; the ban and KYC
 * calls in `packages/shared-core/src/api/admin-core.ts` still send one and
 * need the same one-line change (see the task report).
 */

/** A decision that has to carry a reason — currently the user ban. */
export class ReasonDto {
  @ApiProperty({ example: 'Repeated fraudulent orders', minLength: 3, maxLength: 500 })
  @IsString()
  @Length(3, 500)
  reason: string;
}

export class KycDecisionDto {
  /**
   * The kind of record the check belongs to.
   *
   * Validated as a slug rather than against a fixed list: admin-service uses
   * this value as a Redis key segment (`admin:kyc:pending:<type>:<id>`) and
   * nothing in the platform enumerates the kinds — the console submits the
   * vertical the applicant registered for ('pharmacy', 'restaurant', 'taxi',
   * 'seller', …). So the rule that actually protects something is "a safe key
   * segment", not membership of a list that would refuse real verticals.
   */
  @ApiProperty({ example: 'seller', description: 'Lower-case slug, e.g. seller, pharmacy, taxi' })
  @Matches(/^[a-z][a-z0-9_-]{1,30}$/, {
    message: 'entityType must be a lower-case slug of 2-31 characters',
  })
  entityType: string;

  @ApiPropertyOptional({ example: 'Documents do not match the registration', maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}
