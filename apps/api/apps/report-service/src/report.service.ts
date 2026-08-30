import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

// ─── Report Types ────────────────────────────────────────────────────────────
export enum ReportType {
  REVENUE = 'revenue',
  ORDERS = 'orders',
  SELLER = 'seller',
  DRIVER = 'driver',
  USER_ACQUISITION = 'userAcquisition',
  MODULE_PERFORMANCE = 'modulePerformance',
  DELIVERY = 'delivery',
  COMMISSION = 'commission',
}

interface ReportMeta {
  id: string;
  reportType: ReportType;
  generatedAt: string;
  generatedBy?: string;
  cached: boolean;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async healthCheck() {
    return { service: 'report-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Revenue Report ─────────────────────────────────────────────────────────
  async generateRevenueReport(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
    const cacheKey = `report:revenue:${startDate}:${endDate}:${groupBy}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return { ...cached, cached: true };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const data: any[] = [];

    // Aggregate revenue data from Redis counters
    const current = new Date(start);
    let totalRevenue = 0;
    let totalOrders = 0;

    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const dayRevenue = parseFloat(await this.redis.get(`admin:counter:revenue:${dateKey}`) ?? '0');
      const dayOrders = parseInt(await this.redis.get(`admin:counter:orders:${dateKey}`) ?? '0', 10);

      if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
        data.push({
          date: dateKey,
          revenue: dayRevenue,
          orders: dayOrders,
          avgOrderValue: dayOrders > 0 ? Math.round((dayRevenue / dayOrders) * 100) / 100 : 0,
        });
      }

      totalRevenue += dayRevenue;
      totalOrders += dayOrders;
      current.setDate(current.getDate() + 1);
    }

    // Group by week or month if requested
    let groupedData = data;
    if (groupBy === 'week') {
      groupedData = this.groupByWeek(data);
    } else if (groupBy === 'month') {
      groupedData = this.groupByMonth(data);
    }

    // Revenue breakdown by module
    const moduleBreakdown: Record<string, { revenue: number; orders: number }> = {};
    const modules = ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'hotel', 'taxi'];
    for (const mod of modules) {
      const modRevenue = parseFloat(await this.redis.get(`admin:counter:revenue:${mod}`) ?? '0');
      const modOrders = parseInt(await this.redis.get(`admin:counter:orders:${mod}`) ?? '0', 10);
      moduleBreakdown[mod] = { revenue: modRevenue, orders: modOrders };
    }

    const report = {
      id: `RPT-${Date.now()}`,
      reportType: ReportType.REVENUE,
      startDate,
      endDate,
      groupBy,
      data: groupedData,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      moduleBreakdown,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await this.redis.setJson(cacheKey, report, 3600);
    return report;
  }

  // ── Order Report ───────────────────────────────────────────────────────────
  async generateOrderReport(startDate: string, endDate: string, serviceType?: string) {
    const cacheKey = `report:orders:${startDate}:${endDate}:${serviceType ?? 'all'}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return { ...cached, cached: true };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const data: any[] = [];
    let totalOrders = 0;
    let totalRevenue = 0;

    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const key = serviceType
        ? `admin:counter:orders:${serviceType}:${dateKey}`
        : `admin:counter:orders:${dateKey}`;
      const revKey = serviceType
        ? `admin:counter:revenue:${serviceType}:${dateKey}`
        : `admin:counter:revenue:${dateKey}`;

      const dayOrders = parseInt(await this.redis.get(key) ?? '0', 10);
      const dayRevenue = parseFloat(await this.redis.get(revKey) ?? '0');

      data.push({ date: dateKey, orders: dayOrders, revenue: dayRevenue });
      totalOrders += dayOrders;
      totalRevenue += dayRevenue;
      current.setDate(current.getDate() + 1);
    }

    // Order status distribution
    const statusKeys = ['completed', 'cancelled', 'pending', 'processing', 'delivered'];
    const statusDistribution: Record<string, number> = {};
    for (const status of statusKeys) {
      statusDistribution[status] = parseInt(
        await this.redis.get(`admin:counter:orders:${status}`) ?? '0', 10,
      );
    }

    const report = {
      id: `RPT-${Date.now()}`,
      reportType: ReportType.ORDERS,
      startDate,
      endDate,
      serviceType: serviceType ?? 'all',
      data,
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      statusDistribution,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await this.redis.setJson(cacheKey, report, 3600);
    return report;
  }

  // ── Seller Performance Report ──────────────────────────────────────────────
  async generateSellerReport(sellerId: string, period: string) {
    const cacheKey = `report:seller:${sellerId}:${period}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return { ...cached, cached: true };

    // Gather seller metrics from Redis
    const sellerStats = await this.redis.getJson<any>(`commission:seller:stats:${sellerId}`) ?? {};
    const commissionHistory = (await this.redis.getJson<any[]>(`commission:history:${sellerId}`)) ?? [];
    const payoutIndex = (await this.redis.getJson<string[]>(`payout:index:seller:${sellerId}`)) ?? [];

    // Calculate period-specific metrics
    let periodOrders = 0;
    let periodRevenue = 0;
    let periodCommissions = 0;

    for (const record of commissionHistory) {
      if (this.isWithinPeriod(record.calculatedAt, period)) {
        periodOrders++;
        periodRevenue += record.sellerEarning;
        periodCommissions += record.commissionAmount;
      }
    }

    // Get refund count for this seller
    const refundKeys = await this.redis.keys(`refund:RFD-*`);
    let refundCount = 0;
    let refundAmount = 0;
    for (const key of refundKeys.slice(0, 100)) {
      const refund = await this.redis.getJson<any>(key);
      if (refund && refund.sellerId === sellerId) {
        refundCount++;
        refundAmount += refund.amount;
      }
    }

    const report = {
      id: `RPT-${Date.now()}`,
      reportType: ReportType.SELLER,
      sellerId,
      period,
      lifetime: {
        totalOrders: sellerStats.totalOrders ?? 0,
        totalEarnings: sellerStats.totalEarnings ?? 0,
        totalCommissions: sellerStats.totalCommission ?? 0,
      },
      periodMetrics: {
        orders: periodOrders,
        revenue: Math.round(periodRevenue * 100) / 100,
        commissions: Math.round(periodCommissions * 100) / 100,
        refunds: refundCount,
        refundAmount: Math.round(refundAmount * 100) / 100,
        avgOrderValue: periodOrders > 0 ? Math.round((periodRevenue / periodOrders) * 100) / 100 : 0,
      },
      payoutCount: payoutIndex.length,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await this.redis.setJson(cacheKey, report, 1800);
    return report;
  }

  // ── Driver Performance Report ──────────────────────────────────────────────
  async generateDriverReport(driverId: string, period: string) {
    const cacheKey = `report:driver:${driverId}:${period}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return { ...cached, cached: true };

    // Gather driver metrics from Redis
    const driverStats = await this.redis.getJson<any>(`taxi:driver:stats:${driverId}`) ?? {};
    const deliveryKeys = await this.redis.keys(`delivery:assignment:*`);

    let totalTrips = 0;
    let totalEarnings = 0;
    let totalDistance = 0;

    for (const key of deliveryKeys.slice(0, 200)) {
      const delivery = await this.redis.getJson<any>(key);
      if (delivery && delivery.partnerId === driverId) {
        if (this.isWithinPeriod(delivery.assignedAt, period)) {
          totalTrips++;
          totalEarnings += delivery.fare ?? 0;
          totalDistance += delivery.distanceKm ?? 0;
        }
      }
    }

    const report = {
      id: `RPT-${Date.now()}`,
      reportType: ReportType.DRIVER,
      driverId,
      period,
      trips: totalTrips,
      earnings: Math.round(totalEarnings * 100) / 100,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      avgTripDistance: totalTrips > 0 ? Math.round((totalDistance / totalTrips) * 100) / 100 : 0,
      avgEarningPerTrip: totalTrips > 0 ? Math.round((totalEarnings / totalTrips) * 100) / 100 : 0,
      onlineHours: driverStats.onlineHours ?? 0,
      rating: driverStats.rating ?? 0,
      acceptanceRate: driverStats.acceptanceRate ?? 0,
      cancellationRate: driverStats.cancellationRate ?? 0,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await this.redis.setJson(cacheKey, report, 1800);
    return report;
  }

  // ── User Acquisition Report ────────────────────────────────────────────────
  async generateUserAcquisitionReport(startDate: string, endDate: string) {
    const cacheKey = `report:acquisition:${startDate}:${endDate}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return { ...cached, cached: true };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const data: any[] = [];
    let totalNewUsers = 0;

    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const newUsers = parseInt(await this.redis.get(`admin:counter:new_users:${dateKey}`) ?? '0', 10);
      const activeUsers = parseInt(await this.redis.get(`admin:counter:active_users:${dateKey}`) ?? '0', 10);

      data.push({ date: dateKey, newUsers, activeUsers });
      totalNewUsers += newUsers;
      current.setDate(current.getDate() + 1);
    }

    const totalUsers = parseInt(await this.redis.get('admin:counter:users') ?? '0', 10);

    const report = {
      id: `RPT-${Date.now()}`,
      reportType: ReportType.USER_ACQUISITION,
      startDate,
      endDate,
      data,
      totalNewUsers,
      totalUsers,
      avgDailySignups: data.length > 0 ? Math.round(totalNewUsers / data.length) : 0,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await this.redis.setJson(cacheKey, report, 3600);
    return report;
  }

  // ── Module Performance Report ──────────────────────────────────────────────
  async generateModulePerformanceReport(period: string) {
    const cacheKey = `report:module_performance:${period}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return { ...cached, cached: true };

    const modules = ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'hotel', 'taxi'];
    const moduleMetrics: any[] = [];

    for (const mod of modules) {
      const revenue = parseFloat(await this.redis.get(`admin:counter:revenue:${mod}`) ?? '0');
      const orders = parseInt(await this.redis.get(`admin:counter:orders:${mod}`) ?? '0', 10);
      const sellers = parseInt(await this.redis.get(`admin:counter:sellers:${mod}`) ?? '0', 10);

      moduleMetrics.push({
        module: mod,
        revenue: Math.round(revenue * 100) / 100,
        orders,
        sellers,
        avgOrderValue: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
      });
    }

    // Sort by revenue descending
    moduleMetrics.sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = moduleMetrics.reduce((sum, m) => sum + m.revenue, 0);

    const report = {
      id: `RPT-${Date.now()}`,
      reportType: ReportType.MODULE_PERFORMANCE,
      period,
      modules: moduleMetrics.map((m) => ({
        ...m,
        revenueShare: totalRevenue > 0 ? Math.round((m.revenue / totalRevenue) * 10000) / 100 : 0,
      })),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      topModule: moduleMetrics[0]?.module ?? 'none',
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await this.redis.setJson(cacheKey, report, 3600);
    return report;
  }

  // ── Schedule Report ────────────────────────────────────────────────────────
  async scheduleReport(dto: {
    reportType: string;
    schedule: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    parameters: Record<string, unknown>;
  }) {
    const scheduleId = `SCHED-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const schedule = {
      id: scheduleId,
      ...dto,
      active: true,
      createdAt: new Date().toISOString(),
      lastRun: null as string | null,
      nextRun: this.calculateNextRun(dto.schedule),
    };

    await this.redis.setJson(`report:schedule:${scheduleId}`, schedule, 86400 * 365);

    // Add to active schedules index
    const activeSchedules = (await this.redis.getJson<string[]>('report:schedules:active')) ?? [];
    activeSchedules.push(scheduleId);
    await this.redis.setJson('report:schedules:active', activeSchedules, 86400 * 365);

    this.logger.log(`Report schedule created: ${scheduleId} — ${dto.reportType} ${dto.schedule}`);
    return { success: true, scheduleId, nextRun: schedule.nextRun };
  }

  // ── Get Scheduled Reports ──────────────────────────────────────────────────
  async getScheduledReports() {
    const scheduleIds = (await this.redis.getJson<string[]>('report:schedules:active')) ?? [];
    const schedules: any[] = [];

    for (const id of scheduleIds) {
      const schedule = await this.redis.getJson<any>(`report:schedule:${id}`);
      if (schedule) schedules.push(schedule);
    }

    return { schedules, total: schedules.length };
  }

  // ── Cancel Scheduled Report ────────────────────────────────────────────────
  async cancelScheduledReport(scheduleId: string) {
    const schedule = await this.redis.getJson<any>(`report:schedule:${scheduleId}`);
    if (!schedule) return { success: false, reason: 'Schedule not found' };

    schedule.active = false;
    await this.redis.setJson(`report:schedule:${scheduleId}`, schedule, 86400 * 365);

    const activeSchedules = (await this.redis.getJson<string[]>('report:schedules:active')) ?? [];
    await this.redis.setJson(
      'report:schedules:active',
      activeSchedules.filter((id) => id !== scheduleId),
      86400 * 365,
    );

    return { success: true, scheduleId, status: 'cancelled' };
  }

  // ── Private Helpers ────────────────────────────────────────────────────────
  private isWithinPeriod(dateStr: string, period: string): boolean {
    const date = new Date(dateStr);
    const now = new Date();

    switch (period) {
      case 'today':
        return date.toISOString().split('T')[0] === now.toISOString().split('T')[0];
      case 'week':
        return now.getTime() - date.getTime() <= 7 * 86400 * 1000;
      case 'month':
        return now.getTime() - date.getTime() <= 30 * 86400 * 1000;
      case 'quarter':
        return now.getTime() - date.getTime() <= 90 * 86400 * 1000;
      case 'year':
        return now.getTime() - date.getTime() <= 365 * 86400 * 1000;
      default:
        return true;
    }
  }

  private groupByWeek(data: any[]): any[] {
    const weeks: Record<string, any> = {};
    for (const d of data) {
      const date = new Date(d.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) weeks[weekKey] = { week: weekKey, revenue: 0, orders: 0 };
      weeks[weekKey].revenue += d.revenue;
      weeks[weekKey].orders += d.orders;
    }
    return Object.values(weeks).map((w: any) => ({
      ...w,
      revenue: Math.round(w.revenue * 100) / 100,
      avgOrderValue: w.orders > 0 ? Math.round((w.revenue / w.orders) * 100) / 100 : 0,
    }));
  }

  private groupByMonth(data: any[]): any[] {
    const months: Record<string, any> = {};
    for (const d of data) {
      const monthKey = d.date.slice(0, 7); // YYYY-MM
      if (!months[monthKey]) months[monthKey] = { month: monthKey, revenue: 0, orders: 0 };
      months[monthKey].revenue += d.revenue;
      months[monthKey].orders += d.orders;
    }
    return Object.values(months).map((m: any) => ({
      ...m,
      revenue: Math.round(m.revenue * 100) / 100,
      avgOrderValue: m.orders > 0 ? Math.round((m.revenue / m.orders) * 100) / 100 : 0,
    }));
  }

  private calculateNextRun(schedule: 'daily' | 'weekly' | 'monthly'): string {
    const next = new Date();
    next.setHours(6, 0, 0, 0); // Default: 6:00 AM
    switch (schedule) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 - next.getDay())); // Next Sunday
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1, 1); // First of next month
        break;
    }
    return next.toISOString();
  }
}
