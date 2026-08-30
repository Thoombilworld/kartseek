import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

// ─── Category-Based Rate Card (Amazon/Flipkart Style) ────────────────────────
export interface CategoryRate {
  category: string;
  subCategory?: string;
  referralRate: number;       // Percentage (e.g., 0.065 = 6.5%)
  closingFee: number;         // Fixed fee per order (₹)
  closingFeeThreshold: number; // Closing fee applies only below this order value
  minCommission: number;      // Minimum commission floor (₹)
}

export interface CommissionRate {
  serviceType: string;
  baseRate: number;
  tierRates: { minOrders: number; rate: number }[];
  description: string;
}

export interface CommissionRecord {
  id: string;
  orderId: string;
  sellerId: string;
  orderTotal: number;
  rate: number;
  referralFee: number;
  closingFee: number;
  commissionAmount: number;
  gstOnCommission: number;
  tdsAmount: number;
  sellerEarning: number;
  serviceType: string;
  category: string;
  tier: string;
  feeBreakdown: {
    referralFee: number;
    closingFee: number;
    subtotal: number;
    gst: number;
    totalPlatformEarning: number;
    tds: number;
    sellerNetPayout: number;
  };
  calculatedAt: string;
}

export interface SellerOverride {
  sellerId: string;
  rate: number;
  reason: string;
  expiresAt: string | null;
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  // ── Amazon/Flipkart-Style Category Rate Card ───────────────────────────────
  // Reference: https://sell.amazon.in/fees-and-pricing (India rates)
  private readonly categoryRates: CategoryRate[] = [
    // Electronics
    { category: 'Electronics', subCategory: 'Smartphones', referralRate: 0.065, closingFee: 25, closingFeeThreshold: 500, minCommission: 10 },
    { category: 'Electronics', subCategory: 'Laptops', referralRate: 0.05, closingFee: 25, closingFeeThreshold: 500, minCommission: 10 },
    { category: 'Electronics', subCategory: 'Accessories', referralRate: 0.12, closingFee: 15, closingFeeThreshold: 300, minCommission: 5 },
    { category: 'Electronics', subCategory: 'Cameras', referralRate: 0.07, closingFee: 25, closingFeeThreshold: 500, minCommission: 10 },
    { category: 'Electronics', referralRate: 0.08, closingFee: 25, closingFeeThreshold: 500, minCommission: 10 },
    // Fashion
    { category: 'Fashion', subCategory: 'Apparel', referralRate: 0.15, closingFee: 10, closingFeeThreshold: 300, minCommission: 5 },
    { category: 'Fashion', subCategory: 'Footwear', referralRate: 0.12, closingFee: 10, closingFeeThreshold: 300, minCommission: 5 },
    { category: 'Fashion', subCategory: 'Watches', referralRate: 0.14, closingFee: 15, closingFeeThreshold: 500, minCommission: 5 },
    { category: 'Fashion', referralRate: 0.14, closingFee: 10, closingFeeThreshold: 300, minCommission: 5 },
    // Home & Kitchen
    { category: 'Home & Kitchen', subCategory: 'Furniture', referralRate: 0.10, closingFee: 20, closingFeeThreshold: 500, minCommission: 10 },
    { category: 'Home & Kitchen', subCategory: 'Appliances', referralRate: 0.08, closingFee: 15, closingFeeThreshold: 500, minCommission: 5 },
    { category: 'Home & Kitchen', referralRate: 0.12, closingFee: 15, closingFeeThreshold: 500, minCommission: 5 },
    // Beauty & Personal Care
    { category: 'Beauty', referralRate: 0.18, closingFee: 5, closingFeeThreshold: 200, minCommission: 3 },
    // Books & Media
    { category: 'Books', referralRate: 0.05, closingFee: 5, closingFeeThreshold: 200, minCommission: 1 },
    // Sports & Fitness
    { category: 'Sports', referralRate: 0.10, closingFee: 10, closingFeeThreshold: 300, minCommission: 5 },
    // Toys & Baby
    { category: 'Toys', referralRate: 0.12, closingFee: 10, closingFeeThreshold: 300, minCommission: 5 },
    // Grocery & Essentials
    { category: 'Grocery', referralRate: 0.055, closingFee: 5, closingFeeThreshold: 200, minCommission: 1 },
    // Health & Wellness
    { category: 'Health', referralRate: 0.12, closingFee: 10, closingFeeThreshold: 300, minCommission: 3 },
    // Auto & Industrial
    { category: 'Automotive', referralRate: 0.10, closingFee: 15, closingFeeThreshold: 500, minCommission: 5 },
  ];

