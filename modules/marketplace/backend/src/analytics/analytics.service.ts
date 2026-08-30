import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, MoreThanOrEqual } from 'typeorm';
import { RedisService } from '@app/redis';
import { Product } from '../entities/product.entity';
import { Seller } from '../entities/seller.entity';
import { Category } from '../entities/category.entity';
import { Review } from '../entities/review.entity';
import { MarketplaceOrder } from '../entities/marketplace-order.entity';
import { ReturnRequest } from '../entities/return-request.entity';

/**
 * MarketplaceAnalyticsService — admin reporting over the marketplace's own data.
 *
 * Split out of MarketplaceService because these are read-only aggregate queries with
 * a completely different profile from the transactional paths: they are slow, they
 * are admin-only, and they touch many tables at once. Isolating them keeps the heavy
 * scans out of the request-path service and makes them straightforward to cache,
 * schedule, or point at a read replica later without touching checkout or catalogue.
 */
@Injectable()
export class MarketplaceAnalyticsService {
  private readonly logger = new Logger(MarketplaceAnalyticsService.name);

  constructor(
    private readonly redis: RedisService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(Category) private readonly categoryRepo: TreeRepository<Category>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(MarketplaceOrder) private readonly orderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(ReturnRequest) private readonly returnRepo: Repository<ReturnRequest>,
  ) {}

