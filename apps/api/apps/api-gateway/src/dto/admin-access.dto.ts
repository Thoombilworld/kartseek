import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { STAFF_ROLES } from '@app/common';

/**
 * Roles a staff account may be created or moved into through the console.
 *
 * SUPER_ADMIN is deliberately absent: an account with global control of every
 * market and setting is made by an operator with database access, not by a web
 * form. The controller refuses the `super_admin` *role row* for the same
 * reason; this list refuses the `users.role` value.
 */
export const ASSIGNABLE_STAFF_ROLES = STAFF_ROLES.filter((r) => r !== 'SUPER_ADMIN');

export class CreateRoleDto {
  @ApiProperty({ example: 'ops_lead', description: 'Stable machine name; lower-case and _ only' })
  @Matches(/^[a-z_]{3,40}$/, {
    message: 'key must be 3-40 characters of lower-case letters and underscores',
  })
  key: string;

  @ApiProperty({ example: 'Operations Lead' })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiPropertyOptional({ example: 'Runs the delivery desk across every market' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ type: [String], example: ['dashboard.view', 'orders.view'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

/** Everything but `key`: renaming a role is fine, re-keying it orphans every reference. */
export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class CreateStaffDto {
  /**
   * Required, not optional. A staff sign-in has to clear a second factor and
   * that code is delivered by email; an account created without one could
   * never complete a login, and the temporary password below would have
   * nowhere to go.
   */
  @ApiProperty({ example: 'ae-admin@kartseek.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Amal' })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiProperty({ example: 'Rahman' })
  @IsString()
  @Length(1, 80)
  lastName: string;

  @ApiPropertyOptional({ example: '+971500000000' })
  @IsOptional()
  @IsString()
  @Length(5, 32)
  phone?: string;

  @ApiProperty({ enum: ASSIGNABLE_STAFF_ROLES, example: 'ADMIN' })
  @IsIn(ASSIGNABLE_STAFF_ROLES, {
    message: `role must be one of ${ASSIGNABLE_STAFF_ROLES.join(', ')}`,
  })
  role: string;

  @ApiProperty({ description: 'admin.admin_roles.id' })
  @IsUUID()
  adminRoleId: string;

  @ApiPropertyOptional({ example: 'AE', description: 'ISO-2 market code' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'regionCode must be a two-letter ISO country code' })
  regionCode?: string;

  @ApiPropertyOptional({ description: 'Confine this account to `regionCode`' })
  @IsOptional()
  @IsBoolean()
  regionLocked?: boolean;
}

export class UpdateStaffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 32)
  phone?: string;

  @ApiPropertyOptional({ enum: ASSIGNABLE_STAFF_ROLES })
  @IsOptional()
  @IsIn(ASSIGNABLE_STAFF_ROLES, {
    message: `role must be one of ${ASSIGNABLE_STAFF_ROLES.join(', ')}`,
  })
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adminRoleId?: string;

  @ApiPropertyOptional({ example: 'AE' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'regionCode must be a two-letter ISO country code' })
  regionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  regionLocked?: boolean;

  @ApiPropertyOptional({ description: 'false suspends the account; its next sign-in fails' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
