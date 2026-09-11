import { IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * One console-originated audit entry.
 *
 * The gateway's global `ValidationPipe` runs with `whitelist` and
 * `forbidNonWhitelisted`, so every field the console sends must be declared
 * here or the request is rejected outright. Note what is deliberately *absent*:
 * there is no `actorId`, `actorEmail`, `actorRole` or `country`. Those are read
 * from the verified token by the controller, so a caller cannot write the trail
 * as somebody else, or file their action under another market.
 */
export class AuditEntryDto {
  /**
   * A machine key, not a sentence.
   *
   * The console was sending `Auth.Admin signed in`, which the controller stored
   * as `console.Auth.Admin signed in`: a value that cannot be filtered by
   * prefix, grouped, or matched against the `http.<verb>.<path>` keys the
   * gateway's interceptor writes, and that splits one action across as many
   * spellings as there are callers. The trail is queried by this field, so its
   * shape is enforced here rather than trusted to each call site.
   *
   * Lower-case, starting with a letter, then letters, digits, `_`, `.` or `-`,
   * at least three characters — `@MaxLength(80)` above is the upper bound the
   * pipe actually applies. Dots separate the surface from the action
   * (`auth.signed_in`, `seller.approved`).
   */
  @ApiProperty({
    description:
      "Machine key for what happened, stored as `console.<action>` (e.g. 'seller.approved'). Lower-case slug: must match /^[a-z][a-z0-9_.-]{2,80}$/.",
    maxLength: 80,
    pattern: '^[a-z][a-z0-9_.-]{2,80}$',
    example: 'auth.signed_in',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-z][a-z0-9_.-]{2,80}$/, {
    message:
      'action must be a lower-case machine key such as "seller.approved" — letters, digits, _ . - only, starting with a letter',
  })
  action: string;

  @ApiPropertyOptional({ description: "The kind of record acted on, e.g. 'sellers'" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @ApiPropertyOptional({ description: 'The record acted on' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entityId?: string;

  /**
   * Free-form context, stored under `metadata`. Typed as `Record<string,
   * unknown>` rather than `any` so a caller that stuffs a string in here fails
   * the pipe instead of producing a Mongo document whose `metadata` is
   * sometimes an object and sometimes not.
   */
  @ApiPropertyOptional({ description: 'Additional context, stored under metadata', type: Object })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Why the action was taken', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
