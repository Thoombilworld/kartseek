import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { catalogKeys } from './catalog-cache';

/** Regions whose home feed is cached separately. */
const CACHED_REGIONS = [
  'global',
  'IN',
  'AE',
  'SA',
  'QA',
  'BH',
  'GB',
  'KW',
  'OM',
  'US',
  'SG',
] as const;

/** Banner as stored — `regions` is what scopes it to a market. */
export interface StoredBanner {
  id: string;
  /**
   * Markets this banner runs in. Empty or absent means every market, which is
   * what all pre-existing banners are treated as.
   */
  regions?: string[];
  /** ISO timestamps bounding the campaign, both optional. */
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

/**
 * MarketplaceHomeCacheService — Redis-backed home banners and home-feed cache.
 *
 * Extracted from MarketplaceService because it is the one piece of state shared
 * between the storefront read path (which composes the home feed) and the admin
 * path (which edits banners and must invalidate it). Keeping it in one place means
 * there is a single definition of "the home cache" and a single invalidation rule,
 * rather than the admin service reaching back into the storefront service.
 *
 * Backed entirely by Redis — these banners have no table.
 */
@Injectable()
export class MarketplaceHomeCacheService {
  private readonly logger = new Logger(MarketplaceHomeCacheService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  /**
   * Banners of a type, optionally narrowed to one market.
   *
   * A promotional banner is a commercial commitment in a specific market — a
   * Qatari Eid campaign priced in riyals has no meaning on the Indian
   * storefront, and running it there advertises an offer that cannot be
   * honoured. Passing a region returns only banners scoped to it plus the
   * global ones; omitting it returns everything (the admin editor's view).
   */
  async getBanners(type: string, region?: string): Promise<StoredBanner[]> {
    const all = (await this.redis.getJson<StoredBanner[]>(`marketplace:${type}-banners`)) || [];
    const live = region ? all.filter((b) => this.isLiveInRegion(b, region)) : all;
    // Region filtering decides *whether* a banner should run; this decides
    // whether there is anything to run. See `hasRenderableContent`.
    return live.filter((b) => MarketplaceHomeCacheService.hasRenderableContent(b));
  }

  async getCountryBanners(region?: string): Promise<StoredBanner[]> {
    const all = (await this.redis.getJson<StoredBanner[]>('marketplace:country-banners')) || [];
    const live = region ? all.filter((b) => this.isLiveInRegion(b, region)) : all;
    return live.filter((b) => MarketplaceHomeCacheService.hasRenderableContent(b));
  }

  /**
   * Whether a stored banner has anything a storefront could actually draw.
   *
   * The hero carousel takes the feed's banners whenever the array is non-empty
   * and only falls back otherwise, so a single content-less row is enough to
   * replace the entire hero with blank slides — the most valuable space on the
   * page, above the fold. Two such rows were live: `{ id, createdAt }` and
   * nothing else, accepted by `createAdminBanner` because it validated nothing.
   *
   * Field names are checked in the same order the storefront reads them, so a
   * banner that passes here is one it can render.
   */
  static hasRenderableContent(banner: StoredBanner): boolean {
    const text = banner.headline ?? banner.title ?? banner.subtitle;
    const image = banner.imageUrl ?? banner.image ?? banner.bannerUrl;
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasImage = typeof image === 'string' && image.trim().length > 0;
    return hasText || hasImage;
  }

  /**
   * Whether a banner should render for a region right now.
   *
   * Explicitly inactive banners and expired campaigns are dropped here rather
   * than at render time, so a finished campaign cannot keep serving from a
   * warm home-feed cache.
   */
  private isLiveInRegion(banner: StoredBanner, region: string): boolean {
    if (banner.isActive === false) return false;

    const now = Date.now();
    if (banner.startsAt && Date.parse(banner.startsAt) > now) return false;
    if (banner.endsAt && Date.parse(banner.endsAt) < now) return false;

    // No region list means "everywhere" — the shape banners had before regional
    // targeting existed, so untargeted banners keep running unchanged.
    const regions = banner.regions;
    if (!Array.isArray(regions) || regions.length === 0) return true;

    return regions.map((r) => String(r).toUpperCase()).includes(region.toUpperCase());
  }

  async saveBanner(type: string, id: string, data: any) {
    const key = `marketplace:${type}-banners`;
    const existing: StoredBanner[] = (await this.redis.getJson(key)) || [];
    const idx = existing.findIndex((b: any) => b.id === id);
    const previous = idx >= 0 ? existing[idx]?.regions : undefined;
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...data, updatedAt: new Date().toISOString() };
    } else {
      existing.push({
        ...data,
        id: id || `${type}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }
    await this.redis.setJson(key, existing, 0);
    const regions = MarketplaceHomeCacheService.touchedMarkets(data?.regions, previous);
    await this.invalidateHomeCache(regions);
    // Consumers invalidate only the markets named; none means everywhere.
    await this.kafka.publish('marketplace.home.updated', {
      type,
      id,
      action: idx >= 0 ? 'updated' : 'created',
      regions,
    });
    return { success: true, id };
  }

  async deleteBanner(type: string, id: string) {
    const key = `marketplace:${type}-banners`;
    const existing: StoredBanner[] = (await this.redis.getJson(key)) || [];
    const target = existing.find((b: any) => b.id === id);
    await this.redis.setJson(
      key,
      existing.filter((b: any) => b.id !== id),
      0,
    );
    const regions = MarketplaceHomeCacheService.touchedMarkets(target?.regions, undefined);
    await this.invalidateHomeCache(regions);
    await this.kafka.publish('marketplace.home.updated', { type, id, action: 'deleted', regions });
    return { success: true, id };
  }

  /**
   * The markets a banner edit can have changed, or null for every market:
   * a banner that is or was untargeted ran everywhere.
   */
  private static touchedMarkets(next: unknown, previous: unknown): string[] | null {
    const nextList = Array.isArray(next) ? next : undefined;
    const prevList = Array.isArray(previous) ? previous : undefined;
    if (!nextList && !prevList) return null;
    if ((nextList && nextList.length === 0) || (prevList && prevList.length === 0)) return null;
    return [
      ...new Set([...(nextList ?? []), ...(prevList ?? [])].map((r) => String(r).toUpperCase())),
    ];
  }

  /**
   * Drop cached home feeds: the markets given plus the unscoped feed, or every
   * market when none are given. A Qatari banner edit used to empty India's
   * cache as well — a regional change acting as a global purge.
   */
  async invalidateHomeCache(regions?: string[] | null) {
    const targets: string[] =
      Array.isArray(regions) && regions.length
        ? ['global', ...regions.map((r) => String(r).toUpperCase())]
        : [...CACHED_REGIONS];
    await Promise.all(targets.map((r) => this.redis.del(catalogKeys.home(r))));
    this.logger.log(`Marketplace home cache invalidated: ${targets.join(', ')}`);
  }
}
