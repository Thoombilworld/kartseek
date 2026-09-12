import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * A page-layout section.
 *
 * `saveLayout` used to read `req.body?.sections` straight off the request, so
 * the global validation pipe never saw it and unbounded JSON went to the
 * database under a key of `(moduleName, pageName)` — one homepage for every
 * market, writable by any admin (audit V16 / H-11).
 */
export class LayoutSectionDto {
  @ApiProperty() @IsString() @Length(1, 64) id!: string;
  @ApiProperty() @IsString() @Length(1, 64) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(999) order?: number;
}

export class SaveLayoutDto {
  @ApiProperty({ type: [LayoutSectionDto], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50, { message: 'a page layout may hold at most 50 sections' })
  @ValidateNested({ each: true })
  @Type(() => LayoutSectionDto)
  sections!: LayoutSectionDto[];
}

export class SavePageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(320) metaDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) heroGradient?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) heroIcon?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;

  @ApiPropertyOptional({ type: [Object], maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  sections?: unknown[];
  // `adminId` is deliberately absent: the editor is `req.user.id`.
}

export class SeoOverrideDto {
  @ApiProperty({ example: '/marketplace/product/iphone-17-pro' })
  @IsString()
  @Matches(/^\/[\w\-/.:%]*$/, { message: 'path must be an absolute site path' })
  @MaxLength(512)
  path!: string;

  @ApiProperty() @IsString() @Length(1, 32) module!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) metaDescription?: string;
  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  keywords?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUrl({ protocols: ['https'] }) canonicalUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() robotsIndex?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() robotsFollow?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sitemapInclude?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) sitemapPriority?: number;
  @ApiPropertyOptional({
    enum: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
  })
  @IsOptional()
  @IsIn(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])
  sitemapChangeFreq?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl({ protocols: ['https'] }) ogImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) ogTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) ogDescription?: string;
  // `updatedBy` is deliberately absent — see SavePageDto.
}

export class BulkSeoDto {
  @ApiProperty({ type: [SeoOverrideDto], maxItems: 200 })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SeoOverrideDto)
  overrides!: SeoOverrideDto[];
}
