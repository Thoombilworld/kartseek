import {
  Controller,
  Get,
  Put,
  Param,
  Req,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageLayout } from '../entities';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import { refuseLockedAdmin } from '../guards/market-scope';
import { SaveLayoutDto } from '../dto/admin-content.dto';

@ApiTags('Admin Layouts')
@Controller('admin/layouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminLayoutController {
  constructor(@InjectRepository(PageLayout) private readonly layoutRepo: Repository<PageLayout>) {}

  @Get(':moduleName/:pageName')
  @GlobalEntity('page layouts are per module page, not per market')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.view')
  @ApiOperation({ summary: 'Get page layout configuration' })
  async getLayout(@Param('moduleName') moduleName: string, @Param('pageName') pageName: string) {
    const layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
    if (!layout) {
      const mod = moduleName.toLowerCase();
      let sections: unknown[] = [];
      if (pageName.toLowerCase() === 'homepage') {
        if (mod === 'marketplace') {
          sections = [
            { id: 'sec-hero', type: 'hero_slider', title: 'Main Hero Slider' },
            { id: 'sec-trust', type: 'trust_badges', title: 'Trust Badges' },
            { id: 'sec-shop', type: 'category_grid', title: 'Shop by Category' },
            { id: 'sec-flash', type: 'flash_deals', title: 'Flash Deals' },
            { id: 'sec-elec', type: 'product_carousel', title: 'Best of Electronics' },
            { id: 'sec-elec-brands', type: 'brand_promo', title: 'Top Electronics Brands' },
          ];
        } else if (mod === 'grocery') {
          sections = [
            { id: 'sec-g-hero', type: 'hero_slider', title: 'Grocery Offers' },
            { id: 'sec-g-cat', type: 'category_grid', title: 'Shop by Category' },
            { id: 'sec-g-fresh', type: 'product_carousel', title: 'Fresh Produce' },
            { id: 'sec-g-deals', type: 'flash_deals', title: 'Daily Essentials Deals' },
          ];
        } else if (mod === 'pharmacy') {
          sections = [
            { id: 'sec-p-hero', type: 'hero_slider', title: 'Health & Wellness' },
            { id: 'sec-p-upload', type: 'trust_badges', title: 'Upload Prescription Banner' },
            { id: 'sec-p-cat', type: 'category_grid', title: 'Shop by Concern' },
            { id: 'sec-p-season', type: 'product_carousel', title: 'Seasonal Care' },
          ];
        } else if (mod === 'doctor') {
          sections = [
            { id: 'sec-d-hero', type: 'hero_slider', title: 'Find a Doctor' },
            { id: 'sec-d-spec', type: 'category_grid', title: 'Top Specialties' },
            { id: 'sec-d-hosp', type: 'brand_promo', title: 'Featured Hospitals' },
          ];
        } else if (mod === 'taxi') {
          sections = [
            { id: 'sec-t-hero', type: 'hero_slider', title: 'Book a Ride' },
            { id: 'sec-t-types', type: 'category_grid', title: 'Ride Options' },
            { id: 'sec-t-trust', type: 'trust_badges', title: 'Safety Features' },
          ];
        } else if (mod === 'hotel') {
          sections = [
            { id: 'sec-h-hero', type: 'hero_slider', title: 'Book Your Stay' },
            { id: 'sec-h-dest', type: 'category_grid', title: 'Top Destinations' },
            { id: 'sec-h-hotels', type: 'product_carousel', title: 'Featured Hotels' },
          ];
        }
      }
      return { moduleName, pageName, sections };
    }
    return layout;
  }

  @Put(':moduleName/:pageName')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.manage')
  @ApiOperation({ summary: 'Save page layout configuration' })
  async saveLayout(
    @Req() req: any,
    @Param('moduleName') moduleName: string,
    @Param('pageName') pageName: string,
    @Body() dto: SaveLayoutDto,
  ) {
    // `page_layouts` is keyed `(moduleName, pageName)` and has no market
    // column, so one row IS every market's homepage. Until it gains one, a
    // locked admin is refused rather than allowed to rewrite Qatar's homepage
    // and India's with the same request (audit V16 / I10).
    //
    // Marketplace's own `/admin/marketplace/page-layout` is scoped with a
    // gateway-forced country against a different store — the two are
    // deliberately left as two stores here, and reconciling them is a MODULES
    // task with a migration, not a scope fix.
    refuseLockedAdmin(req, 'page layouts');
    // `page_layouts.sections` is `jsonb`/`any[]` in the entity; the DTO's
    // `sections` is validated as either an array of page-builder sections or
    // a per-country content map (the taxi landing editor — review C1), so the
    // column's looser type is the honest one to store either shape under.
    const sections = dto.sections as unknown as any[];
    let layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
    if (!layout) layout = this.layoutRepo.create({ moduleName, pageName, sections });
    else layout.sections = sections;
    return this.layoutRepo.save(layout);
  }
}
