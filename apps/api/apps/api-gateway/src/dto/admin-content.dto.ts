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
  Validate,
  ValidateNested,
  ValidatorConstraint,
  validateSync,
} from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';

/**
 * A hero-slider banner slide.
 *
 * Every field optional except `id`: the marketplace and grocery editors both
 * write a fresh banner into state with placeholder text (`image: ''`) before
 * the admin fills it in, and every save round-trips the whole array — so a
 * required field here would 400 a banner nobody has finished editing yet.
 * `subheadline` is grocery-only (`grocery-section-editor.tsx`); marketplace's
 * own `Banner` interface (`section-editor-modal.tsx`) never sends it.
 */
export class LayoutBannerDto {
  @ApiProperty() @IsString() @Length(1, 64) id!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) headline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) subheadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) tag?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) cta?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) ctaHref?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) image?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) gradient?: string;
}

/** One question/answer pair in a `faq` section (`grocery-section-editor.tsx`). */
export class LayoutFaqItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) a?: string;
}

/**
 * A page-layout section.
 *
 * `saveLayout` used to read `req.body?.sections` straight off the request, so
 * the global validation pipe never saw it and unbounded JSON went to the
 * database under a key of `(moduleName, pageName)` — one homepage for every
 * market, writable by any admin (audit V16 / H-11).
 *
 * The field set is the union of what the real, network-calling consoles
 * actually persist per section `type` — read from
 * `apps/web/src/app/admin/grocery/page-builder/{page,components/grocery-section-editor}.tsx`
 * (`sectionTag`, `variant`, `emoji`, `maxItems`, `columns`, `visible`,
 * `gradient`, `cta`, `ctaHref`, `tag`, `description`, `tags`, `htmlContent`,
 * `items`), `apps/web/src/app/admin/page-builder/components/section-editor-modal.tsx`
 * (`viewAllHref`, `categories`, `banners`) and
 * `packages/shared-core/src/hooks/useGroceryLayout.ts`'s own
 * `GroceryLayoutSection` interface, which is this console's authoritative
 * shape. `public.page_layouts` is empty in dev (`SELECT count(*)` = 0), so
 * there is no persisted row carrying a field neither source shows.
 *
 * A prior version of this DTO declared only `id, type, title?, enabled?,
 * order?` — narrower than any of the six modules' real save payloads, so
 * every admin saving a page-builder layout (not only a locked one) got a 400
 * (review C1). Every non-`id` field is optional for the same reason as
 * `LayoutBannerDto`: state round-trips whatever was loaded, including bare
 * `{id, type, title}` seed sections from `admin-layout.controller.ts`.
 */
export class LayoutSectionDto {
  @ApiProperty() @IsString() @Length(1, 64) id!: string;
  @ApiProperty() @IsString() @Length(1, 64) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) subtitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() visible?: boolean;
  /** Superseded by `visible` in every real sender; kept for back-compat with saved rows. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(999) order?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(16) emoji?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) sectionTag?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) variant?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) maxItems?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(12) columns?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) gradient?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) cta?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) ctaHref?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) tag?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) viewAllHref?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() htmlContent?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [LayoutBannerDto], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LayoutBannerDto)
  banners?: LayoutBannerDto[];

  @ApiPropertyOptional({ type: [LayoutFaqItemDto], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LayoutFaqItemDto)
  items?: LayoutFaqItemDto[];
}

/**
 * A country's taxi-vendor landing-page content
 * (`apps/web/src/app/admin/taxi/landing-editor/page.tsx`'s `CountryLandingContent`).
 *
 * This is not a "section" in the marketplace/grocery sense at all — the taxi
 * landing editor reuses the generic `PUT /admin/layouts/:module/:page` route
 * to persist one fixed content record per country, keyed by ISO country code,
 * under the same `sections` jsonb column. Reconciling the two shapes behind
 * one column name is a MODULES question, not one this DTO can settle; it only
 * has to accept what the real editor already sends without 400ing it.
 */
export class CountryLandingContentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) heroTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) heroSub?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) earningRange?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) driverCount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) payout?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) payoutFreq?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  documents?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) testimonialName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) testimonialQuote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) testimonialFleet?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(5) testimonialRating?: number;
}

/** The four markets `apps/web/src/app/admin/taxi/landing-editor/page.tsx`'s `CountryCode` names. */
const LANDING_COUNTRY_CODES = ['IN', 'AE', 'SA', 'GB'] as const;

/**
 * `sections` is one JSON column serving two structurally different callers:
 * an array of page-builder sections (marketplace, grocery, pharmacy, doctor,
 * hotel — everything through `admin/page-builder` and
 * `admin/grocery/page-builder`) or a country-code-keyed content map (the taxi
 * landing editor). `class-validator` has no first-class union type, so this
 * runs the *same* rules either shape would get from `@ValidateNested` —
 * `whitelist`/`forbidNonWhitelisted` against `LayoutSectionDto` per array
 * element, or against `CountryLandingContentDto` per country — by hand, using
 * the identical `GatewayValidationPipe` options
 * (`pipes/gateway-validation.pipe.ts`). An unrecognised shape, an oversized
 * array, or an unknown field either shape's items carry is still refused.
 */
@ValidatorConstraint({ name: 'isLayoutSections', async: false })
class IsLayoutSectionsConstraint implements ValidatorConstraintInterface {
  private lastMessage =
    'sections must be an array of layout sections, or a per-country content map';

  validate(value: unknown, _args: ValidationArguments): boolean {
    if (Array.isArray(value)) {
      if (value.length > 50) {
        this.lastMessage = 'a page layout may hold at most 50 sections';
        return false;
      }
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item !== 'object' || item === null) {
          this.lastMessage = `sections[${i}] must be an object`;
          return false;
        }
        const instance = plainToInstance(LayoutSectionDto, item, {
          enableImplicitConversion: true,
        });
        const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
        if (errors.length) {
          this.lastMessage = `sections[${i}].${formatFirstError(errors)}`;
          return false;
        }
      }
      return true;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length === 0) {
        this.lastMessage = 'sections must not be empty';
        return false;
      }
      for (const key of keys) {
        if (!(LANDING_COUNTRY_CODES as readonly string[]).includes(key)) {
          this.lastMessage = `property ${key} should not exist`;
          return false;
        }
        const raw = (value as Record<string, unknown>)[key];
        if (typeof raw !== 'object' || raw === null) {
          this.lastMessage = `sections.${key} must be an object`;
          return false;
        }
        const instance = plainToInstance(CountryLandingContentDto, raw, {
          enableImplicitConversion: true,
        });
        const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
        if (errors.length) {
          this.lastMessage = `sections.${key}.${formatFirstError(errors)}`;
          return false;
        }
      }
      return true;
    }

    this.lastMessage = 'sections must be an array or an object';
    return false;
  }

  defaultMessage(): string {
    return this.lastMessage;
  }
}

function formatFirstError(
  errors: { property: string; constraints?: Record<string, string> }[],
): string {
  const [first] = errors;
  const detail = first?.constraints ? Object.values(first.constraints)[0] : undefined;
  return detail ?? `${first?.property ?? 'field'} is invalid`;
}

export class SaveLayoutDto {
  @ApiProperty({
    description:
      'Either an array of page-builder sections, or a per-country content map (taxi landing editor).',
  })
  @Validate(IsLayoutSectionsConstraint)
  sections!: LayoutSectionDto[] | Record<string, CountryLandingContentDto>;
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
