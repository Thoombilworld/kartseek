/**
 * KARTSEEK Seller Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsInt,
  Min, Max, MaxLength, MinLength, Matches, IsObject, IsBoolean, IsNumber,
  IsPositive, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SellerType {
  MARKETPLACE = 'marketplace',
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  DOCTOR = 'doctor',
  HOTEL = 'hotel',
  TAXI = 'taxi',
}

export enum SellerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
  DEACTIVATED = 'deactivated',
}

/**
 * Seller business registration.
 *
 * Two things about this shape are deliberate.
 *
 * **No password.** The user account is created first, by
 * `POST /auth/seller/register`; this call binds a *business* to the already
 * signed-in user via `ownerId`, taken from the JWT. The DTO used to demand a
 * password that `registerSeller()` never read.
 *
 * **Owner fields are optional here, required after normalisation.** The web
 * onboarding wizard spells them `accountHolderName` / `businessEmail` /
 * `businessPhone` / `countryCode`; Flutter clients use the canonical names
 * below. `SellerService.normaliseRegistration` resolves either spelling and
 * then rejects a payload that supplied neither — so validation here checks
 * *format*, and the service checks *presence*. Marking them required at this
 * layer would reject the wizard outright.
 *
 * For the same reason this DTO must be validated WITHOUT `whitelist: true`:
 * stripping unrecognised keys would delete the wizard's alternate spellings
 * before the normaliser ever sees them.
 */
export class RegisterSellerDto {
  @ApiProperty({ example: 'Jane\'s Electronics' })
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(200)
  businessName: string;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Also accepted as `accountHolderName`' })
  @IsOptional() @IsString() @MaxLength(100)
  ownerName?: string;

  @ApiPropertyOptional({ example: 'jane@janeshop.com', description: 'Also accepted as `businessEmail`' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+91712345678', description: 'Also accepted as `businessPhone`' })
  @IsOptional() @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number' })
  phone?: string;

  @ApiPropertyOptional({ enum: SellerType, example: 'marketplace' })
  @IsOptional() @IsEnum(SellerType)
  type?: SellerType;

  @ApiPropertyOptional({ example: 'llc', description: 'INDIVIDUAL | LLC | PARTNERSHIP | CORPORATION' })
  @IsOptional() @IsString() @MaxLength(50)
  businessType?: string;

  @ApiPropertyOptional({ example: 'QA', description: 'Also accepted as `countryCode` or `country`' })
  @IsOptional() @IsString() @MaxLength(3)
  regionCode?: string;

  @ApiPropertyOptional({ example: 'QA', description: 'The market this business trades in' })
  @IsOptional() @IsString() @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'Doha' })
  @IsOptional() @IsString() @MaxLength(120)
  stateRegion?: string;

  @ApiPropertyOptional({ example: '1 Corniche Street' })
  @IsOptional() @IsString() @MaxLength(500)
  registeredAddress?: string;

  @ApiPropertyOptional({ example: 'TAX-12345678', description: 'GST / VAT / tax registration number' })
  @IsOptional() @IsString() @MaxLength(64)
  taxId?: string;

  @ApiPropertyOptional({ example: 'VAT-0099' })
  @IsOptional() @IsString() @MaxLength(64)
  vatNumber?: string;

  @ApiPropertyOptional({ example: 'Jane\'s Electronics' })
  @IsOptional() @IsString() @MaxLength(200)
  storeDisplayName?: string;

  @ApiPropertyOptional({ example: 'Consumer electronics and accessories.' })
  @IsOptional() @IsString() @MaxLength(2000)
  storeDescription?: string;

  /**
   * Payout destination. Persisted to `seller_bank_accounts` with the account
   * number encrypted — never to the plaintext `seller_settings.bankDetails`
   * column. Previously collected by the wizard and discarded entirely.
   */
  @ApiPropertyOptional({ example: { accountHolderName: 'Jane Doe', bankName: 'QNB', accountNumber: '123456789', bankCode: 'QNBAQAQA' } })
  @IsOptional() @IsObject()
  bankDetails?: Record<string, string>;
}

export class UpdateSellerDto {
  @ApiPropertyOptional({ example: 'Jane\'s Premium Electronics' })
  @IsOptional() @IsString() @MaxLength(200)
  businessName?: string;

  @ApiPropertyOptional({ example: 'jane@premium.com' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+91712345678' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/logo.png' })
  @IsOptional() @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'We sell premium electronics...' })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://janeshop.com' })
  @IsOptional() @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: { line1: '42 Palm Ave', city: 'Mumbai', pincode: '00100' } })
  @IsOptional() @IsObject()
  address?: Record<string, string>;

  @ApiPropertyOptional({ example: { accountName: 'Jane Doe', bankName: 'KCB', accountNumber: '123456' } })
  @IsOptional() @IsObject()
  bankDetails?: Record<string, string>;
}

export class SellerKycDto {
  @ApiProperty({ example: 'seller-uuid-001' })
  @IsString() @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: 'national_id', description: 'Document type: national_id | passport | business_license | tax_cert' })
  @IsString() @IsNotEmpty()
  documentType: string;

  @ApiProperty({ example: 'DOC-123456789' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  documentNumber: string;

  @ApiProperty({ example: 'https://cdn.kartseek.com/docs/id-front.jpg' })
  @IsString() @IsNotEmpty()
  frontImageUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/docs/id-back.jpg' })
  @IsOptional() @IsString()
  backImageUrl?: string;

  @ApiPropertyOptional({ example: '2030-12-31' })
  @IsOptional() @IsString()
  expiryDate?: string;
}

export class SellerQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SellerType })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: SellerStatus })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  regionCode?: string;
}

export class SellerSettingsDto {
  @ApiPropertyOptional({ example: true, description: 'Accept online orders' })
  @IsOptional() @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Auto-accept orders' })
  @IsOptional() @IsBoolean()
  autoAcceptOrders?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Preparation time in minutes' })
  @IsOptional() @IsInt() @Min(5) @Max(180)
  preparationTimeMinutes?: number;

  @ApiPropertyOptional({ example: 500, description: 'Minimum order amount' })
  @IsOptional() @IsNumber() @Min(0)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ example: '09:00', description: 'Opening time HH:mm' })
  @IsOptional() @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ example: '22:00', description: 'Closing time HH:mm' })
  @IsOptional() @IsString()
  closingTime?: string;
}

/**
 * Payout request.
 *
 * `requestPayout` publishes straight to Kafka, so an unvalidated body reached the
 * money path: a zero, negative, or non-numeric amount was accepted, and the
 * bank account reference was never checked. Both are constrained here.
 */
export class RequestPayoutDto {
  @ApiProperty({ example: 25000, description: 'Payout amount in minor-unit-free currency (must be > 0)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(10_000_000)
  amount: number;

  @ApiPropertyOptional({ example: 'b3f1c2d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d', description: 'Target bank account id' })
  @IsOptional() @IsUUID()
  bankAccountId?: string;
}

/**
 * Password change. The actual credential update is delegated to auth-service over
 * Kafka; this shape exists so the request is validated and, critically, so the
 * payload is typed rather than `any` — the old signature accepted arbitrary keys.
 */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ description: 'New password (min 8 chars, one letter and one number)' })
  @IsString() @MinLength(8) @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'newPassword must contain at least one letter and one number',
  })
  newPassword: string;
}
