import { Controller, Get, Put, Param, Req, Body, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaticPage } from '../entities';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';

// ── Default page seeds — used when no DB entry exists ──────────────────────
const PAGE_SEEDS: Record<string, { title: string; metaDescription: string; heroGradient: string; heroIcon: string }> = {
  privacy:   { title: 'Privacy Policy', metaDescription: 'How KartSeek collects, uses, and protects your personal information.', heroGradient: 'from-blue-700 via-indigo-700 to-violet-700', heroIcon: 'Shield' },
  terms:     { title: 'Terms of Service', metaDescription: 'Terms and conditions governing your use of KartSeek.', heroGradient: 'from-slate-800 via-slate-900 to-slate-800', heroIcon: 'FileText' },
  cookies:   { title: 'Cookie Policy', metaDescription: 'How KartSeek uses cookies and similar tracking technologies.', heroGradient: 'from-amber-600 via-orange-600 to-rose-600', heroIcon: 'Cookie' },
  security:  { title: 'Security', metaDescription: 'How KartSeek protects your data and keeps your account safe.', heroGradient: 'from-green-700 via-emerald-700 to-teal-700', heroIcon: 'Shield' },
  grievance: { title: 'Grievance Redressal', metaDescription: 'Contact KartSeek Grievance Officer for complaint redressal.', heroGradient: 'from-slate-700 via-slate-800 to-slate-900', heroIcon: 'Scale' },
  about:     { title: 'About Us', metaDescription: 'Learn about KartSeek — India\'s next-generation super-app marketplace.', heroGradient: 'from-blue-700 via-indigo-700 to-violet-700', heroIcon: 'ShoppingBag' },
  careers:   { title: 'Careers', metaDescription: 'Join KartSeek and help build India\'s largest super-app.', heroGradient: 'from-violet-700 via-purple-700 to-fuchsia-700', heroIcon: 'Briefcase' },
  press:     { title: 'Press & Media', metaDescription: 'KartSeek press releases, media resources, and brand assets.', heroGradient: 'from-slate-800 via-slate-900 to-slate-800', heroIcon: 'Newspaper' },
  contact:   { title: 'Contact Us', metaDescription: 'Get in touch with KartSeek support.', heroGradient: 'from-blue-600 via-cyan-600 to-teal-600', heroIcon: 'Phone' },
  investors: { title: 'Investor Relations', metaDescription: 'KartSeek investor information and financial highlights.', heroGradient: 'from-slate-800 via-slate-900 to-slate-800', heroIcon: 'TrendingUp' },
};

// ── Admin Endpoints (require auth) ─────────────────────────────────────────
@ApiTags('Admin Static Pages')
@Controller('admin/static-pages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminStaticPagesController {
  constructor(
    @InjectRepository(StaticPage) private readonly repo: Repository<StaticPage>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all static pages' })
  async listPages() {
    const pages = await this.repo.find({ order: { slug: 'ASC' } });

    // Ensure all 10 slugs exist — fill missing ones with seeds
    const existing = new Set(pages.map(p => p.slug));
    const allSlugs = Object.keys(PAGE_SEEDS);
    const result = [...pages];

    for (const slug of allSlugs) {
      if (!existing.has(slug)) {
        const seed = PAGE_SEEDS[slug];
        result.push({
          id: slug, slug, title: seed.title, metaDescription: seed.metaDescription,
          heroGradient: seed.heroGradient, heroIcon: seed.heroIcon,
          sections: [], isPublished: true, version: 0, lastEditedBy: null,
          createdAt: new Date(), updatedAt: new Date(),
        } as any);
      }
    }

    return { data: result.sort((a, b) => a.slug.localeCompare(b.slug)), total: result.length };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get static page by slug' })
  async getPage(@Param('slug') slug: string) {
    let page = await this.repo.findOne({ where: { slug } });
    if (!page) {
      const seed = PAGE_SEEDS[slug];
      if (!seed) throw new NotFoundException(`Page "${slug}" not found`);
      return { slug, ...seed, sections: [] as unknown[], isPublished: true, version: 0, lastEditedBy: null as unknown };
    }
    return page;
  }

  @Put(':slug')
  @ApiOperation({ summary: 'Save static page content' })
  async savePage(@Param('slug') slug: string, @Body() body: any) {
    let page = await this.repo.findOne({ where: { slug } });

    if (!page) {
      const seed = PAGE_SEEDS[slug] || { title: slug, metaDescription: '', heroGradient: '', heroIcon: 'FileText' };
      page = this.repo.create({
        slug,
        title: body.title || seed.title,
        metaDescription: body.metaDescription || seed.metaDescription,
        heroGradient: body.heroGradient || seed.heroGradient,
        heroIcon: body.heroIcon || seed.heroIcon,
        sections: body.sections || [],
        isPublished: body.isPublished !== undefined ? body.isPublished : true,
        version: 1,
        lastEditedBy: body.adminId || 'system',
      });
    } else {
      if (body.title !== undefined) page.title = body.title;
      if (body.metaDescription !== undefined) page.metaDescription = body.metaDescription;
      if (body.heroGradient !== undefined) page.heroGradient = body.heroGradient;
      if (body.heroIcon !== undefined) page.heroIcon = body.heroIcon;
      if (body.sections !== undefined) page.sections = body.sections;
      if (body.isPublished !== undefined) page.isPublished = body.isPublished;
      page.version = (page.version || 0) + 1;
      page.lastEditedBy = body.adminId || page.lastEditedBy;
    }

    await this.repo.save(page);
    return { success: true, page };
  }

  @Put(':slug/publish')
  @ApiOperation({ summary: 'Toggle publish status' })
  async togglePublish(@Param('slug') slug: string) {
    let page = await this.repo.findOne({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    page.isPublished = !page.isPublished;
    await this.repo.save(page);
    return { success: true, isPublished: page.isPublished };
  }
}

// ── Public Endpoint (no auth, customer-facing) ─────────────────────────────
@ApiTags('Public Pages')
@Controller('pages')
export class PublicPagesController {
  constructor(
    @InjectRepository(StaticPage) private readonly repo: Repository<StaticPage>,
  ) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get published static page content' })
  async getPublishedPage(@Param('slug') slug: string) {
    const page = await this.repo.findOne({ where: { slug, isPublished: true } });
    if (!page) {
      return { slug, sections: [] as unknown[], notFound: true };
    }
    return {
      slug: page.slug,
      title: page.title,
      metaDescription: page.metaDescription,
      heroGradient: page.heroGradient,
      heroIcon: page.heroIcon,
      sections: page.sections,
      updatedAt: page.updatedAt,
    };
  }
}