  // Module-level fallback rates (when category is not specified)
  private readonly defaultRates: Record<string, CommissionRate> = {
    marketplace: {
      serviceType: 'marketplace',
      baseRate: 0.12,
      tierRates: [
        { minOrders: 0, rate: 0.15 },     // New seller: 15%
        { minOrders: 50, rate: 0.12 },     // Established: 12%
        { minOrders: 200, rate: 0.10 },    // Premium: 10%
        { minOrders: 1000, rate: 0.08 },   // Elite: 8%
      ],
      description: 'Marketplace product sales commission',
    },
    grocery: {
      serviceType: 'grocery',
      baseRate: 0.08,
      tierRates: [
        { minOrders: 0, rate: 0.10 },
        { minOrders: 100, rate: 0.08 },
        { minOrders: 500, rate: 0.06 },
      ],
      description: 'Grocery store delivery commission',
    },
    restaurant: {
      serviceType: 'restaurant',
      baseRate: 0.15,
      tierRates: [
        { minOrders: 0, rate: 0.18 },
        { minOrders: 100, rate: 0.15 },
        { minOrders: 500, rate: 0.12 },
      ],
      description: 'Restaurant order commission',
    },
    pharmacy: {
      serviceType: 'pharmacy',
      baseRate: 0.10,
      tierRates: [
        { minOrders: 0, rate: 0.12 },
        { minOrders: 50, rate: 0.10 },
        { minOrders: 200, rate: 0.08 },
      ],
      description: 'Pharmacy order commission',
    },
    doctor: {
      serviceType: 'doctor',
      baseRate: 0.20,
      tierRates: [
        { minOrders: 0, rate: 0.25 },
        { minOrders: 50, rate: 0.20 },
        { minOrders: 200, rate: 0.15 },
      ],
      description: 'Doctor appointment commission',
    },
    hotel: {
      serviceType: 'hotel',
      baseRate: 0.15,
      tierRates: [
        { minOrders: 0, rate: 0.18 },
        { minOrders: 50, rate: 0.15 },
        { minOrders: 200, rate: 0.12 },
      ],
      description: 'Hotel booking commission',
    },
    taxi: {
      serviceType: 'taxi',
      baseRate: 0.20,
      tierRates: [
        { minOrders: 0, rate: 0.25 },
        { minOrders: 100, rate: 0.20 },
        { minOrders: 500, rate: 0.18 },
      ],
      description: 'Taxi ride commission',
    },
  };

