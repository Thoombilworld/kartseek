/// KARTSEEK — Admin SEO Management Controller
/// Provides CRUD endpoints for admin-managed SEO metadata overrides.
/// Admin panel can control: meta title, description, OG tags, robots
/// directives, canonical URL, keywords, and sitemap inclusion per page.
///
/// Routes:
/// GET    /api/v1/admin/seo              — List all SEO overrides
/// GET    /api/v1/admin/seo/:path        — Get override for a specific path
/// POST   /api/v1/admin/seo              — Create/update SEO override
/// DELETE /api/v1/admin/seo/:id          — Delete an override
/// GET    /api/v1/admin/seo/validate     — Validate all overrides
/// POST   /api/v1/admin/seo/bulk-update  — Batch update overrides

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import { refuseLockedAdmin } from '../guards/market-scope';
import { SeoOverride } from '../entities';
import { SeoOverrideDto, BulkSeoDto } from '../dto/admin-content.dto';

// ─── Controller ─────────────────────────────────────────────────────────────
//
// Overrides used to live in a module-level `Map` (production comment: "replace
// with a database"): per-process memory, gone on every restart and different
// on every gateway replica behind the load balancer, so the console's "saved"
// toast was only ever true for the request that happened to land on the
// replica that made the change. `SeoOverride`
// (entities/seo-override.entity.ts, table `seo_overrides` in the main
// database) replaces it with one row per path (audit V17 / H-12).
//
// The body used to be typed as `Partial<SeoOverride>` against a bare
// `interface`, which left Nest with no metatype and skipped validation
// entirely — which is how `updatedBy` came to be whatever the caller wrote.
// `SeoOverrideDto`/`BulkSeoDto` (`dto/admin-content.dto.ts`) close that; the
// actor is now always the verified token (`upsertOverride` below).

@ApiTags('👑 Admin SEO')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
// `api/v1` is the app-wide global prefix set in main.ts. Repeating it here made
// every route in this controller resolve to /api/v1/api/v1/admin/seo/... — which
// nothing calls. The controller was also missing from api-gateway.module.ts, so the
// routes did not exist at all; both are fixed, and the paths below are now the
// /admin/seo/* the web client has always asked for.
@Controller('admin/seo')
export class AdminSeoController {
  constructor(@InjectRepository(SeoOverride) private readonly repo: Repository<SeoOverride>) {}

  @Get()
  @GlobalEntity('SEO overrides are per path; a market-specific path carries its market in the path')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.view')
  async listOverrides(@Query('module') module?: string, @Query('page') page?: string) {
    const results = await this.repo.find({
      where: module ? { module } : {},
      order: { path: 'ASC' },
    });

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
  @GlobalEntity('SEO overrides are per path; a market-specific path carries its market in the path')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.view')
  async validateOverrides() {
    const overrides = await this.repo.find();
    const issues: { path: string; issue: string }[] = [];

    for (const override of overrides) {
      if (override.metaTitle && override.metaTitle.length > 60) {
        issues.push({
          path: override.path,
          issue: `Meta title too long (${override.metaTitle.length}/60 chars)`,
        });
      }
      if (override.metaDescription && override.metaDescription.length > 160) {
        issues.push({
          path: override.path,
          issue: `Meta description too long (${override.metaDescription.length}/160 chars)`,
        });
      }
      if (override.ogImage && !override.ogImage.startsWith('https://')) {
        issues.push({
          path: override.path,
          issue: 'OG image must use HTTPS (required by Facebook)',
        });
      }
      if (override.ogImage && !override.ogImage.match(/\.(jpg|jpeg|png|webp)$/i)) {
        issues.push({ path: override.path, issue: 'OG image should be JPG, PNG, or WebP' });
      }
      if (!override.metaDescription || override.metaDescription.length < 50) {
        issues.push({
          path: override.path,
          issue: 'Meta description should be at least 50 characters',
        });
      }
    }

    return {
      success: true,
      totalOverrides: overrides.length,
      issueCount: issues.length,
      issues,
    };
  }

  @Get(':encodedPath')
  @GlobalEntity('SEO overrides are per path; a market-specific path carries its market in the path')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.view')
  async getOverride(@Param('encodedPath') encodedPath: string) {
    const path = decodeURIComponent(encodedPath);
    const override = await this.repo.findOne({ where: { path } });

    if (!override) {
      return {
        success: false,
        message: 'No SEO override for this path',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return { success: true, data: override };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.manage')
  async upsertOverride(@Req() req: any, @Body() dto: SeoOverrideDto) {
    // An SEO override applies to one path across every market, so a locked
    // admin may not write one. The body used to be typed as an `interface`,
    // which leaves Nest with no metatype and skips validation entirely — which
    // is how `updatedBy` came to be whatever the caller wrote (audit V17/H-12).
    refuseLockedAdmin(req, 'an SEO override');
    return this.upsertRow(req, dto);
  }

  @Post('bulk-update')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.manage')
  async bulkUpdate(@Req() req: any, @Body() dto: BulkSeoDto) {
    // Refused once, up front — `upsertRow` below does the per-item write
    // without re-checking scope for every item in the batch.
    refuseLockedAdmin(req, 'an SEO override');
    const results: { path: string; status: string }[] = [];
    for (const item of dto.overrides) {
      await this.upsertRow(req, item);
      results.push({ path: item.path, status: 'updated' });
    }
    return { success: true, updated: results.length, results };
  }

  /** The write itself, once the caller's scope has already been confirmed. */
  private async upsertRow(req: any, dto: SeoOverrideDto) {
    const existing = await this.repo.findOne({ where: { path: dto.path } });
    const row = this.repo.create({
      ...(existing ?? {}),
      ...dto,
      updatedBy: req?.user?.id ?? req?.user?.sub ?? null,
      updatedAt: new Date(),
    });
    const saved = await this.repo.save(row);
    return {
      success: true,
      message: existing ? 'SEO override updated' : 'SEO override created',
      data: saved,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.manage')
  async deleteOverride(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    refuseLockedAdmin(req, 'an SEO override');
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('SEO override not found');
    return { success: true, message: 'SEO override deleted' };
  }
}
