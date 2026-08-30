import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { BrandFollow } from '../entities/brand-follow.entity';
import { BrandUpdate } from '../entities/brand-update.entity';
import { Brand } from '../entities/brand.entity';

@Injectable()
export class BrandFollowService {
  private readonly logger = new Logger(BrandFollowService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(BrandFollow) private readonly followRepo: Repository<BrandFollow>,
    @InjectRepository(BrandUpdate) private readonly updateRepo: Repository<BrandUpdate>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
  ) {}

  // ── Follow / Unfollow ────────────────────────────────────────────────────────

  async followBrand(userId: string, brandId: string) {
    // Check if already following
    const existing = await this.followRepo.findOne({
      where: { userId, brandId },
    });
    if (existing) return { success: true, message: 'Already following this brand', followId: existing.id };

    const follow = this.followRepo.create({ userId, brandId });
    const saved = await this.followRepo.save(follow);

    // Increment denormalized follower count
    await this.brandRepo.increment({ id: brandId }, 'followerCount', 1);

    // Invalidate caches
    await this.invalidateCaches(userId, brandId);

    await this.kafka.publish('brand.followed', { userId, brandId });
    this.logger.log(`Brand follow: user ${userId} followed brand ${brandId}`);
    return { success: true, followId: saved.id };
  }

  async unfollowBrand(userId: string, brandId: string) {
    const result = await this.followRepo.delete({ userId, brandId });

    if (result.affected === 0) {
      return { success: false, reason: 'Not following this brand' };
    }

    // Decrement denormalized follower count (ensure it doesn't go negative)
    await this.brandRepo
      .createQueryBuilder()
      .update(Brand)
      .set({ followerCount: () => 'GREATEST("followerCount" - 1, 0)' })
      .where('id = :brandId', { brandId })
      .execute();

    // Invalidate caches
    await this.invalidateCaches(userId, brandId);

    await this.kafka.publish('brand.unfollowed', { userId, brandId });
    this.logger.log(`Brand unfollow: user ${userId} unfollowed brand ${brandId}`);
    return { success: true, unfollowed: brandId };
  }

  // ── Query ────────────────────────────────────────────────────────────────────

  async isFollowing(userId: string, brandId: string) {
    const exists = await this.followRepo.findOne({
      where: { userId, brandId },
    });
    return { isFollowing: !!exists };
  }

  async getFollowerCount(brandId: string) {
    const cacheKey = `brand:followers:count:${brandId}`;
    const cached = await this.redis.getJson<number>(cacheKey);
    if (cached !== null && cached !== undefined) return { brandId, count: cached };

    const brand = await this.brandRepo.findOne({ where: { id: brandId }, select: ['id', 'followerCount'] });
    const count = brand?.followerCount ?? 0;

    await this.redis.setJson(cacheKey, count, 300); // 5 min cache
    return { brandId, count };
  }

  async getFollowedBrands(userId: string, page = 1, limit = 20) {
    const cacheKey = `brand:followed:${userId}`;
    if (page === 1) {
      const cached = await this.redis.getJson<any>(cacheKey);
      if (cached) return cached;
    }

    const [follows, total] = await this.followRepo.findAndCount({
      where: { userId },
      relations: { brand: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = follows.map(f => ({
      followId: f.id,
      followedAt: f.createdAt,
      brand: f.brand,
    }));

    const result = { userId, data, total, page, limit, hasMore: total > page * limit };

    if (page === 1) {
      await this.redis.setJson(cacheKey, result, 120);
    }

    return result;
  }

  // ── Brand Updates Feed ───────────────────────────────────────────────────────

  async getBrandFeed(userId: string, page = 1, limit = 20, type?: string) {
    // Get all brand IDs the user follows
    const follows = await this.followRepo.find({
      where: { userId },
      select: ['brandId'],
    });

    if (follows.length === 0) {
      return { userId, data: [] as unknown[], total: 0, page, limit, hasMore: false, message: 'Follow brands to see their updates here' };
    }

    const brandIds = follows.map(f => f.brandId);

    const qb = this.updateRepo
      .createQueryBuilder('update')
      .leftJoinAndSelect('update.brand', 'brand')
      .where('update.brandId IN (:...brandIds)', { brandIds })
      .orderBy('update.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      qb.andWhere('update.type = :type', { type });
    }

    const [updates, total] = await qb.getManyAndCount();

    return { userId, data: updates, total, page, limit, hasMore: total > page * limit };
  }

  // ── Brand Update Management (Seller/Admin) ──────────────────────────────────

  async createBrandUpdate(brandId: string, data: { type: string; title: string; message: string; imageUrl?: string; actionUrl?: string; productId?: string }) {
    const update = this.updateRepo.create({ brandId, ...data });
    const saved = await this.updateRepo.save(update);

    await this.kafka.publish('brand.update.created', { brandId, updateId: saved.id, type: data.type });
    this.logger.log(`Brand update created: ${data.type} for brand ${brandId}`);
    return { success: true, update: saved };
  }

  async getBrandUpdates(brandId: string, page = 1, limit = 10) {
    const [updates, total] = await this.updateRepo.findAndCount({
      where: { brandId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { brandId, data: updates, total, page, limit, hasMore: total > page * limit };
  }

  // ── Cache Helpers ────────────────────────────────────────────────────────────

  private async invalidateCaches(userId: string, brandId: string) {
    await Promise.all([
      this.redis.del(`brand:followed:${userId}`),
      this.redis.del(`brand:followers:count:${brandId}`),
    ]);
  }
}
