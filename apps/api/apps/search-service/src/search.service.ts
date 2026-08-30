import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { ConfigService } from '@nestjs/config';

// ─── Search Index Types ──────────────────────────────────────────────────────
export enum SearchableModule {
  MARKETPLACE = 'marketplace',
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  DOCTOR = 'doctor',
  HOTEL = 'hotel',
}

export interface SearchFilters {
  category?: string;
  serviceType?: string;
  country?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  module: SearchableModule;
  price?: number;
  rating?: number;
  imageUrl?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly esNode: string;
  private readonly indexPrefix: string;
  private esAvailable = false;

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {
    this.esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
    this.indexPrefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'kartseek_';

    // Check ES availability on startup
    this.checkElasticsearchConnection();
  }

  async healthCheck() {
    return {
      service: 'search-service',
      status: 'ok',
      elasticsearch: this.esAvailable ? 'connected' : 'unavailable',
      node: this.esNode,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Cross-Module Search ────────────────────────────────────────────────────────
  async search(query: string, filters: SearchFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    // 1. Check Redis cache (30s TTL for search results)
    const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      this.logger.debug(`Search cache hit: "${query}"`);
      return cached;
    }

    let results: SearchResult[] = [];
    let total = 0;

    // 2. Query Elasticsearch if available
    if (this.esAvailable) {
      try {
        const esResult = await this.queryElasticsearch(query, filters, page, limit);
        results = esResult.results;
        total = esResult.total;
      } catch (err) {
        this.logger.warn(`Elasticsearch query failed, falling back to Redis: ${(err as Error).message}`);
        this.esAvailable = false;
      }
    }

    // 3. Fallback: Redis-based search across indexed documents
    if (results.length === 0) {
      const fallback = await this.redisBasedSearch(query, filters, page, limit);
      results = fallback.results;
      total = fallback.total;
    }

    // 4. Build facets
    const facets = await this.buildFacets(query, filters);

    // 5. Build suggestions
    const suggestions = await this.buildSuggestions(query);

    const result = {
      query,
      filters,
      results,
      total,
      page,
      limit,
      hasMore: total > page * limit,
      suggestions,
      facets,
      searchedAt: new Date().toISOString(),
    };

    // 6. Cache result for 30 seconds
    await this.redis.setJson(cacheKey, result, 30);

    // 7. Track search analytics
    await this.trackSearch(query, filters, total);

    return result;
  }

  // ── Autocomplete / Suggestions ─────────────────────────────────────────────
  async getSearchSuggestions(prefix: string, moduleFilter?: string) {
    if (!prefix || prefix.length < 2) {
      return { prefix, suggestions: [] };
    }

    // Check Redis suggestion cache
    const cacheKey = `search:suggest:${prefix}:${moduleFilter ?? 'all'}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    // Build suggestions from popular searches + indexed titles
    const popularKey = 'search:popular:queries';
    const popularSearches = (await this.redis.getJson<any[]>(popularKey)) ?? [];

    const matchingPopular = popularSearches
      .filter((s) => s.query.toLowerCase().includes(prefix.toLowerCase()))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => s.query);

    // Module-specific suggestions
    const moduleSuggestions = [
      `${prefix} near me`,
      `${prefix} delivery`,
      `${prefix} deals`,
      `best ${prefix}`,
      `cheap ${prefix}`,
    ].filter((s) => !matchingPopular.includes(s));

    const suggestions = [...matchingPopular, ...moduleSuggestions].slice(0, 8);

    const result = { prefix, suggestions, module: moduleFilter ?? 'all' };
    await this.redis.setJson(cacheKey, result, 60); // 1-minute cache
    return result;
  }

  // ── Index Document ─────────────────────────────────────────────────────────
  async indexDocument(module: SearchableModule, id: string, data: Record<string, unknown>) {
    const doc: SearchResult = {
      id,
      title: (data.name || data.title || '') as string,
      description: (data.description || data.summary || '') as string,
      module,
      price: data.price as number | undefined,
      rating: data.rating as number | undefined,
      imageUrl: (data.imageUrl || data.image) as string | undefined,
      url: `/${module}/${id}`,
      metadata: data,
    };

    // 1. Store in Redis index
    const indexKey = `search:index:${module}:${id}`;
    await this.redis.setJson(indexKey, doc, 86400 * 7); // 7-day TTL

    // Add to module's document set
    await this.redis.setJson(`search:index:set:${module}`, [
      ...((await this.redis.getJson<string[]>(`search:index:set:${module}`)) ?? []).filter(d => d !== id),
      id,
    ], 86400 * 7);

    // 2. Index in Elasticsearch if available
    if (this.esAvailable) {
      try {
        await this.esIndexDocument(module, id, doc);
      } catch (err) {
        this.logger.warn(`ES indexing failed for ${module}/${id}: ${(err as any).message}`);
      }
    }

    this.logger.log(`Indexed ${module}/${id}: "${doc.title}"`);
    return { success: true, indexed: { module, id, title: doc.title } };
  }

  // ── Remove Document ────────────────────────────────────────────────────────
  async removeDocument(module: SearchableModule, id: string) {
    await this.redis.del(`search:index:${module}:${id}`);

    // Remove from module's document set
    const set = (await this.redis.getJson<string[]>(`search:index:set:${module}`)) ?? [];
    await this.redis.setJson(`search:index:set:${module}`, set.filter(d => d !== id), 86400 * 7);

    if (this.esAvailable) {
      try {
        await this.esRemoveDocument(module, id);
      } catch (err) {
        this.logger.warn(`ES remove failed for ${module}/${id}: ${(err as any).message}`);
      }
    }

    this.logger.log(`Removed from index: ${module}/${id}`);
    return { success: true, removed: { module, id } };
  }

  // ── Popular Searches ───────────────────────────────────────────────────────
  async getPopularSearches(limit = 10) {
    const popular = (await this.redis.getJson<any[]>('search:popular:queries')) ?? [];
    return {
      queries: popular.sort((a, b) => b.count - a.count).slice(0, limit),
    };
  }

  // ── Trending Searches (last 1 hour) ────────────────────────────────────────
  async getTrendingSearches(limit = 10) {
    const trending = (await this.redis.getJson<any[]>('search:trending:queries')) ?? [];
    return {
      queries: trending.sort((a, b) => b.count - a.count).slice(0, limit),
      window: '1h',
    };
  }

  // ── Private: Elasticsearch Query ───────────────────────────────────────────
  private async queryElasticsearch(query: string, filters: SearchFilters, page: number, limit: number) {
    const index = filters.serviceType
      ? `${this.indexPrefix}${filters.serviceType}`
      : `${this.indexPrefix}*`;

    // Build ES query body
    const must: any[] = [
      {
        multi_match: {
          query,
          fields: ['title^3', 'description^2', 'metadata.category', 'metadata.brand'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    const filter: any[] = [];
    if (filters.country) filter.push({ term: { 'metadata.country': filters.country } });
    if (filters.category) filter.push({ term: { 'metadata.category': filters.category } });
    if (filters.minPrice || filters.maxPrice) {
      filter.push({
        range: {
          price: {
            ...(filters.minPrice ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
          },
        },
      });
    }
    if (filters.rating) filter.push({ range: { rating: { gte: filters.rating } } });

    // Sort
    const sort: any[] = [];
    if (filters.sortBy === 'price_asc') sort.push({ price: 'asc' });
    else if (filters.sortBy === 'price_desc') sort.push({ price: 'desc' });
    else if (filters.sortBy === 'rating') sort.push({ rating: 'desc' });
    else if (filters.sortBy === 'newest') sort.push({ 'metadata.createdAt': 'desc' });
    else sort.push({ _score: 'desc' });

    try {
      const response = await fetch(`${this.esNode}/${index}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { bool: { must, filter } },
          sort,
          from: (page - 1) * limit,
          size: limit,
          _source: true,
        }),
        signal: AbortSignal.timeout(parseInt(process.env.ELASTICSEARCH_REQUEST_TIMEOUT || '30000', 10)),
      });

      if (!response.ok) throw new Error(`ES responded with ${response.status}`);

      const data = await response.json() as any;
      const results: SearchResult[] = (data.hits?.hits ?? []).map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
      }));

      return { results, total: data.hits?.total?.value ?? 0 };
    } catch (err) {
      throw err;
    }
  }

  // ── Private: Redis-Based Fallback Search ───────────────────────────────────
  private async redisBasedSearch(query: string, filters: SearchFilters, page: number, limit: number) {
    const modules = filters.serviceType
      ? [filters.serviceType as SearchableModule]
      : Object.values(SearchableModule);

    const allResults: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const mod of modules) {
      const docIds = (await this.redis.getJson<string[]>(`search:index:set:${mod}`)) ?? [];

      for (const id of docIds) {
        const doc = await this.redis.getJson<SearchResult>(`search:index:${mod}:${id}`);
        if (!doc) continue;

        // Simple text matching
        const matchTitle = doc.title?.toLowerCase().includes(queryLower);
        const matchDesc = doc.description?.toLowerCase().includes(queryLower);
        if (matchTitle || matchDesc) {
          // Apply filters
          if (filters.minPrice && doc.price && doc.price < filters.minPrice) continue;
          if (filters.maxPrice && doc.price && doc.price > filters.maxPrice) continue;
          if (filters.rating && doc.rating && doc.rating < filters.rating) continue;

          allResults.push({ ...doc, _score: matchTitle ? 10 : 5 } as any);
        }
      }
    }

    // Sort
    if (filters.sortBy === 'price_asc') allResults.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (filters.sortBy === 'price_desc') allResults.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (filters.sortBy === 'rating') allResults.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else allResults.sort((a, b) => ((b as any)._score ?? 0) - ((a as any)._score ?? 0));

    const start = (page - 1) * limit;
    return {
      results: allResults.slice(start, start + limit),
      total: allResults.length,
    };
  }

  // ── Private: Build Facets ──────────────────────────────────────────────────
  private async buildFacets(query: string, filters: SearchFilters) {
    return {
      categories: [
        { label: 'Electronics', count: 0 },
        { label: 'Fashion', count: 0 },
        { label: 'Groceries', count: 0 },
        { label: 'Food', count: 0 },
        { label: 'Health', count: 0 },
      ],
      priceRanges: [
        { label: 'Under INR 500', min: 0, max: 500 },
        { label: 'INR 500 – 2,000', min: 500, max: 2000 },
        { label: 'INR 2,000 – 10,000', min: 2000, max: 10000 },
        { label: 'Above INR 10,000', min: 10000, max: null },
      ],
      modules: Object.values(SearchableModule).map((m) => ({ label: m, count: 0 })),
      ratings: [
        { label: '4★ & above', min: 4 },
        { label: '3★ & above', min: 3 },
      ],
    };
  }

  // ── Private: Build Suggestions ─────────────────────────────────────────────
  private async buildSuggestions(query: string) {
    return [
      `${query} near me`,
      `${query} delivery`,
      `${query} deals`,
      `${query} best price`,
      `best ${query}`,
    ];
  }

  // ── Private: Track Search Analytics ────────────────────────────────────────
  private async trackSearch(query: string, filters: SearchFilters, resultCount: number) {
    // Update popular searches
    const popularKey = 'search:popular:queries';
    const popular = (await this.redis.getJson<any[]>(popularKey)) ?? [];
    const existing = popular.find((s) => s.query.toLowerCase() === query.toLowerCase());
    if (existing) {
      existing.count++;
      existing.lastSearched = new Date().toISOString();
    } else {
      popular.push({ query, count: 1, lastSearched: new Date().toISOString() });
    }
    // Keep top 200 popular searches
    await this.redis.setJson(popularKey, popular.sort((a, b) => b.count - a.count).slice(0, 200), 86400 * 30);

    // Update trending (1-hour window)
    const trendingKey = 'search:trending:queries';
    const trending = (await this.redis.getJson<any[]>(trendingKey)) ?? [];
    const trendExisting = trending.find((s) => s.query.toLowerCase() === query.toLowerCase());
    if (trendExisting) {
      trendExisting.count++;
    } else {
      trending.push({ query, count: 1 });
    }
    await this.redis.setJson(trendingKey, trending.sort((a, b) => b.count - a.count).slice(0, 50), 3600);

    // Publish analytics event
    await this.kafka.publish('search.performed', {
      query,
      filters: filters as Record<string, unknown>,
      resultCount,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Private: ES Document Operations ────────────────────────────────────────
  private async esIndexDocument(module: SearchableModule, id: string, doc: SearchResult) {
    const index = `${this.indexPrefix}${module}`;
    await fetch(`${this.esNode}/${index}/_doc/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
  }

  private async esRemoveDocument(module: SearchableModule, id: string) {
    const index = `${this.indexPrefix}${module}`;
    await fetch(`${this.esNode}/${index}/_doc/${id}`, { method: 'DELETE' });
  }

  // ── Private: Check Elasticsearch Connection ────────────────────────────────
  private async checkElasticsearchConnection() {
    try {
      const response = await fetch(`${this.esNode}/_cluster/health`, {
        signal: AbortSignal.timeout(5000),
      });
      this.esAvailable = response.ok;
      if (this.esAvailable) {
        this.logger.log(`✅ Elasticsearch connected at ${this.esNode}`);
      }
    } catch {
      this.esAvailable = false;
      this.logger.warn(`⚠️  Elasticsearch not available at ${this.esNode} — using Redis fallback`);
    }
  }
}
