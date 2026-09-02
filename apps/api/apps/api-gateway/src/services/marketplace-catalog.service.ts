import { Inject, Injectable, Logger, type OnModuleInit, Optional } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable, timeout } from 'rxjs';

/**
 * Typed view of `service MarketplaceService` in proto/marketplace.proto.
 * Method names are PascalCase on the wire; @nestjs/microservices exposes them
 * camelCased on the client.
 */
interface MarketplaceGrpc {
  healthCheck(data: Record<string, never>): Observable<any>;
  getHome(data: Record<string, never>): Observable<any>;
  getCategories(data: Record<string, never>): Observable<any>;
  getCategoryById(data: { id: string }): Observable<any>;
  getProducts(data: {
    category?: string; brand?: string; minPrice?: number; maxPrice?: number;
    sortBy?: string; page?: number; limit?: number; sellerId?: string; country?: string;
  }): Observable<any>;
  getProductById(data: { id: string }): Observable<any>;
  searchProducts(data: { query: string; page?: number; limit?: number }): Observable<any>;
  getTopBrands(data: Record<string, never>): Observable<any>;
  getVerifiedSellers(data: Record<string, never>): Observable<any>;
  getSellerById(data: { id: string }): Observable<any>;
  getDeals(data: Record<string, never>): Observable<any>;
  getFlashDeals(data: Record<string, never>): Observable<any>;
}

/**
 * MarketplaceCatalogService — gateway-side client for the Marketplace catalogue
 * over gRPC.
 *
 * The catalogue reads (browse, search, product page, home) are the module's
 * highest-volume traffic, and marketplace.proto already describes them precisely.
 * Routing them over gRPC gets a schema-checked contract and binary framing instead
 * of ad-hoc JSON-over-TCP.
 *
 * Every call is best-effort: if the gRPC channel is unavailable the caller is told
 * so and falls back to the existing TCP pattern, so enabling this cannot take the
 * storefront down. Set MARKETPLACE_GRPC_ENABLED=false to bypass gRPC entirely.
 */
@Injectable()
export class MarketplaceCatalogService implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceCatalogService.name);
  private grpc?: MarketplaceGrpc;

  /** Per-call deadline. Catalogue reads are user-facing; a slow channel must not hang a page. */
  private static readonly DEADLINE_MS = 3000;

  /**
   * Fallback telemetry.
   *
   * The TCP fallback is deliberately silent to callers — a broken gRPC channel
   * degrades latency, not correctness, so nothing surfaces in a response. That is
   * exactly why it needs counters: without them a permanently-dead channel looks
   * like "everything is fine, just slower". Surfaced on /health/ready.
   */
  private attempts = 0;
  private failures = 0;
  private consecutiveFailures = 0;
  private lastError?: string;
  private lastFailureAt?: string;
  private lastSuccessAt?: string;

  /** Consecutive failures before the channel is reported as down rather than degraded. */
  private static readonly DOWN_THRESHOLD = 5;

  constructor(
    @Optional() @Inject('MARKETPLACE_GRPC') private readonly client?: ClientGrpc,
  ) {}

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Marketplace gRPC disabled — catalogue reads will use TCP.');
      return;
    }
    try {
      this.grpc = this.client?.getService<MarketplaceGrpc>('MarketplaceService');
    } catch (e) {
      this.logger.warn(`Marketplace gRPC unavailable, falling back to TCP: ${(e as Error).message}`);
    }
  }

  get enabled(): boolean {
    return process.env.MARKETPLACE_GRPC_ENABLED !== 'false' && !!this.client;
  }

  /** True when a gRPC channel is ready; callers use this to decide whether to try. */
  get ready(): boolean {
    return !!this.grpc;
  }

  /**
   * Runs a gRPC call, returning `null` if the channel is missing or the call fails.
   * `null` means "fall back to TCP" — it is never a valid catalogue response.
   */
  private async call<T>(label: string, fn: (svc: MarketplaceGrpc) => Observable<T>): Promise<T | null> {
    if (!this.grpc) return null;
    this.attempts++;
    try {
      const result = await firstValueFrom(
        fn(this.grpc).pipe(timeout(MarketplaceCatalogService.DEADLINE_MS)),
      );
      this.consecutiveFailures = 0;
      this.lastSuccessAt = new Date().toISOString();
      return result;
    } catch (e) {
      this.failures++;
      this.consecutiveFailures++;
      this.lastError = `${label}: ${(e as Error).message}`;
      this.lastFailureAt = new Date().toISOString();

      // First failure in a run logs at error so it is alertable; the rest stay at
      // warn so a sustained outage does not drown the log.
      const msg = `gRPC ${label} failed, falling back to TCP: ${(e as Error).message}`;
      if (this.consecutiveFailures === 1) this.logger.error(msg);
      else this.logger.warn(`${msg} (consecutive: ${this.consecutiveFailures})`);
      return null;
    }
  }

  /**
   * Health snapshot for the readiness probe.
   *
   * `up`       — channel open, no recent failures
   * `degraded` — some calls are falling back to TCP
   * `down`     — DOWN_THRESHOLD consecutive failures; every read is on TCP
   * `disabled` — MARKETPLACE_GRPC_ENABLED=false or no client bound
   */
  stats() {
    const status = !this.enabled || !this.grpc
      ? 'disabled'
      : this.consecutiveFailures >= MarketplaceCatalogService.DOWN_THRESHOLD
        ? 'down'
        : this.consecutiveFailures > 0
          ? 'degraded'
          : 'up';

    return {
      status,
      attempts: this.attempts,
      failures: this.failures,
      consecutiveFailures: this.consecutiveFailures,
      fallbackRate: this.attempts ? Number((this.failures / this.attempts).toFixed(3)) : 0,
      ...(this.lastSuccessAt ? { lastSuccessAt: this.lastSuccessAt } : {}),
      ...(this.lastFailureAt ? { lastFailureAt: this.lastFailureAt } : {}),
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }

  health() { return this.call('HealthCheck', (s) => s.healthCheck({} as Record<string, never>)); }
  getHome() { return this.call('GetHome', (s) => s.getHome({} as Record<string, never>)); }
  getCategories() { return this.call('GetCategories', (s) => s.getCategories({} as Record<string, never>)); }
  getCategoryById(id: string) { return this.call('GetCategoryById', (s) => s.getCategoryById({ id })); }
  getProductById(id: string) { return this.call('GetProductById', (s) => s.getProductById({ id })); }
  getTopBrands() { return this.call('GetTopBrands', (s) => s.getTopBrands({} as Record<string, never>)); }
  getVerifiedSellers() { return this.call('GetVerifiedSellers', (s) => s.getVerifiedSellers({} as Record<string, never>)); }
  getSellerById(id: string) { return this.call('GetSellerById', (s) => s.getSellerById({ id })); }
  getDeals() { return this.call('GetDeals', (s) => s.getDeals({} as Record<string, never>)); }
  getFlashDeals() { return this.call('GetFlashDeals', (s) => s.getFlashDeals({} as Record<string, never>)); }

  getProducts(params: {
    category?: string; brand?: string; minPrice?: number; maxPrice?: number;
    sortBy?: string; page?: number; limit?: number; sellerId?: string; country?: string;
  }) {
    return this.call('GetProducts', (s) => s.getProducts(params));
  }

  searchProducts(query: string, page = 1, limit = 20) {
    return this.call('SearchProducts', (s) => s.searchProducts({ query, page, limit }));
  }
}
