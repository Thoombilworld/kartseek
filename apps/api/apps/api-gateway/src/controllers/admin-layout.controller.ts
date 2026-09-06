import { Controller, Get, Put, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageLayout } from '../entities';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';

@ApiTags('Admin Layouts')
@Controller('admin/layouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminLayoutController {
  constructor(
    @InjectRepository(PageLayout) private readonly layoutRepo: Repository<PageLayout>
  ) {}

  @Get(':moduleName/:pageName')
  @ApiOperation({ summary: 'Get page layout configuration' })
  async getLayout(@Param('moduleName') moduleName: string, @Param('pageName') pageName: string) {
    const layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
    if (!layout) {
      const mod = moduleName.toLowerCase();
      let sections : unknown[] = [];
      if (pageName.toLowerCase() === 'homepage') {
        if (mod === 'marketplace') {
          sections = [
            { id: 'sec-hero', type: 'hero_slider', title: 'Main Hero Slider' },
            { id: 'sec-trust', type: 'trust_badges', title: 'Trust Badges' },
            { id: 'sec-shop', type: 'category_grid', title: 'Shop by Category' },
            { id: 'sec-flash', type: 'flash_deals', title: 'Flash Deals' },
            { id: 'sec-elec', type: 'product_carousel', title: 'Best of Electronics' },
            { id: 'sec-elec-brands', type: 'brand_promo', title: 'Top Electronics Brands' }
          ];
        } else if (mod === 'grocery') {
          sections = [
            { id: 'sec-g-hero', type: 'hero_slider', title: 'Grocery Offers' },
            { id: 'sec-g-cat', type: 'category_grid', title: 'Shop by Category' },
            { id: 'sec-g-fresh', type: 'product_carousel', title: 'Fresh Produce' },
            { id: 'sec-g-deals', type: 'flash_deals', title: 'Daily Essentials Deals' }
          ];
        } else if (mod === 'pharmacy') {
          sections = [
            { id: 'sec-p-hero', type: 'hero_slider', title: 'Health & Wellness' },
            { id: 'sec-p-upload', type: 'trust_badges', title: 'Upload Prescription Banner' },
            { id: 'sec-p-cat', type: 'category_grid', title: 'Shop by Concern' },
            { id: 'sec-p-season', type: 'product_carousel', title: 'Seasonal Care' }
          ];
        } else if (mod === 'doctor') {
          sections = [
            { id: 'sec-d-hero', type: 'hero_slider', title: 'Find a Doctor' },
            { id: 'sec-d-spec', type: 'category_grid', title: 'Top Specialties' },
            { id: 'sec-d-hosp', type: 'brand_promo', title: 'Featured Hospitals' }
          ];
        } else if (mod === 'taxi') {
          sections = [
            { id: 'sec-t-hero', type: 'hero_slider', title: 'Book a Ride' },
            { id: 'sec-t-types', type: 'category_grid', title: 'Ride Options' },
            { id: 'sec-t-trust', type: 'trust_badges', title: 'Safety Features' }
          ];
        } else if (mod === 'hotel') {
          sections = [
            { id: 'sec-h-hero', type: 'hero_slider', title: 'Book Your Stay' },
            { id: 'sec-h-dest', type: 'category_grid', title: 'Top Destinations' },
            { id: 'sec-h-hotels', type: 'product_carousel', title: 'Featured Hotels' }
          ];
        }
      }
      return { moduleName, pageName, sections };
    }
    return layout;
  }

  @Put(':moduleName/:pageName')
  @ApiOperation({ summary: 'Save page layout configuration' })
  async saveLayout(@Param('moduleName') moduleName: string, @Param('pageName') pageName: string, @Req() req: any) {
    let layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
    const sections = req.body?.sections || [];
    
    if (!layout) {
      layout = this.layoutRepo.create({ moduleName, pageName, sections });
    } else {
      layout.sections = sections;
    }
    return await this.layoutRepo.save(layout);
  }
}
