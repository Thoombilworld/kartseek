import { Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { RedisService } from '@app/redis';
import { currentRequestId } from '../transport/request-context';

/**
 * One naming scheme for every catalogue cache entry, and one place that knows
 * how to invalidate them.
 *
 * Keys used to be spelled at each call site — `products:<JSON>:1:48`,
 * `product:<id>:<market>`, `marketplace:featured:QA`, `search:QA:phones:1:20`
 * — which produced three concrete defects:
 *
 *   • the listing key serialised the filter object as it arrived, so the same
 *     query arrived at two keys depending on which caller built the object
 *     (`{country,category}` from the gateway, `{category,country}` from gRPC),
 *     and an invalidation had to scan for `products:*` to be sure of hitting
 *     both;
 *   • three different prefixes (`products:`, `product:`, `search:`) shared the
 *     keyspace with unrelated keys (`search:index:*` is the search index), so
 *     the invalidation had to carve exceptions out of a wildcard;
 *   • nothing invalidated the listing caches when a *seller* changed a price
 *     or stock — only the admin approval path did — so a shopper could see a
 *     card at one price and the detail page at another for up to two minutes.
 *
 * Every key now reads
 *
 *   marketplace:v2:<market>:<kind>[:<identity>]
 *
 * where `<market>` is the ISO code the response was composed for, or `global`
 * for market-independent reads (categories, brands). The market comes first so
 * a wildcard over one market never touches another, and so an operator can see
 * at a glance which store a key belongs to. Identity for a listing is a hash of
 * the *canonical* filter (sorted keys, blanks dropped), so the same query is
 * one key however it was built. The `v2` segment is the schema version: bump it
 * when the cached shape changes and every stale entry becomes unreachable at
 * once, with no flush.
 *
 * `marketplace:home:*` and `marketplace:*-banners` are deliberately outside
 * this scheme: the home feed is composed by `MarketplaceService` and the
 * banners are *content* the seed writes, not a cache. `invalidateListings`
 * still drops the home feed because its product rails are listings.
 */
export const CATALOG_CACHE_VERSION = 'v2';

const NS = `marketplace:${CATALOG_CACHE_VERSION}`;

/** Seconds. Chosen per kind, not one number for everything. */
export const CATALOG_TTL = {
  /** Semi-static: the tree changes when an admin edits it, and that path invalidates. */
  categories: 300,
  categoryAttributes: 300,
  brands: 300,
  verifiedSellers: 300,
  /** Listings carry prices and stock: short, and invalidated on every write that moves either. */
  products: 60,
  productDetail: 120,
  featured: 120,
  deals: 120,
  search: 30,
  /** Flash deals are clamped to the soonest window end, between these bounds. */
  flashDealsMin: 15,
  flashDealsMax: 300,
} as const;

/** The market segment of a key: the ISO code, or `global` for market-independent data. */
export function marketKey(market?: string | null): string {
  const code = typeof market === 'string' ? market.trim().toUpperCase() : '';
  return !code || code === 'GLOBAL' ? 'global' : code;
}

/**
 * A stable digest of a filter object.
 *
 * Keys are sorted and blank values dropped, so `{ country: 'QA', category: 'x' }`
 * and `{ category: 'x', country: 'QA', brand: undefined }` hash identically.
 * The market is passed separately and excluded here — it is the key's own
 * segment, not part of the identity hash.
 */
export function canonicalFilterHash(filter: Record<string, unknown> | undefined): string {
  const entries = Object.entries(filter ?? {})
    .filter(
      ([key, value]) => key !== 'country' && value !== undefined && value !== null && value !== '',
    )
    .map(([key, value]) => [key, typeof value === 'number' ? value : String(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return createHash('sha1').update(JSON.stringify(entries)).digest('hex').slice(0, 16);
}

/** A query string as search identity: trimmed, case-folded, hashed. */
function queryHash(query: string): string {
  return createHash('sha1').update(query.trim().toLowerCase()).digest('hex').slice(0, 16);
}

export const catalogKeys = {
  categories: () => `${NS}:global:categories`,
  categoryAttributes: (categoryId: string) => `${NS}:global:category-attributes:${categoryId}`,
  brands: () => `${NS}:global:brands`,
  topBrands: () => `${NS}:global:brands-top`,
  verifiedSellers: (market?: string) => `${NS}:${marketKey(market)}:verified-sellers`,
  products: (
    market: string | undefined,
    filter: Record<string, unknown> | undefined,
    page: number,
    limit: number,
  ) => `${NS}:${marketKey(market)}:products:${canonicalFilterHash(filter)}:p${page}:l${limit}`,
  product: (market: string | undefined, idOrSlug: string) =>
    `${NS}:${marketKey(market)}:product:${idOrSlug}`,
  featured: (market?: string) => `${NS}:${marketKey(market)}:featured`,
  deals: (market?: string) => `${NS}:${marketKey(market)}:deals`,
  flashDeals: (market?: string) => `${NS}:${marketKey(market)}:flash-deals`,
  search: (market: string | undefined, query: string, page: number, limit: number) =>
    `${NS}:${marketKey(market)}:search:${queryHash(query)}:p${page}:l${limit}`,
  /** The composed home feed — owned by MarketplaceService, listed here so invalidation can name it. */
  home: (market?: string) => `marketplace:home:${marketKey(market)}`,
};

/** Wildcards for invalidation. Every one is confined to this namespace. */
export const catalogPatterns = {
  /** Every market's copy of one product's detail, by id or by slug. */
  product: (idOrSlug: string) => `${NS}:*:product:${idOrSlug}`,
  allProducts: () => `${NS}:*:products:*`,
  allSearch: () => `${NS}:*:search:*`,
  allFeatured: () => `${NS}:*:featured`,
  allDeals: () => `${NS}:*:deals`,
  allFlashDeals: () => `${NS}:*:flash-deals`,
  allVerifiedSellers: () => `${NS}:*:verified-sellers`,
  allHome: () => `marketplace:home:*`,
  categoryAttributes: () => `${NS}:global:category-attributes:*`,
};

/**
 * The catalogue's cache, over the module's Redis.
 *
 * A plain class rather than an injectable, on purpose: every service that
 * needs it already holds `RedisService`, and threading one more constructor
 * dependency through five services would have changed the provider list of
 * every spec that builds them. Construct it lazily from the Redis handle you
 * already have (see `CatalogService.cache`).
 *
 * Reads and writes log the key, the outcome and the request id from
 * `RpcContextInterceptor`, so a storefront request can be followed from the
 * gateway's `reqId=` line to the exact cache key and database round trip that
 * answered it.
 */
export class CatalogCache {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: Logger = new Logger('CatalogCache'),
  ) {}

  /** Read a cached entry, logging hit or miss with the request id. */
  async get<T>(key: string): Promise<T | null> {
    const hit = await this.redis.getJson<T>(key);
    this.logger.log(`cache ${hit ? 'hit ' : 'miss'} key=${key} reqId=${currentRequestId()}`);
    return hit;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.setJson(key, value, ttlSeconds);
  }

  /** Drop the detail cache of one product in every market, by id and (when known) by slug. */
  async invalidateProduct(productId: string, slug?: string | null): Promise<void> {
    const removed = await this.redis.delPattern(catalogPatterns.product(productId));
    const bySlug = slug ? await this.redis.delPattern(catalogPatterns.product(slug)) : 0;
    this.logger.log(
      `cache invalidate product=${productId} removed=${removed + bySlug} reqId=${currentRequestId()}`,
    );
  }

  /**
   * Drop every cached listing: product lists, search results, the featured,
   * deals and flash-deal rails, and the home feed that embeds them.
   *
   * Called after any write that moves a price, a stock level, an approval or a
   * listing's visibility. Deliberately market-wide: a product's offers are per
   * market, but the write paths cannot always say which market's card changed
   * (an admin approval activates every market's listing), and a wildcard over a
   * few dozen keys is cheaper than a wrong answer.
   */
  async invalidateListings(): Promise<void> {
    const counts = await Promise.all([
      this.redis.delPattern(catalogPatterns.allProducts()),
      this.redis.delPattern(catalogPatterns.allSearch()),
      this.redis.delPattern(catalogPatterns.allFeatured()),
      this.redis.delPattern(catalogPatterns.allDeals()),
      this.redis.delPattern(catalogPatterns.allFlashDeals()),
      this.redis.delPattern(catalogPatterns.allHome()),
    ]);
    const removed = counts.reduce((sum, n) => sum + n, 0);
    this.logger.log(`cache invalidate listings removed=${removed} reqId=${currentRequestId()}`);
  }

  /** A product changed in a way the storefront must see: its detail and every listing. */
  async invalidateProductAndListings(productId: string, slug?: string | null): Promise<void> {
    await this.invalidateProduct(productId, slug);
    await this.invalidateListings();
  }

  /** The category tree or a category's attributes changed. */
  async invalidateCategories(): Promise<void> {
    await this.redis.del(catalogKeys.categories());
    await this.redis.delPattern(catalogPatterns.categoryAttributes());
    // Category names and slugs are embedded in every cached card and in the home feed.
    await this.invalidateListings();
  }

  async invalidateCategoryAttributes(
    ...categoryIds: Array<string | null | undefined>
  ): Promise<void> {
    const keys = new Set<string>([catalogKeys.categoryAttributes('all')]);
    for (const id of categoryIds) if (id) keys.add(catalogKeys.categoryAttributes(id));
    await Promise.all([...keys].map((key) => this.redis.del(key)));
  }

  async invalidateBrands(): Promise<void> {
    await this.redis.del(catalogKeys.brands());
    await this.redis.del(catalogKeys.topBrands());
  }

  async invalidateSellers(): Promise<void> {
    await this.redis.delPattern(catalogPatterns.allVerifiedSellers());
  }
}
