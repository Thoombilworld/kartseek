/**
 * KARTSEEK — Dynamic Recommendation Service
 *
 * Core recommendation engine that:
 *  1. Tracks user activity events and builds per-user affinity profiles in Redis
 *  2. Computes module-specific recommendations using scoring algorithms
 *  3. Provides cross-module recommendations based on behavioral signals
 *  4. Maintains trending item lists per region
 *
 * Scoring approach:
 *  - Recency decay: exponential decay with 7-day half-life
 *  - Frequency boost: repeated category/entity interactions increase score
 *  - Cross-module signals: grocery→restaurant cuisine affinity, doctor→pharmacy
 *  - Collaborative filtering: "users who X also Y" via Redis sorted sets
 *  - Regional popularity: trending items in the user's region
 */
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import {
  type UserActivityEvent,
  type UserRecommendationProfile,
  type Recommendation,
  type RecommendationSet,
  type RecommendationModule,
  type RecommendationReason,
  type CachedEntityMetadata,
  ACTION_WEIGHT,
  ALL_RECOMMENDATION_MODULES,
} from './recommendation.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const PROFILE_KEY_PREFIX = 'reco:profile:';
const ENTITY_CACHE_PREFIX = 'reco:entity:';
const TRENDING_KEY_PREFIX = 'reco:trending:';
const COLLAB_KEY_PREFIX = 'reco:collab:';
const RECENT_VIEWS_PREFIX = 'reco:recent:';
const PROFILE_TTL = 60 * 60 * 24 * 30;   // 30 days
const ENTITY_TTL = 60 * 60 * 24 * 7;     // 7 days
const TRENDING_TTL = 60 * 60;            // 1 hour
const HALF_LIFE_DAYS = 7;
const MAX_RECOMMENDATIONS = 20;
const MAX_RECENT_ENTITIES = 50;
const MAX_SEARCH_HISTORY = 20;
const MAX_ORDER_HISTORY = 100;

// ─── Cross-module affinity map ──────────────────────────────────────────────
// If user is active in module A, boost these modules
const CROSS_MODULE_AFFINITY: Record<RecommendationModule, Partial<Record<RecommendationModule, number>>> = {
  marketplace: { grocery: 0.2, pharmacy: 0.1 },
  grocery: { restaurant: 0.3, marketplace: 0.15 },
  restaurant: { grocery: 0.25, hotel: 0.1 },
  pharmacy: { doctor: 0.4, grocery: 0.1 },
  hotel: { restaurant: 0.3, marketplace: 0.1 },
  doctor: { pharmacy: 0.5, hotel: 0.05 },
};

// ─── Reason labels ──────────────────────────────────────────────────────────
const REASON_LABELS: Record<RecommendationReason, string> = {
  recently_viewed: 'Based on your recent browsing',
  order_history: 'Based on your past orders',
  trending: 'Trending now',
  popular_in_region: 'Popular in your area',
  similar_users: 'People like you also liked',
  cross_module: 'You might also like',
  reorder: 'Order again',
  search_based: 'Based on your searches',
  category_affinity: 'Because you like {category}',
  new_arrival: 'New arrival',
};

@Injectable()
export class RecommendationService implements OnModuleInit {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async onModuleInit() {
    this.logger.log('🧠 Recommendation engine initialized');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Activity Tracking
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process a user activity event: update profile, update trending, update collab.
   * This is the main entry point for the tracking pipeline.
   */
  async trackActivity(event: UserActivityEvent): Promise<void> {
    try {
      const { userId, module, action, entityId, category } = event;

      // 1. Update user profile
      await this.updateUserProfile(event);

      // 2. Update trending counters (fire-and-forget)
      if (entityId) {
        const region = event.region || 'GLOBAL';
        const trendingKey = `${TRENDING_KEY_PREFIX}${module}:${region}`;
        await this.redis.zincrby(trendingKey, ACTION_WEIGHT[action] || 0.1, entityId);
        await this.redis.expire(trendingKey, TRENDING_TTL);
      }

      // 3. Update collaborative filtering signals
      if (entityId && (action === 'order' || action === 'book' || action === 'add_to_cart')) {
        await this.updateCollaborativeSignals(userId, module, entityId, category);
      }

      // 4. Cache entity metadata if provided
      if (entityId && event.metadata?.title) {
        await this.cacheEntityMetadata({
          entityId,
          module,
          entityType: event.entityType,
          title: event.metadata.title,
          subtitle: event.metadata.subtitle,
          imageUrl: event.metadata.imageUrl,
          category,
          price: event.metadata.price,
          rating: event.metadata.rating,
          region: event.region,
          updatedAt: new Date().toISOString(),
        });
      }

      // 5. Publish to Kafka (async, for downstream consumers)
      this.kafka.emit(KAFKA_TOPICS.USER_ACTIVITY_TRACKED, {
        key: userId,
        value: event,
      });

    } catch (err) {
      this.logger.warn(`Activity tracking error: ${(err as Error).message}`);
      // Non-critical — don't break the request
    }
  }

