import { UseFilters, Controller, Logger } from '@nestjs/common';
import { RpcAwareExceptionsFilter } from '@app/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CatalogService } from '../catalog/catalog.service';

/**
 * gRPC surface for the Marketplace catalogue — implements `service MarketplaceService`
 * in proto/marketplace.proto.
 *
 * Why gRPC alongside HTTP and TCP: these eleven RPCs are the storefront read path
 * (browse, search, product page, home), the module's highest-volume traffic. gRPC
 * gives them a versioned schema and binary framing rather than ad-hoc JSON, which
 * matters most on exactly these calls.
 *
 * This is a SEPARATE controller from MarketplaceController for the same reason the
 * seller HTTP and TCP surfaces are separate: each transport has its own contract and
 * its own authorisation story, and mixing them in one class makes it easy to change
 * one and silently break another.
 *
 * The proto is an external contract, so every response is mapped explicitly below.
 * Entities are free to change shape as long as these mappers are updated; without
 * them a column rename would silently blank a field for every gRPC consumer.
 */
// RPC error shaping. Without this, Nest replaces any exception a @MessagePattern
// handler throws with a flat `{ status: 'error', message: 'Internal server error' }`,
// so the gateway has no numeric status to forward and answers 503 for everything —
// a missing product became "catalogue unavailable". The filter cannot be bound in
// main.ts: connectMicroservice() does not inherit the app's global filters.
@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class MarketplaceGrpcController {
  private readonly logger = new Logger(MarketplaceGrpcController.name);

  constructor(private readonly catalog: CatalogService) {}

  // ── Mappers: entity → proto message ─────────────────────────────────────────

  private toProduct(p: any) {
    const price = Number(p?.mrp ?? 0);
    // ProductResponse has no `listings` field, so the buy-box price has to be
    // resolved here or it never reaches a gRPC consumer. `discountedPrice` used
    // to fall straight back to MRP — every product looked undiscounted, which is
    // why search results (the one catalogue read served over gRPC) showed list
    // prices while every other surface showed the real one.
    const activeListings: any[] = (Array.isArray(p?.listings) ? p.listings : [])
      .filter((l: any) => l?.isActive !== false);
    const buyBox = activeListings.find((l: any) => l?.isBuyBoxWinner) ?? activeListings[0];
    const discountedPrice = Number(p?.discountedPrice ?? p?.sellingPrice ?? buyBox?.sellingPrice ?? price);
    const discountPercent = price > 0 && discountedPrice < price
      ? Math.round(((price - discountedPrice) / price) * 100)
      : 0;

    return {
      id: p?.id ?? '',
      name: p?.name ?? '',
      slug: p?.slug ?? '',
      description: p?.short_description ?? p?.long_description ?? '',
      categoryId: p?.category?.id ?? p?.categoryId ?? '',
      brandId: p?.brand?.id ?? p?.brandId ?? '',
      sellerId: p?.seller_id ?? '',
      price,
      discountedPrice,
      discountPercent,
      rating: Number(p?.averageRating ?? 0),
      reviewCount: Number(p?.reviewCount ?? 0),
      stock: Number(p?.stock ?? p?.stockQuantity ?? 0),
      images: Array.isArray(p?.images)
        ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.url ?? '')).filter(Boolean)
        : [],
      variants: Array.isArray(p?.variants)
        ? p.variants.map((v: any) => ({
            id: v?.id ?? '',
            name: v?.name ?? '',
            price: Number(v?.price ?? 0),
            stock: Number(v?.stock ?? 0),
          }))
        : [],
      isFeatured: Boolean(p?.isFeatured),
      isDeal: Boolean(p?.isDeal),
      country: p?.regionCode ?? p?.country ?? '',
    };
  }

  private toCategory(c: any) {
    return {
      id: c?.id ?? '',
      name: c?.name ?? '',
      slug: c?.slug ?? '',
      icon: c?.icon ?? '',
      imageUrl: c?.imageUrl ?? '',
      productCount: Number(c?.productCount ?? 0),
      parentId: c?.parent?.id ?? c?.parentId ?? '',
    };
  }

  private toBrand(b: any) {
    return {
      id: b?.id ?? '',
      name: b?.name ?? '',
      logoUrl: b?.logoUrl ?? '',
      slug: b?.slug ?? '',
      productCount: Number(b?.productCount ?? 0),
    };
  }

  private toSeller(s: any) {
    return {
      id: s?.id ?? '',
      businessName: s?.businessName ?? '',
      logoUrl: s?.logoUrl ?? '',
      rating: Number(s?.sellerRating ?? 0),
      totalProducts: Number(s?.totalProducts ?? 0),
      isVerified: s?.verificationStatus === 'VERIFIED',
      country: s?.regionCode ?? '',
    };
  }

  /** Normalises the service's `{ data, total, page, limit }` into ProductListResponse. */
  private toProductList(result: any, page = 1, limit = 20) {
    const rows = Array.isArray(result?.data) ? result.data : [];
    return {
      data: rows.map((p: any) => this.toProduct(p)),
      total: Number(result?.total ?? rows.length),
      page: Number(result?.page ?? page),
      limit: Number(result?.limit ?? limit),
    };
  }

  // ── RPCs ────────────────────────────────────────────────────────────────────

  @GrpcMethod('MarketplaceService', 'HealthCheck')
  healthCheck() {
    return { service: 'marketplace-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  @GrpcMethod('MarketplaceService', 'GetHome')
  async getHome() {
    // Composed from the catalogue reads rather than MarketplaceService.getHome(),
    // so the gRPC contract does not drag in the whole god-service.
    const [categories, flashDeals, topBrands, featured, topSellers] = await Promise.all([
      this.catalog.getCategories().catch(() => ({ data: [] as unknown[] })),
      this.catalog.getFlashDeals().catch(() => ({ data: [] as unknown[] })),
      this.catalog.getTopBrands().catch(() => ({ data: [] as unknown[] })),
      this.catalog.getFeaturedProducts().catch(() => ({ data: [] as unknown[] })),
      this.catalog.getVerifiedSellers().catch(() => ({ data: [] as unknown[] })),
    ]);

    const rows = (r: any) => (Array.isArray(r?.data) ? r.data : []);
    return {
      banners: [] as unknown[],
      flashDeals: rows(flashDeals).map((p: any) => this.toProduct(p)),
      categories: rows(categories).map((c: any) => this.toCategory(c)),
      topBrands: rows(topBrands).map((b: any) => this.toBrand(b)),
      featured: rows(featured).map((p: any) => this.toProduct(p)),
      topSellers: rows(topSellers).map((s: any) => this.toSeller(s)),
    };
  }

  @GrpcMethod('MarketplaceService', 'GetCategories')
  async getCategories() {
    const result: any = await this.catalog.getCategories();
    const rows = Array.isArray(result?.data) ? result.data : [];
    return { data: rows.map((c: any) => this.toCategory(c)) };
  }

  @GrpcMethod('MarketplaceService', 'GetCategoryById')
  async getCategoryById(data: { id: string }) {
    return this.toCategory(await this.catalog.getCategoryById(data.id));
  }

  @GrpcMethod('MarketplaceService', 'GetProducts')
  async getProducts(data: {
    category?: string; brand?: string; minPrice?: number; maxPrice?: number;
    sortBy?: string; page?: number; limit?: number; sellerId?: string; country?: string;
  }) {
    const page = data.page && data.page > 0 ? data.page : 1;
    const limit = data.limit && data.limit > 0 ? data.limit : 20;
    const result = await this.catalog.getProducts(page, limit, {
      country: data.country,
      category: data.category,
      brand: data.brand,
      seller: data.sellerId,
      // proto sends 0 for an unset double; treat that as "no bound"
      minPrice: data.minPrice || undefined,
      maxPrice: data.maxPrice || undefined,
      sort: data.sortBy,
    });
    return this.toProductList(result, page, limit);
  }

  @GrpcMethod('MarketplaceService', 'GetProductById')
  async getProductById(data: { id: string }) {
    return this.toProduct(await this.catalog.getProductById(data.id));
  }

  @GrpcMethod('MarketplaceService', 'SearchProducts')
  async searchProducts(data: { query: string; page?: number; limit?: number }) {
    const page = data.page && data.page > 0 ? data.page : 1;
    const limit = data.limit && data.limit > 0 ? data.limit : 20;
    return this.toProductList(await this.catalog.searchProducts(data.query, page, limit), page, limit);
  }

  @GrpcMethod('MarketplaceService', 'GetTopBrands')
  async getTopBrands() {
    const result: any = await this.catalog.getTopBrands();
    const rows = Array.isArray(result?.data) ? result.data : [];
    return { data: rows.map((b: any) => this.toBrand(b)) };
  }

  @GrpcMethod('MarketplaceService', 'GetVerifiedSellers')
  async getVerifiedSellers() {
    const result: any = await this.catalog.getVerifiedSellers();
    const rows = Array.isArray(result?.data) ? result.data : [];
    return { data: rows.map((s: any) => this.toSeller(s)) };
  }

  @GrpcMethod('MarketplaceService', 'GetSellerById')
  async getSellerById(data: { id: string }) {
    return this.toSeller(await this.catalog.getSellerById(data.id));
  }

  @GrpcMethod('MarketplaceService', 'GetDeals')
  async getDeals() {
    return this.toProductList(await this.catalog.getDeals());
  }

  @GrpcMethod('MarketplaceService', 'GetFlashDeals')
  async getFlashDeals() {
    return this.toProductList(await this.catalog.getFlashDeals());
  }
}