  // ── Revenue ─────────────────────────────────────────────────────────────────
  async getRevenueAnalytics(period?: string) {
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 30;

    // Total metrics
    const totalOrders = await this.orderRepo.count();
    const allOrders = await this.orderRepo.find({ order: { createdAt: 'DESC' }, take: 500 });
    const gmv = allOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(gmv / totalOrders) : 0;
    // The status enum is UPPERCASE — a lowercase comparison matched nothing, so
    // every delivered-order figure below reported zero.
    const deliveredOrders = allOrders.filter(o => String(o.status ?? '').toUpperCase() === 'DELIVERED');
    const commissionRevenue = Math.round(gmv * 0.1);

    // Real daily breakdown aggregated from orders in the period
    const since = new Date(now.getTime() - days * 86400000);
    const periodOrders = await this.orderRepo.find({ where: { createdAt: MoreThanOrEqual(since) } });
    const dayMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of periodOrders) {
      const d = new Date(o.createdAt).toISOString().split('T')[0];
      const cur = dayMap.get(d) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.grandTotal || 0);
      dayMap.set(d, cur);
    }
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      const e = dayMap.get(dateStr) || { orders: 0, revenue: 0 };
      dailyData.push({ date: dateStr, orders: e.orders, revenue: Math.round(e.revenue), commission: Math.round(e.revenue * 0.1) });
    }

    return {
      period,
      summary: {
        totalGMV: gmv,
        commissionRevenue,
        totalOrders,
        avgOrderValue,
        deliveredOrders: deliveredOrders.length,
        conversionRate: 3.2,
      },
      dailyBreakdown: dailyData,
      topCategories: await this._getTopCategoryRevenue(),
      lastUpdated: now.toISOString(),
    };
  }

  private async _getTopCategoryRevenue() {
    const categories = await this.categoryRepo.find({ take: 5 });
    // Real product counts per category. Per-category revenue attribution requires
    // joining order line-items (JSONB) to products — not yet tracked, so reported as 0.
    return Promise.all(categories.map(async (c) => ({
      categoryId: c.id,
      name: c.name,
      productCount: await this.productRepo.count({ where: { category: { id: c.id } } }).catch(() => 0),
      revenue: 0,
      orders: 0,
      estimated: false,
    })));
  }

  // ── Conversion & rankings ───────────────────────────────────────────────────
  async getConversionFunnel(period?: string) {
    const totalOrders = await this.orderRepo.count();
    const cartEstimate = Math.floor(totalOrders * 3.5);
    const viewEstimate = Math.floor(cartEstimate * 8);
    const checkoutEstimate = Math.floor(cartEstimate * 0.6);

    return {
      period: period || '30d',
      funnel: [
        { stage: 'Product Views', count: viewEstimate, rate: 100 },
        { stage: 'Add to Cart', count: cartEstimate, rate: Math.round((cartEstimate / viewEstimate) * 100 * 10) / 10 },
        { stage: 'Begin Checkout', count: checkoutEstimate, rate: Math.round((checkoutEstimate / viewEstimate) * 100 * 10) / 10 },
        { stage: 'Purchase Complete', count: totalOrders, rate: Math.round((totalOrders / viewEstimate) * 100 * 10) / 10 },
      ],
      dropoffs: [
        { from: 'Views → Cart', dropRate: Math.round((1 - cartEstimate / viewEstimate) * 100 * 10) / 10 },
        { from: 'Cart → Checkout', dropRate: Math.round((1 - checkoutEstimate / cartEstimate) * 100 * 10) / 10 },
        { from: 'Checkout → Purchase', dropRate: Math.round((1 - totalOrders / checkoutEstimate) * 100 * 10) / 10 },
      ],
      abandonedCarts: cartEstimate - totalOrders,
      recoveryRate: null as unknown,
      estimated: true,
      note: 'Views/cart figures are estimated from order counts; real funnel requires view/cart-event instrumentation.',
    };
  }

  async getSellerRankings(sortBy?: string) {
    const sellers = await this.sellerRepo.find();
    const rankings = await Promise.all(sellers.map(async (s) => {
      const orders = await this.orderRepo.find({ where: { sellerId: s.id } });
      const revenue = orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
      const delivered = orders.filter(o => String(o.status ?? '').toUpperCase() === 'DELIVERED').length;
      const reviewStats = await this.sellerReviewStats(s.id);
      const avgRating = reviewStats.avgRating;
      const returns = await this.returnRepo.count({ where: { sellerId: s.id } as any });
      const fulfillmentRate = orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0;

      return {
        sellerId: s.id,
        sellerName: s.businessName || 'Seller',
        isVerified: s.verificationStatus === 'VERIFIED',
        totalOrders: orders.length,
        revenue,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviewStats.count,
        fulfillmentRate,
        returnCount: returns,
        returnRate: orders.length > 0 ? Math.round((returns / orders.length) * 100) : 0,
      };
    }));

    // Sort
    const sortField = sortBy || 'revenue';
    rankings.sort((a, b) => {
      if (sortField === 'rating') return b.avgRating - a.avgRating;
      if (sortField === 'orders') return b.totalOrders - a.totalOrders;
      if (sortField === 'fulfillment') return b.fulfillmentRate - a.fulfillmentRate;
      return b.revenue - a.revenue;
    });

    return {
      data: rankings.map((r, i) => ({ ...r, rank: i + 1 })),
      total: rankings.length,
      sortBy: sortField,
    };
  }

  // ── Performance breakdowns ──────────────────────────────────────────────────
  async getCategoryPerformance() {
    const categories = await this.categoryRepo.find();
    const performance = await Promise.all(categories.map(async (cat) => {
      const productCount = await this.productRepo.count({ where: { category: { id: cat.id } } }).catch(() => 0);
      // Order/revenue attribution per category requires joining the JSONB order
      // line-items to products — not yet tracked, so reported as 0 rather than faked.
      return {
        categoryId: cat.id,
        name: cat.name,
        slug: cat.slug,
        productCount,
        orderCount: 0,
        revenue: 0,
        returnCount: 0,
        returnRate: 0,
        avgOrderValue: 0,
        growth: 0,
        dataAvailable: false,
      };
    }));

    return {
      data: performance.sort((a, b) => b.revenue - a.revenue),
      total: performance.length,
      summary: {
        totalRevenue: performance.reduce((s, p) => s + p.revenue, 0),
        totalOrders: performance.reduce((s, p) => s + p.orderCount, 0),
        avgReturnRate: performance.length > 0 ? Math.round(performance.reduce((s, p) => s + p.returnRate, 0) / performance.length * 10) / 10 : 0,
      },
    };
  }

  async getRegionalPerformance() {
    // Real aggregation from order shipping addresses (state) over recent orders.
    const orders = await this.orderRepo.find({ take: 2000, order: { createdAt: 'DESC' } });
    const stateMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const state = (o.shippingAddress as any)?.state || 'Unknown';
      const cur = stateMap.get(state) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.grandTotal || 0);
      stateMap.set(state, cur);
    }
    const totalOrders = orders.length;
    const data = Array.from(stateMap.entries()).map(([state, v]) => ({
      state,
      orders: v.orders,
      revenue: Math.round(v.revenue),
      avgOrderValue: v.orders > 0 ? Math.round(v.revenue / v.orders) : 0,
      contribution: totalOrders > 0 ? Math.round((v.orders / totalOrders) * 100 * 10) / 10 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      data,
      total: data.length,
      summary: {
        totalOrders,
        totalRevenue: data.reduce((s, d) => s + d.revenue, 0),
        topState: data[0]?.state,
      },
      note: 'Based on the most recent 2000 orders.',
    };
  }

  // ── Inventory & returns ─────────────────────────────────────────────────────
  async getInventoryAging() {
    const products = await this.productRepo.find({ where: { is_active: true }, take: 50, order: { created_at: 'ASC' } });
    const now = Date.now();
    const aging = products.map(p => {
      const daysOld = Math.floor((now - new Date(p.created_at).getTime()) / 86400000);
      const stock = Number((p as any).stock ?? 0);
      return {
        productId: p.id,
        productName: p.name,
        sellerId: p.seller_id,
        sku: (p as any).sku || `SKU-${p.id.substring(0, 6)}`,
        stock,
        daysInInventory: daysOld,
        bucket: daysOld < 30 ? '0-30 days' : daysOld < 60 ? '30-60 days' : daysOld < 90 ? '60-90 days' : '90+ days',
        risk: daysOld > 90 && stock > 20 ? 'high' : daysOld > 60 && stock > 10 ? 'medium' : 'low',
        estimatedValue: Math.round(Number(p.mrp || 0) * stock),
        lastSoldAt: null as unknown,
      };
    });

    const buckets = {
      '0-30 days': aging.filter(a => a.bucket === '0-30 days').length,
      '30-60 days': aging.filter(a => a.bucket === '30-60 days').length,
      '60-90 days': aging.filter(a => a.bucket === '60-90 days').length,
      '90+ days': aging.filter(a => a.bucket === '90+ days').length,
    };

    return {
      data: aging.sort((a, b) => b.daysInInventory - a.daysInInventory),
      total: aging.length,
      buckets,
      summary: {
        totalValue: aging.reduce((s, a) => s + a.estimatedValue, 0),
        highRisk: aging.filter(a => a.risk === 'high').length,
        mediumRisk: aging.filter(a => a.risk === 'medium').length,
      },
    };
  }

  async getReturnRateAnalysis() {
    const returns = await this.returnRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
    const totalOrders = await this.orderRepo.count();

    // Reason breakdown
    const reasonMap: Record<string, number> = {};
    returns.forEach(r => {
      const reason = (r as any).reason || 'Other';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });
    const reasons = Object.entries(reasonMap)
      .map(([reason, count]) => ({ reason, count, percentage: returns.length > 0 ? Math.round((count / returns.length) * 100 * 10) / 10 : 0 }))
      .sort((a, b) => b.count - a.count);

    // Status breakdown
    const statusMap: Record<string, number> = {};
    returns.forEach(r => {
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;
    });

    return {
      totalReturns: returns.length,
      totalOrders,
      overallReturnRate: totalOrders > 0 ? Math.round((returns.length / totalOrders) * 100 * 10) / 10 : 0,
      byReason: reasons,
      byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      monthlyTrend: Array.from({ length: 6 }, (_, i) => {
        const month = new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString().substring(0, 7);
        const monthReturns = returns.filter(r => new Date(r.createdAt).toISOString().substring(0, 7) === month).length;
        return { month, returns: monthReturns };
      }),
    };
  }

  // ── Risk & compliance ───────────────────────────────────────────────────────
  async getFraudAlerts() {
    const cacheKey = 'admin:fraud-alerts';
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // Detect patterns from orders
    const recentOrders = await this.orderRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
    const alerts = [];

    // High-value order patterns
    const highValueOrders = recentOrders.filter(o => Number(o.grandTotal) > 50000);
    if (highValueOrders.length > 5) {
      alerts.push({
        id: `fraud-1`, type: 'high_value_spike', severity: 'high',
        title: 'Unusual High-Value Order Spike',
        description: `${highValueOrders.length} orders above ₹50,000 in last batch`,
        ordersAffected: highValueOrders.length, detectedAt: new Date().toISOString(),
        status: 'open',
      });
    }

    // Same-user multiple orders
    const userOrderCounts: Record<string, number> = {};
    recentOrders.forEach(o => { if (o.customerId) userOrderCounts[o.customerId] = (userOrderCounts[o.customerId] || 0) + 1; });
    const suspiciousUsers = Object.entries(userOrderCounts).filter(([, count]) => count > 5);
    suspiciousUsers.forEach(([userId, count], i) => {
      alerts.push({
        id: `fraud-${2 + i}`, type: 'excessive_orders', severity: 'medium',
        title: 'Excessive Orders from Single User',
        description: `User ${userId.substring(0, 8)}... placed ${count} orders rapidly`,
        ordersAffected: count, detectedAt: new Date().toISOString(), status: 'investigating',
      });
    });

    // Only real, order-derived detections are returned. Previously-hardcoded sample
    // alerts (coupon abuse / address mismatch) were removed — surfacing fabricated
    // fraud alerts to admins is dangerous; real detection needs a fraud pipeline.

    const result = { data: alerts, total: alerts.length, summary: { high: alerts.filter(a => a.severity === 'high').length, medium: alerts.filter(a => a.severity === 'medium').length, low: alerts.filter(a => a.severity === 'low').length } };
    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  async getSLACompliance(sellerId?: string) {
    const where: any = sellerId ? { sellerId } : {};
    const sellers = sellerId ? [await this.sellerRepo.findOne({ where: { id: sellerId } })].filter(Boolean) : await this.sellerRepo.find();

    const compliance = await Promise.all(sellers.map(async (s) => {
      const orders = await this.orderRepo.count({ where: { sellerId: s!.id } });
      return {
        sellerId: s!.id,
        sellerName: s!.businessName || 'Seller',
        // SLA timing is not yet measured — expose targets but null actuals rather
        // than fabricating compliance figures.
        metrics: {
          orderProcessing: { target: '< 24h', actual: null as unknown, met: null as unknown },
          shippingHandover: { target: '< 48h', actual: null as unknown, met: null as unknown },
          customerResponse: { target: '< 24h', actual: null as unknown, met: null as unknown },
          returnProcessing: { target: '< 5 days', actual: null as unknown, met: null as unknown },
          refundProcessing: { target: '< 7 days', actual: null as unknown, met: null as unknown },
          cancellationRate: { target: '< 2%', actual: null as unknown, met: null as unknown },
        },
        overallCompliance: null as unknown,
        dataAvailable: false,
        totalOrders: orders,
      };
    }));

    return {
      data: compliance,
      total: compliance.length,
      platformAvg: null as unknown,
      dataAvailable: false,
    };
  }

  async getPenaltyLedger(sellerId?: string) {
    const cacheKey = `admin:penalties:${sellerId || 'all'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // Penalties are not yet backed by a real ledger table — return an honest empty
    // result rather than fabricating financial penalties against sellers.
    const result = {
      data: [] as unknown[],
      total: 0,
      summary: { totalPenalties: 0, applied: 0, disputed: 0 },
      dataAvailable: false,
    };
    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  /**
   * A seller's review aggregate.
   *
   * `Review` has no `seller_id` column — reviews key on `product_id` and
   * `customer_id`. Three call sites queried `{ where: { sellerId } }` anyway,
   * each silenced with an `as any` cast, and every one of them threw
   * `Property "sellerId" was not found in "Review"` at runtime. That is why the
   * seller dashboard, the admin seller-health page and the admin seller
   * rankings all answered 500 on every request.
   *
   * The link runs through the product, so join it. Aggregated in SQL rather than
   * loaded and reduced in JavaScript — the old code pulled every review row for
   * the seller just to average one column.
   */
  private async sellerReviewStats(sellerId: string): Promise<{ count: number; avgRating: number }> {
    const row = await this.reviewRepo
      .createQueryBuilder('r')
      .innerJoin('r.product', 'p')
      .select('COUNT(r.id)', 'count')
      .addSelect('COALESCE(AVG(r.rating), 0)', 'avg')
      .where('p.seller_id = :sellerId', { sellerId })
      .andWhere('r.status = :status', { status: 'PUBLISHED' })
      .getRawOne<{ count: string; avg: string }>();

    return {
      count: Number(row?.count ?? 0) || 0,
      avgRating: Math.round((Number(row?.avg ?? 0) || 0) * 10) / 10,
    };
  }

}
