/// KARTSEEK — Admin SEO Management Controller
/// Provides CRUD endpoints for admin-managed SEO metadata overrides.
/// Admin panel can control: meta title, description, OG tags, schema, FAQ,
/// robots directives, canonical URL, keywords, and sitemap inclusion per page.
///
/// Routes:
/// GET    /api/v1/admin/seo              — List all SEO overrides
/// GET    /api/v1/admin/seo/:path        — Get override for a specific path
/// POST   /api/v1/admin/seo              — Create/update SEO override
/// DELETE /api/v1/admin/seo/:id          — Delete an override
/// GET    /api/v1/admin/seo/validate     — Validate all overrides
/// POST   /api/v1/admin/seo/bulk-update  — Batch update overrides

import { Controller, Get, Post, Delete, Put, Param, Body, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';

// ─── SEO Override Entity ────────────────────────────────────────────────────

export interface SeoOverride {
  id: string;
  path: string;                    // e.g., '/marketplace/product/iphone-17-pro'
  module: string;                  // 'marketplace' | 'restaurant' | 'doctor' | etc.
  
  // Meta tags
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  
  // Robots directives
  robotsIndex: boolean;
  robotsFollow: boolean;
  sitemapInclude: boolean;
  sitemapPriority: number;         // 0.0 - 1.0
  sitemapChangeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  
  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;                // Absolute URL to 1200x630 image
  ogType?: string;
  ogLocale?: string;
  
  // Twitter/X Card
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  
  // Schema markup overrides
  schemaType?: string;             // 'Product' | 'Restaurant' | 'Physician' | etc.
  schemaData?: Record<string, any>; // Raw JSON-LD to inject
  
  // FAQ blocks (AEO)
  faqItems?: { question: string; answer: string }[];
  
  // Language/country
  countryCode?: string;
  languageCode?: string;
  hreflangOverrides?: Record<string, string>;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// ─── In-memory store (production: replace with database) ────────────────────

const seoOverrides: Map<string, SeoOverride> = new Map();

// ─── Controller ─────────────────────────────────────────────────────────────

@ApiTags('👑 Admin SEO')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
// `api/v1` is the app-wide global prefix set in main.ts. Repeating it here made
// every route in this controller resolve to /api/v1/api/v1/admin/seo/... — which
// nothing calls. The controller was also missing from app.module.ts, so the
// routes did not exist at all; both are fixed, and the paths below are now the
// /admin/seo/* the web client has always asked for.
@Controller('admin/seo')
export class AdminSeoController {

  @Get()
  listOverrides(@Query('module') module?: string, @Query('page') page?: string) {
    let results = Array.from(seoOverrides.values());

    if (module) {
      results = results.filter(o => o.module === module);
    }

    const pageNum = parseInt(page || '1', 10);
    const perPage = 50;
    const total = results.length;
    const paginated = results.slice((pageNum - 1) * perPage, pageNum * perPage);

    return {
      success: true,
      data: paginated,
      pagination: { page: pageNum, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  @Get('validate')
  validateOverrides() {
    const issues: { path: string; issue: string }[] = [];

    seoOverrides.forEach((override, path) => {
      if (override.metaTitle && override.metaTitle.length > 60) {
        issues.push({ path, issue: `Meta title too long (${override.metaTitle.length}/60 chars)` });
      }
      if (override.metaDescription && override.metaDescription.length > 160) {
        issues.push({ path, issue: `Meta description too long (${override.metaDescription.length}/160 chars)` });
      }
      if (override.ogImage && !override.ogImage.startsWith('https://')) {
        issues.push({ path, issue: 'OG image must use HTTPS (required by Facebook)' });
      }
      if (override.ogImage && !override.ogImage.match(/\.(jpg|jpeg|png|webp)$/i)) {
        issues.push({ path, issue: 'OG image should be JPG, PNG, or WebP' });
      }
      if (!override.metaDescription || override.metaDescription.length < 50) {
        issues.push({ path, issue: 'Meta description should be at least 50 characters' });
      }
    });

    return {
      success: true,
      totalOverrides: seoOverrides.size,
      issueCount: issues.length,
      issues,
    };
  }

  @Get(':encodedPath')
  getOverride(@Param('encodedPath') encodedPath: string) {
    const path = decodeURIComponent(encodedPath);
    const override = seoOverrides.get(path);

    if (!override) {
      return { success: false, message: 'No SEO override for this path', statusCode: HttpStatus.NOT_FOUND };
    }

    return { success: true, data: override };
  }

  @Post()
  upsertOverride(@Body() body: Partial<SeoOverride>) {
    if (!body.path) {
      return { success: false, message: 'Path is required', statusCode: HttpStatus.BAD_REQUEST };
    }

    const existing = seoOverrides.get(body.path);
    const now = new Date().toISOString();

    const override: SeoOverride = {
      id: existing?.id || `seo_${Date.now()}`,
      path: body.path,
      module: body.module || 'general',
      metaTitle: body.metaTitle ?? existing?.metaTitle,
      metaDescription: body.metaDescription ?? existing?.metaDescription,
      keywords: body.keywords ?? existing?.keywords,
      canonicalUrl: body.canonicalUrl ?? existing?.canonicalUrl,
      robotsIndex: body.robotsIndex ?? existing?.robotsIndex ?? true,
      robotsFollow: body.robotsFollow ?? existing?.robotsFollow ?? true,
      sitemapInclude: body.sitemapInclude ?? existing?.sitemapInclude ?? true,
      sitemapPriority: body.sitemapPriority ?? existing?.sitemapPriority ?? 0.5,
      sitemapChangeFreq: body.sitemapChangeFreq ?? existing?.sitemapChangeFreq ?? 'weekly',
      ogTitle: body.ogTitle ?? existing?.ogTitle,
      ogDescription: body.ogDescription ?? existing?.ogDescription,
      ogImage: body.ogImage ?? existing?.ogImage,
      ogType: body.ogType ?? existing?.ogType,
      ogLocale: body.ogLocale ?? existing?.ogLocale,
      twitterTitle: body.twitterTitle ?? existing?.twitterTitle,
      twitterDescription: body.twitterDescription ?? existing?.twitterDescription,
      twitterImage: body.twitterImage ?? existing?.twitterImage,
      schemaType: body.schemaType ?? existing?.schemaType,
      schemaData: body.schemaData ?? existing?.schemaData,
      faqItems: body.faqItems ?? existing?.faqItems,
      countryCode: body.countryCode ?? existing?.countryCode,
      languageCode: body.languageCode ?? existing?.languageCode,
      hreflangOverrides: body.hreflangOverrides ?? existing?.hreflangOverrides,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      updatedBy: body.updatedBy || 'admin',
    };

    seoOverrides.set(body.path, override);

    return {
      success: true,
      message: existing ? 'SEO override updated' : 'SEO override created',
      data: override,
    };
  }

  @Post('bulk-update')
  bulkUpdate(@Body() body: { overrides: Partial<SeoOverride>[] }) {
    const results: { path: string; status: string }[] = [];

    for (const item of body.overrides || []) {
      if (!item.path) continue;
      const result = this.upsertOverride(item);
      results.push({ path: item.path, status: 'updated' });
    }

    return { success: true, updated: results.length, results };
  }

  @Delete(':id')
  deleteOverride(@Param('id') id: string) {
    let deleted = false;
    seoOverrides.forEach((override, path) => {
      if (override.id === id) {
        seoOverrides.delete(path);
        deleted = true;
      }
    });

    return {
      success: deleted,
      message: deleted ? 'SEO override deleted' : 'Override not found',
    };
  }
}
