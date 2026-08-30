/**
 * KARTSEEK — Recommendation REST Controller
 *
 * Provides REST API endpoints for recommendation retrieval and manual tracking.
 * Used for:
 *  - Initial page load (before WebSocket connects)
 *  - Fallback when WebSocket is unavailable
 *  - Manual client-side event tracking
 *  - Recommendation click feedback
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { Public } from '../decorators/public.decorator';
import { RecommendationService } from '../services/recommendation.service';
import {
  RecommendationModule,
  RecommendationSet,
  ALL_RECOMMENDATION_MODULES,
} from '../services/recommendation.types';

@ApiTags('🧠 Recommendations')
@ApiBearerAuth('JWT')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(private readonly recommendationService: RecommendationService) {}

  // ─── Module-Specific Recommendations ────────────────────────────────────────

  // ── Literal routes, declared before the `:slug` catch-all ──────────────
  //
  // Nest matches routes in declaration order. These sat *after* `@Get(':slug')`,
  // so /restaurants/favorites, /cart, /addresses, /gift-cards, /my-reservations
  // and /subscriptions were all captured as a slug and reached Postgres as a
  // uuid lookup -- `invalid input syntax for type uuid: "favorites"`. Every one
  // of these customer routes was a 500, hidden as an empty 200 by the old
  // gateway fallback. Keep literal paths above parameterised ones.

  @Get('cross-module')
  @ApiOperation({ summary: 'Get cross-module recommendation picks' })
  @ApiQuery({ name: 'current', required: false, enum: ALL_RECOMMENDATION_MODULES })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCrossModuleRecommendations(
    @Query('current') currentModule = 'marketplace',
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) return [];

    const profile = await this.recommendationService.getUserProfile(userId);
    return this.recommendationService.getCrossModuleRecommendations(
      profile,
      currentModule as RecommendationModule,
      parseInt(limit || '6', 10),
    );
  }

  // ─── Trending (Public — no auth required) ─────────────────────────────────

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Recommendation engine health check' })
  health() {
    return { status: 'ok', engine: 'recommendation', timestamp: new Date().toISOString() };
  }

  private emptySet(module: RecommendationModule): RecommendationSet {
    return {
      module,
      forYou: [],
      trending: [],
      crossModule: [],
      generatedAt: new Date().toISOString(),
    };
  }

  @Get(':module')
  @ApiOperation({ summary: 'Get module-specific recommendations' })
  @ApiParam({ name: 'module', enum: ALL_RECOMMENDATION_MODULES })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getModuleRecommendations(
    @Param('module') module: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ): Promise<RecommendationSet> {
    const userId = req?.user?.id;
    if (!userId) {
      return this.emptySet(module as RecommendationModule);
    }

    if (!ALL_RECOMMENDATION_MODULES.includes(module as RecommendationModule)) {
      return this.emptySet('marketplace');
    }

    return this.recommendationService.getRecommendations(
      userId,
      module as RecommendationModule,
      parseInt(limit || '10', 10),
    );
  }

  // ─── Cross-Module Recommendations ──────────────────────────────────────────

  @Get('trending/:module')
  @Public()
  @ApiOperation({ summary: 'Get trending items for a module (public)' })
  @ApiParam({ name: 'module', enum: ALL_RECOMMENDATION_MODULES })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTrending(
    @Param('module') module: string,
    @Query('region') region = 'GLOBAL',
    @Query('limit') limit?: string,
  ) {
    if (!ALL_RECOMMENDATION_MODULES.includes(module as RecommendationModule)) {
      return [];
    }
    return this.recommendationService.getTrendingRecommendations(
      module as RecommendationModule,
      region,
      parseInt(limit || '10', 10),
    );
  }

  // ─── Manual Activity Tracking ──────────────────────────────────────────────

  @Post('track')
  @ApiOperation({ summary: 'Track client-side user activity (scroll, time-on-page)' })
  async trackActivity(
    @Body() body: {
      module: RecommendationModule;
      action: string;
      entityType: string;
      entityId?: string;
      category?: string;
      metadata?: Record<string, any>;
    },
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) return { tracked: false };

    await this.recommendationService.trackActivity({
      userId,
      module: body.module,
      action: body.action as any,
      entityType: body.entityType,
      entityId: body.entityId,
      category: body.category,
      metadata: body.metadata || {},
      timestamp: new Date().toISOString(),
      region: req?.headers?.['x-region'],
    });

    return { tracked: true };
  }

  // ─── Recommendation Click Feedback ─────────────────────────────────────────

  @Post(':id/click')
  @ApiOperation({ summary: 'Track recommendation click (ranking feedback)' })
  async trackClick(
    @Param('id') recommendationId: string,
    @Body() body: {
      module: RecommendationModule;
      entityId: string;
      position: number;
    },
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) return { tracked: false };

    await this.recommendationService.trackRecommendationClick(
      userId,
      recommendationId,
      body.module,
      body.entityId,
      body.position,
    );

    return { tracked: true };
  }
}