  // GST rate on commission (Indian tax)
  private readonly GST_RATE = 0.18;
  // TDS rate under Section 194-O (Indian e-commerce tax)
  private readonly TDS_RATE = 0.01;
  // Platform admin wallet ID for commission credits
  private readonly PLATFORM_WALLET_ID = 'platform-admin';

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async healthCheck() {
    return { service: 'commission-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Calculate Commission (Amazon/Flipkart Style) ──────────────────────────
  async calculateCommission(
    orderId: string,
    sellerId: string,
    orderTotal: number,
    serviceType: string,
    category?: string,
    subCategory?: string,
  ): Promise<CommissionRecord> {
    // 1. Check seller-specific rate override first
    const sellerOverride = await this.getSellerOverride(sellerId, serviceType);

    let referralRate: number;
    let closingFee = 0;
    let minCommission = 1;
    let tier = 'category-rate';

    if (sellerOverride) {
      // Seller has a custom negotiated rate
      referralRate = sellerOverride.rate / 100;
      tier = `custom-override (${sellerOverride.reason || 'negotiated'})`;
      this.logger.log(`Using seller override: ${sellerId} → ${sellerOverride.rate}%`);
    } else if (category && serviceType === 'marketplace') {
      // Category-based rate resolution (Amazon/Flipkart style)
      const catRate = this.resolveCategoryRate(category, subCategory);
      referralRate = catRate.referralRate;
      closingFee = orderTotal <= catRate.closingFeeThreshold ? catRate.closingFee : 0;
      minCommission = catRate.minCommission;
      tier = `category: ${category}${subCategory ? ` > ${subCategory}` : ''}`;
    } else {
      // Fallback: tier-based rate by service type
      const sellerStats = await this.getSellerStats(sellerId);
      const rateConfig = await this.getCommissionRateConfig(serviceType);
      referralRate = rateConfig.baseRate;
      tier = 'base';

      for (const tierRate of rateConfig.tierRates.sort((a, b) => b.minOrders - a.minOrders)) {
        if (sellerStats.totalOrders >= tierRate.minOrders) {
          referralRate = tierRate.rate;
          tier = `${tierRate.minOrders}+ orders`;
          break;
        }
      }
    }

    // 2. Calculate commission breakdown
    const referralFeeAmount = this.round(orderTotal * referralRate);
    const rawCommission = referralFeeAmount + closingFee;
    const commissionAmount = Math.max(rawCommission, minCommission);
    const gstOnCommission = this.round(commissionAmount * this.GST_RATE);
    const tdsAmount = this.round(orderTotal * this.TDS_RATE);
    const totalPlatformEarning = this.round(commissionAmount + gstOnCommission);
    const sellerEarning = this.round(orderTotal - commissionAmount - gstOnCommission - tdsAmount);

    const feeBreakdown = {
      referralFee: referralFeeAmount,
      closingFee,
      subtotal: commissionAmount,
      gst: gstOnCommission,
      totalPlatformEarning,
      tds: tdsAmount,
      sellerNetPayout: sellerEarning,
    };

    const commission: CommissionRecord = {
      id: `COM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId,
      sellerId,
      orderTotal,
      rate: referralRate,
      referralFee: referralFeeAmount,
      closingFee,
      commissionAmount,
      gstOnCommission,
      tdsAmount,
      sellerEarning,
      serviceType,
      category: category || serviceType,
      tier,
      feeBreakdown,
      calculatedAt: new Date().toISOString(),
    };

    // 3. Store in Redis
    await this.redis.setJson(`commission:${orderId}`, commission, 86400 * 90);

    // 4. Append to seller's commission history
    const historyKey = `commission:history:${sellerId}`;
    const history = (await this.redis.getJson<CommissionRecord[]>(historyKey)) ?? [];
    history.unshift(commission);
    await this.redis.setJson(historyKey, history.slice(0, 500), 86400 * 90);

    // 5. Update aggregate stats
    await this.updateAggregateStats(sellerId, serviceType, commissionAmount, sellerEarning, gstOnCommission, tdsAmount);

    // 6. Publish Kafka events for downstream (wallet-service, payout-service)
    await this.kafka.publish('commission.calculated', {
      id: commission.id,
      orderId,
      sellerId,
      commissionAmount,
      gstOnCommission,
      tdsAmount,
      sellerEarning,
      totalPlatformEarning,
      rate: referralRate,
      tier,
      feeBreakdown,
    });

    // 7. Trigger wallet splits
    await this.kafka.publish('wallet.credit.seller', {
      sellerId,
      amount: sellerEarning,
      reason: `Order ${orderId} payout (after commission + GST + TDS)`,
      referenceId: orderId,
      module: serviceType,
    });

    await this.kafka.publish('wallet.credit.platform', {
      walletId: this.PLATFORM_WALLET_ID,
      amount: totalPlatformEarning,
      reason: `Commission from order ${orderId}`,
      referenceId: orderId,
      module: serviceType,
      breakdown: feeBreakdown,
    });

    this.logger.log(
      `Commission calculated: ${orderId} → ${sellerId} | ` +
      `Referral: ${(referralRate * 100).toFixed(1)}% (₹${referralFeeAmount}) + Closing: ₹${closingFee} | ` +
      `Commission: ₹${commissionAmount} + GST: ₹${gstOnCommission} + TDS: ₹${tdsAmount} | ` +
      `Platform: ₹${totalPlatformEarning} | Seller: ₹${sellerEarning} | Tier: ${tier}`,
    );

    return commission;
  }

  // ── Category Rate Resolution ──────────────────────────────────────────────
  private resolveCategoryRate(category: string, subCategory?: string): CategoryRate {
    // Try exact sub-category match first
    if (subCategory) {
      const exact = this.categoryRates.find(
        r => r.category.toLowerCase() === category.toLowerCase()
          && r.subCategory?.toLowerCase() === subCategory.toLowerCase(),
      );
      if (exact) return exact;
    }

    // Try category-level match
    const catMatch = this.categoryRates.find(
      r => r.category.toLowerCase() === category.toLowerCase() && !r.subCategory,
    );
    if (catMatch) return catMatch;

    // Fallback: marketplace default
    return {
      category: 'Default',
      referralRate: 0.12,
      closingFee: 15,
      closingFeeThreshold: 500,
      minCommission: 1,
    };
  }

  // ── Get / Set Category Rates ──────────────────────────────────────────────
  async getCategoryRateCard() {
    const overrides = await this.redis.getJson<CategoryRate[]>('commission:category-rates') ?? [];
    const mergedRates = [...this.categoryRates];

    // Apply any admin overrides
    for (const override of overrides) {
      const idx = mergedRates.findIndex(
        r => r.category === override.category && r.subCategory === override.subCategory,
      );
      if (idx >= 0) mergedRates[idx] = override;
      else mergedRates.push(override);
    }

    return mergedRates;
  }

  async updateCategoryRate(category: string, subCategory: string | undefined, updates: Partial<CategoryRate>) {
    const overrides = await this.redis.getJson<CategoryRate[]>('commission:category-rates') ?? [];
    const idx = overrides.findIndex(
      r => r.category === category && r.subCategory === subCategory,
    );

    const base = this.resolveCategoryRate(category, subCategory);
    const updated = { ...base, ...updates, category, subCategory };

    if (idx >= 0) overrides[idx] = updated;
    else overrides.push(updated);

    await this.redis.setJson('commission:category-rates', overrides, 86400 * 365);
    await this.kafka.publish('commission.category-rate.updated', { category, subCategory, rate: updated });
    return { success: true, rate: updated };
  }

  // ── Seller-Specific Overrides ─────────────────────────────────────────────
  async getSellerOverride(sellerId: string, serviceType: string): Promise<SellerOverride | null> {
    const override = await this.redis.getJson<SellerOverride>(`commission:override:${sellerId}:${serviceType}`);
    if (!override) return null;

    // Check expiry
    if (override.expiresAt && new Date(override.expiresAt) < new Date()) {
      await this.redis.del(`commission:override:${sellerId}:${serviceType}`);
      return null;
    }
    return override;
  }

  async setSellerOverride(sellerId: string, serviceType: string, rate: number, reason: string, expiresAt?: string) {
    const override: SellerOverride = { sellerId, rate, reason, expiresAt: expiresAt ?? null };
    await this.redis.setJson(`commission:override:${sellerId}:${serviceType}`, override, 86400 * 365);
    await this.kafka.publish('commission.seller-override.set', { sellerId, serviceType, rate, reason });
    return { success: true, override };
  }

  async removeSellerOverride(sellerId: string, serviceType: string) {
    await this.redis.del(`commission:override:${sellerId}:${serviceType}`);
    return { success: true };
  }

  // ── Get Commission by Order ───────────────────────────────────────────────
  async getCommissionByOrder(orderId: string) {
    const commission = await this.redis.getJson<CommissionRecord>(`commission:${orderId}`);
    if (!commission) {
      return { success: false, reason: 'Commission record not found' };
    }
    return { success: true, ...commission };
  }

  // ── Get Seller Commissions (with pagination) ──────────────────────────────
  async getSellerCommissions(sellerId: string, page = 1, limit = 20) {
    const historyKey = `commission:history:${sellerId}`;
    const history = (await this.redis.getJson<CommissionRecord[]>(historyKey)) ?? [];
    const start = (page - 1) * limit;

    return {
      sellerId,
      data: history.slice(start, start + limit),
      total: history.length,
      page,
      limit,
      hasMore: history.length > start + limit,
    };
  }

  // ── Get Total Commission (Platform Revenue) ───────────────────────────────
  async getTotalCommission(startDate: string, endDate: string, serviceType?: string) {
    const statsKey = serviceType
      ? `commission:stats:daily:${serviceType}`
      : 'commission:stats:daily:all';
    const stats = (await this.redis.getJson<any>(statsKey)) ?? {};

    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalCommission = 0;
    let totalGst = 0;
    let totalTds = 0;
    let totalSellerEarnings = 0;
    let totalOrders = 0;

    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      if (stats[dateKey]) {
        totalCommission += stats[dateKey].commission ?? 0;
        totalGst += stats[dateKey].gst ?? 0;
        totalTds += stats[dateKey].tds ?? 0;
        totalSellerEarnings += stats[dateKey].sellerEarnings ?? 0;
        totalOrders += stats[dateKey].orders ?? 0;
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      startDate,
      endDate,
      serviceType: serviceType ?? 'all',
      totalCommission: this.round(totalCommission),
      totalGst: this.round(totalGst),
      totalTds: this.round(totalTds),
      totalPlatformRevenue: this.round(totalCommission + totalGst),
      totalSellerEarnings: this.round(totalSellerEarnings),
      totalOrders,
      avgCommissionRate: totalOrders > 0
        ? this.round((totalCommission / (totalCommission + totalSellerEarnings)) * 100)
        : 0,
    };
  }

  // ── Get Platform Revenue Summary (for Admin Dashboard) ────────────────────
  async getPlatformRevenueSummary() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().split('T')[0];

    const [todayStats, weekStats, monthStats] = await Promise.all([
      this.getTotalCommission(today, today),
      this.getTotalCommission(weekAgo, today),
      this.getTotalCommission(monthAgo, today),
    ]);

    // Module-wise breakdown
    const moduleBreakdown = await Promise.all(
      Object.keys(this.defaultRates).map(async svc => {
        const stats = await this.getTotalCommission(weekAgo, today, svc);
        return { module: svc, ...stats };
      }),
    );

    return {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      moduleBreakdown,
    };
  }

  // ── Commission Rate Configuration ─────────────────────────────────────────
  async getCommissionRates() {
    const rates: Record<string, CommissionRate> = {};
    for (const [key, defaultRate] of Object.entries(this.defaultRates)) {
      const override = await this.redis.getJson<CommissionRate>(`commission:rates:${key}`);
      rates[key] = override ?? defaultRate;
    }
    return rates;
  }

  async updateCommissionRate(serviceType: string, rateConfig: Partial<CommissionRate>) {
    const current = await this.getCommissionRateConfig(serviceType);
    const updated = { ...current, ...rateConfig };
    await this.redis.setJson(`commission:rates:${serviceType}`, updated, 86400 * 365);
    await this.kafka.publish('commission.rate.updated', { serviceType, rate: updated });
    return { success: true, serviceType, rate: updated };
  }

  // ── Private: Get Rate Config ──────────────────────────────────────────────
  private async getCommissionRateConfig(serviceType: string): Promise<CommissionRate> {
    const override = await this.redis.getJson<CommissionRate>(`commission:rates:${serviceType}`);
    return override ?? this.defaultRates[serviceType] ?? this.defaultRates.marketplace;
  }

  // ── Private: Get Seller Stats ─────────────────────────────────────────────
  private async getSellerStats(sellerId: string) {
    const stats = await this.redis.getJson<any>(`commission:seller:stats:${sellerId}`);
    return stats ?? { totalOrders: 0, totalCommission: 0, totalEarnings: 0 };
  }

  // ── Private: Update Aggregate Stats ───────────────────────────────────────
  private async updateAggregateStats(
    sellerId: string,
    serviceType: string,
    commission: number,
    earnings: number,
    gst: number,
    tds: number,
  ) {
    // Seller-level stats
    const sellerStats = await this.getSellerStats(sellerId);
    sellerStats.totalOrders++;
    sellerStats.totalCommission += commission;
    sellerStats.totalEarnings += earnings;
    sellerStats.totalGst = (sellerStats.totalGst ?? 0) + gst;
    sellerStats.totalTds = (sellerStats.totalTds ?? 0) + tds;
    await this.redis.setJson(`commission:seller:stats:${sellerId}`, sellerStats, 86400 * 365);

    // Daily platform stats (per service type + global)
    const today = new Date().toISOString().split('T')[0];
    for (const key of [`commission:stats:daily:${serviceType}`, 'commission:stats:daily:all']) {
      const dailyStats = (await this.redis.getJson<any>(key)) ?? {};
      if (!dailyStats[today]) {
        dailyStats[today] = { commission: 0, gst: 0, tds: 0, sellerEarnings: 0, orders: 0 };
      }
      dailyStats[today].commission += commission;
      dailyStats[today].gst += gst;
      dailyStats[today].tds += tds;
      dailyStats[today].sellerEarnings += earnings;
      dailyStats[today].orders++;
      await this.redis.setJson(key, dailyStats, 86400 * 90);
    }
  }

  // ── Private: Round to 2 decimal places ────────────────────────────────────
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