  /**
   * Update the user's recommendation profile in Redis.
   */
  private async updateUserProfile(event: UserActivityEvent): Promise<void> {
    const profileKey = `${PROFILE_KEY_PREFIX}${event.userId}`;
    const existing = await this.redis.get(profileKey);
    const profile: UserRecommendationProfile = existing
      ? JSON.parse(existing)
      : this.createEmptyProfile(event.userId);

    const weight = ACTION_WEIGHT[event.action] || 0.1;
    const now = new Date().toISOString();

    // Update module scores
    profile.moduleScores[event.module] = Math.min(
      1,
      (profile.moduleScores[event.module] || 0) + weight * 0.1,
    );

    // Update category scores
    if (event.category) {
      profile.categoryScores[event.category] = Math.min(
        1,
        (profile.categoryScores[event.category] || 0) + weight * 0.15,
      );
    }

    // Update price range
    if (event.metadata?.price && typeof event.metadata.price === 'number') {
      const p = event.metadata.price;
      if (!profile.priceRange.min || p < profile.priceRange.min) profile.priceRange.min = p;
      if (!profile.priceRange.max || p > profile.priceRange.max) profile.priceRange.max = p;
      profile.priceRange.avg = (profile.priceRange.avg + p) / 2;
    }

    // Update recent entities
    if (event.entityId) {
      profile.recentEntities = [
        { module: event.module, entityId: event.entityId, at: now },
        ...profile.recentEntities.filter((e) => e.entityId !== event.entityId),
      ].slice(0, MAX_RECENT_ENTITIES);
    }

    // Update search history
    if (event.action === 'search' && event.metadata?.query) {
      profile.searchHistory = [
        { query: event.metadata.query, module: event.module, at: now },
        ...profile.searchHistory,
      ].slice(0, MAX_SEARCH_HISTORY);
    }

    // Update order history
    if (event.action === 'order' || event.action === 'book') {
      profile.orderHistory = [
        { module: event.module, entityId: event.entityId || '', category: event.category, at: now },
        ...profile.orderHistory,
      ].slice(0, MAX_ORDER_HISTORY);
    }

    // Update last active
    profile.lastActive[event.module] = now;
    profile.region = event.region || profile.region;
    profile.updatedAt = now;

    await this.redis.set(profileKey, JSON.stringify(profile), PROFILE_TTL);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Recommendation Generation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate module-specific recommendations for a user.
   */
  async getRecommendations(
    userId: string,
    module: RecommendationModule,
    limit = 10,
  ): Promise<RecommendationSet> {
    const profile = await this.getUserProfile(userId);
    const region = profile?.region || 'GLOBAL';

    const [forYou, trending, crossModule] = await Promise.all([
      this.computeForYouRecommendations(profile, module, limit),
      this.getTrendingRecommendations(module, region, limit),
      this.getCrossModuleRecommendations(profile, module, Math.min(limit, 6)),
    ]);

    const result: RecommendationSet = {
      module,
      forYou,
      trending,
      crossModule,
      generatedAt: new Date().toISOString(),
    };

    return result;
  }

  /**
   * Compute "For You" recommendations based on user profile.
   */
  private async computeForYouRecommendations(
    profile: UserRecommendationProfile | null,
    module: RecommendationModule,
    limit: number,
  ): Promise<Recommendation[]> {
    if (!profile) return [];

    const recommendations: Recommendation[] = [];
    const seen = new Set<string>();

    // 1. Reorder suggestions (highest priority for grocery, pharmacy)
    if (['grocery', 'pharmacy', 'restaurant'].includes(module)) {
      const reorderCandidates = profile.orderHistory
        .filter((o) => o.module === module && o.entityId)
        .slice(0, 5);

      for (const candidate of reorderCandidates) {
        if (seen.has(candidate.entityId)) continue;
        seen.add(candidate.entityId);

        const metadata = await this.getEntityMetadata(candidate.entityId, module);
        if (!metadata) continue;

        recommendations.push({
          id: `reco-reorder-${candidate.entityId}`,
          module,
          entityType: metadata.entityType,
          entityId: candidate.entityId,
          title: metadata.title,
          subtitle: metadata.subtitle,
          imageUrl: metadata.imageUrl,
          score: this.computeRecencyScore(candidate.at) * 0.9,
          reason: 'reorder',
          reasonLabel: REASON_LABELS.reorder,
          metadata: { price: metadata.price, rating: metadata.rating },
        });
      }
    }

    // 2. Category-based recommendations
    const topCategories = Object.entries(profile.categoryScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    for (const category of topCategories) {
      // Get entities from this category via trending
      const region = profile.region || 'GLOBAL';
      const trendingKey = `${TRENDING_KEY_PREFIX}${module}:${region}`;
      const trendingIds = await this.redis.zrevrange(trendingKey, 0, 4);

      for (const entityId of trendingIds) {
        if (seen.has(entityId)) continue;
        const metadata = await this.getEntityMetadata(entityId, module);
        if (!metadata || metadata.category !== category) continue;
        seen.add(entityId);

        recommendations.push({
          id: `reco-cat-${entityId}`,
          module,
          entityType: metadata.entityType,
          entityId,
          title: metadata.title,
          subtitle: metadata.subtitle,
          imageUrl: metadata.imageUrl,
          score: (profile.categoryScores[category] || 0) * 0.7,
          reason: 'category_affinity',
          reasonLabel: REASON_LABELS.category_affinity.replace('{category}', category),
          metadata: { price: metadata.price, rating: metadata.rating, category },
        });
      }
    }

    // 3. Recently viewed (lower priority — things they haven't ordered yet)
    const recentNotOrdered = profile.recentEntities
      .filter((e) => e.module === module)
      .filter((e) => !profile.orderHistory.some((o) => o.entityId === e.entityId))
      .slice(0, 5);

    for (const recent of recentNotOrdered) {
      if (seen.has(recent.entityId)) continue;
      seen.add(recent.entityId);

      const metadata = await this.getEntityMetadata(recent.entityId, module);
      if (!metadata) continue;

      recommendations.push({
        id: `reco-recent-${recent.entityId}`,
        module,
        entityType: metadata.entityType,
        entityId: recent.entityId,
        title: metadata.title,
        subtitle: metadata.subtitle,
        imageUrl: metadata.imageUrl,
        score: this.computeRecencyScore(recent.at) * 0.5,
        reason: 'recently_viewed',
        reasonLabel: REASON_LABELS.recently_viewed,
        metadata: { price: metadata.price, rating: metadata.rating },
      });
    }

    // 4. Collaborative filtering
    const collabIds = await this.getCollaborativeRecommendations(profile.userId, module, 5);
    for (const entityId of collabIds) {
      if (seen.has(entityId)) continue;
      seen.add(entityId);

      const metadata = await this.getEntityMetadata(entityId, module);
      if (!metadata) continue;

      recommendations.push({
        id: `reco-collab-${entityId}`,
        module,
        entityType: metadata.entityType,
        entityId,
        title: metadata.title,
        subtitle: metadata.subtitle,
        imageUrl: metadata.imageUrl,
        score: 0.4,
        reason: 'similar_users',
        reasonLabel: REASON_LABELS.similar_users,
        metadata: { price: metadata.price, rating: metadata.rating },
      });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get trending items for a module + region.
   */
  async getTrendingRecommendations(
    module: RecommendationModule,
    region: string,
    limit: number,
  ): Promise<Recommendation[]> {
    const trendingKey = `${TRENDING_KEY_PREFIX}${module}:${region}`;
    const globalKey = `${TRENDING_KEY_PREFIX}${module}:GLOBAL`;

    // Try region-specific first, fallback to global
    let trendingIds = await this.redis.zrevrange(trendingKey, 0, limit - 1);
    if (!trendingIds || trendingIds.length === 0) {
      trendingIds = await this.redis.zrevrange(globalKey, 0, limit - 1);
    }

    const recommendations: Recommendation[] = [];
    for (const entityId of trendingIds || []) {
      const metadata = await this.getEntityMetadata(entityId, module);
      if (!metadata) continue;

      const score = await this.redis.zscore(trendingKey, entityId);

      recommendations.push({
        id: `reco-trend-${entityId}`,
        module,
        entityType: metadata.entityType,
        entityId,
        title: metadata.title,
        subtitle: metadata.subtitle,
        imageUrl: metadata.imageUrl,
        score: Math.min(1, (parseFloat(score || '0') / 100)),
        reason: 'trending',
        reasonLabel: REASON_LABELS.trending,
        metadata: { price: metadata.price, rating: metadata.rating },
      });
    }

    return recommendations;
  }

  /**
   * Cross-module recommendations: suggest items from modules the user hasn't explored.
   */
  async getCrossModuleRecommendations(
    profile: UserRecommendationProfile | null,
    currentModule: RecommendationModule,
    limit: number,
  ): Promise<Recommendation[]> {
    if (!profile) return [];

    const affinities = CROSS_MODULE_AFFINITY[currentModule] || {};
    const recommendations: Recommendation[] = [];
    const region = profile.region || 'GLOBAL';

    for (const [targetModule, affinityScore] of Object.entries(affinities)) {
      const mod = targetModule as RecommendationModule;
      const trending = await this.getTrendingRecommendations(mod, region, 3);

      for (const item of trending) {
        recommendations.push({
          ...item,
          id: `reco-cross-${item.entityId}`,
          score: (item.score * (affinityScore as number)) + (profile.moduleScores[mod] || 0) * 0.1,
          reason: 'cross_module',
          reasonLabel: REASON_LABELS.cross_module,
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async getUserProfile(userId: string): Promise<UserRecommendationProfile | null> {
    const data = await this.redis.get(`${PROFILE_KEY_PREFIX}${userId}`);
    return data ? JSON.parse(data) : null;
  }

  private createEmptyProfile(userId: string): UserRecommendationProfile {
    return {
      userId,
      categoryScores: {},
      moduleScores: {},
      priceRange: { min: 0, max: 0, avg: 0 },
      recentEntities: [],
      searchHistory: [],
      orderHistory: [],
      lastActive: {},
      updatedAt: new Date().toISOString(),
    };
  }

  private computeRecencyScore(isoDate: string): number {
    const daysSince = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-0.693 * daysSince / HALF_LIFE_DAYS); // ln(2) ≈ 0.693
  }

  async cacheEntityMetadata(entity: CachedEntityMetadata): Promise<void> {
    const key = `${ENTITY_CACHE_PREFIX}${entity.module}:${entity.entityId}`;
    await this.redis.set(key, JSON.stringify(entity), ENTITY_TTL);
  }

  async getEntityMetadata(entityId: string, module: RecommendationModule): Promise<CachedEntityMetadata | null> {
    const key = `${ENTITY_CACHE_PREFIX}${module}:${entityId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async updateCollaborativeSignals(
    userId: string,
    module: RecommendationModule,
    entityId: string,
    category?: string,
  ): Promise<void> {
    // "Users who interacted with entityId also interacted with..."
    const userEntitiesKey = `${COLLAB_KEY_PREFIX}user:${userId}:${module}`;
    const existingEntities = await this.redis.smembers(userEntitiesKey);

    // For each entity this user previously interacted with, boost co-occurrence
    for (const prevEntityId of existingEntities?.slice(0, 20) || []) {
      if (prevEntityId === entityId) continue;
      const coKey = `${COLLAB_KEY_PREFIX}co:${module}:${prevEntityId}`;
      await this.redis.zincrby(coKey, 1, entityId);
      await this.redis.expire(coKey, PROFILE_TTL);

      const reverseCoKey = `${COLLAB_KEY_PREFIX}co:${module}:${entityId}`;
      await this.redis.zincrby(reverseCoKey, 1, prevEntityId);
      await this.redis.expire(reverseCoKey, PROFILE_TTL);
    }

    // Add current entity to user's set
    await this.redis.sadd(userEntitiesKey, entityId);
    await this.redis.expire(userEntitiesKey, PROFILE_TTL);
  }

  private async getCollaborativeRecommendations(
    userId: string,
    module: RecommendationModule,
    limit: number,
  ): Promise<string[]> {
    // Get user's recent interactions
    const userEntitiesKey = `${COLLAB_KEY_PREFIX}user:${userId}:${module}`;
    const userEntities = await this.redis.smembers(userEntitiesKey);

    if (!userEntities || userEntities.length === 0) return [];

    // Aggregate co-occurrence scores
    const scores = new Map<string, number>();
    const userEntitySet = new Set(userEntities);

    for (const entityId of userEntities.slice(0, 10)) {
      const coKey = `${COLLAB_KEY_PREFIX}co:${module}:${entityId}`;
      const coEntities = await this.redis.zrevrange(coKey, 0, 4);

      for (const coEntityId of coEntities || []) {
        if (userEntitySet.has(coEntityId)) continue; // Skip already interacted
        const score = await this.redis.zscore(coKey, coEntityId);
        scores.set(coEntityId, (scores.get(coEntityId) || 0) + parseFloat(score || '0'));
      }
    }

    return [...scores.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);
  }

  /**
   * Track a recommendation click (feedback loop for ranking improvement).
   */
  async trackRecommendationClick(
    userId: string,
    recommendationId: string,
    module: RecommendationModule,
    entityId: string,
    position: number,
  ): Promise<void> {
    await this.trackActivity({
      userId,
      module,
      action: 'click_recommendation',
      entityType: 'recommendation',
      entityId,
      metadata: { recommendationId, position },
      timestamp: new Date().toISOString(),
    });
  }
}
