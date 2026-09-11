import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
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
  @ApiProperty({
    description: "What happened, recorded as `console.<action>` (e.g. 'seller.approved')",
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
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
