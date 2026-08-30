import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Franchise } from './entities/franchise.entity';

/**
 * FranchiseService
 *
 * franchise-service owns exactly ONE table: `franchises`. Every other fact it
 * reports — grocery stores, restaurant orders, pharmacy stock, clinic appointments,
 * marketplace sellers — belongs to another module and is fetched from that module's
 * own service over TCP.
 *
 * It previously reached into those tables with raw SQL. Because it did not own the
 * schemas it guessed at them, and every single vertical was broken in production:
 *   • grocery   — filtered `status = 'ACTIVE'`, but the enum is PENDING_KYC/APPROVED/
 *                 SUSPENDED; also selected `total_products` and `revenue`, no such columns
 *   • restaurant— filtered `franchise_id`, but the column is `franchiseId`
 *   • pharmacy  — filtered `franchise_id` (actual: `franchiseId`), read `stock_quantity`
 *                 (actual: `stockLevel`) and `license_verified` (does not exist)
 *   • doctor    — joined `appointments.clinic_id`, which does not exist; appointments
 *                 reach a clinic via doctorId → doctors.clinicId
 *   • marketplace — the FranchiseSeller shadow entity declared six columns `sellers`
 *                 has never had
 * Each failure was swallowed by a catch block that returned zeros, so the dashboards
 * showed plausible-looking empty data instead of an error.
 */
@Injectable()
export class FranchiseService {
  private readonly logger = new Logger(FranchiseService.name);

  /** Upstream module calls must not hang a franchise dashboard render. */
  private static readonly RPC_TIMEOUT_MS = 5000;

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(Franchise)
    private readonly franchiseRepo: Repository<Franchise>,
    @Inject('MARKETPLACE_SERVICE') private readonly marketplace: ClientProxy,
    @Inject('GROCERY_SERVICE') private readonly grocery: ClientProxy,
    @Inject('RESTAURANT_SERVICE') private readonly restaurant: ClientProxy,
    @Inject('PHARMACY_SERVICE') private readonly pharmacy: ClientProxy,
    @Inject('DOCTOR_SERVICE') private readonly doctor: ClientProxy,
  ) {}

  /**
   * Single call path to another module.
   *
   * On failure it logs and returns `fallback`, preserving the previous
   * degrade-rather-than-500 behaviour — but the failure is now a real
   * transport/service error worth alerting on, not a silent schema mismatch.
   */
  private async call<T>(client: ClientProxy, cmd: string, payload: Record<string, unknown>, fallback: T): Promise<T> {
    return firstValueFrom(
      client.send<T>({ cmd }, payload).pipe(
        timeout(FranchiseService.RPC_TIMEOUT_MS),
        catchError((err) => {
          this.logger.error(`RPC ${cmd} failed: ${err?.message ?? err}`);
          return of(fallback);
        }),
      ),
    );
  }

  /**
   * Revenue figures leave this service as raw numbers.
   *
   * This used to be `toLakhs`, which returned a pre-formatted string:
   *   `₹${(amount / 100000).toFixed(1)}L`
   *
   * Two problems in one line. The currency symbol was hardcoded, so a
   * franchisee in Doha read their revenue in rupees. And "lakh" is an Indian
   * numbering unit — dividing by 100,000 and appending "L" is meaningless in
   * every other market this platform serves.
   *
   * Formatting money is the client's job, because only the client knows the
   * viewer's market: `formatCurrencyValue` on the region context already
   * resolves it. A backend that formats currency has to guess, and this one
   * guessed the same way for everybody.
   */
  private revenueValue(amount: unknown): number {
    const n = Number(amount ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  // ─── CORE ──────────────────────────────────────────────────────────────────

  async healthCheck() {
    return { service: 'franchise-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Which franchise, if any, the signed-in user owns.
   *
   * Every page under `/franchise` opened with `const franchiseId = 'FRAN-123'`
   * and the comment "Temporary hardcoded franchise ID", because there was no way
   * to get from a user to their estate: the JWT carries no franchise claim and
   * nothing resolved one. `franchises.owner_id` has always held the answer — it
   * simply had no reader.
   *
   * Resolved per-request rather than baked into the token, matching how seller
   * store ownership is resolved. A franchise can be transferred or created after
   * sign-in, and a claim minted at login would be stale until the user logged out
   * and back in; that staleness decides authorisation, which is the wrong place
   * for it.
   *
   * Returns null rather than throwing — "this user owns no franchise" is an
   * ordinary answer for the 99% of users who are customers, not an error.
   */
  async getFranchiseByOwner(ownerId: string) {
    if (!ownerId) return null;
    const franchise = await this.franchiseRepo.findOne({ where: { ownerId } });
    if (!franchise) return null;
    return {
      id: franchise.id,
      businessName: franchise.businessName,
      countryCode: franchise.countryCode,
      status: franchise.status,
      operationalZones: franchise.operationalZones ?? [],
    };
  }

  async getFranchiseDashboard(franchiseId: string) {
    const franchise = await this.franchiseRepo.findOne({ where: { id: franchiseId } });
    const counts = await this.call(
      this.marketplace,
      'franchise_marketplace_seller_counts',
      { franchiseId },
      { total: 0, verified: 0 },
    );

    return {
      franchiseId,
      name: franchise?.businessName || 'Unknown Franchise',
      region: franchise?.countryCode || 'N/A',
      totalStores: counts.total,
      activeStores: counts.verified,
      zones: franchise?.operationalZones?.length || 0,
      commissionRates: franchise?.commissionRates || {},
      status: franchise?.status || 'unknown',
    };
  }

  async getFranchiseStores(franchiseId: string, page = 1, limit = 20) {
    const { sellers, total } = await this.call(
      this.marketplace,
      'franchise_marketplace_sellers',
      { franchiseId, page, limit },
      { sellers: [] as unknown[], total: 0 },
    );
    return { franchiseId, data: sellers, total, page, limit };
  }

  async getStorePerformance(franchiseId: string, storeId: string, period: string) {
    return { franchiseId, storeId, period, revenue: 0, orders: 0, avgRating: 0, complaints: 0 };
  }

  async submitComplianceReport(franchiseId: string, storeId: string, dto: Record<string, unknown>) {
    const reportId = `COMP-${Date.now()}`;
    const report = { id: reportId, franchiseId, storeId, ...dto, submittedAt: new Date().toISOString() };
    await this.redis.setJson(`compliance:${reportId}`, report, 86400 * 30);
    await this.kafka.publish('franchise.compliance.submitted', { id: reportId, franchiseId, storeId });
    return { success: true, report };
  }

  async registerFranchise(dto: Record<string, unknown>) {
    const franchise = this.franchiseRepo.create({
      ownerId: dto['ownerId'] as string,
      businessName: dto['businessName'] as string,
      countryCode: (dto['countryCode'] as string) || 'IN',
      operationalZones: (dto['operationalZones'] as string[]) || [],
      commissionRates: (dto['commissionRates'] as Record<string, number>) || {},
      status: 'pending',
    });
    const saved = await this.franchiseRepo.save(franchise);
    await this.kafka.publish('franchise.registered', { id: saved.id, name: saved.businessName });
    return { success: true, franchise: saved };
  }

  // ─── MARKETPLACE MODULE ────────────────────────────────────────────────────

  async getMarketplaceKpis(franchiseId: string) {
    const kpis = await this.call(
      this.marketplace,
      'franchise_marketplace_kpis',
      { franchiseId },
      { activeSellers: 0, totalProducts: 0, totalOrders: 0, retailRevenue: 0, categoryDistribution: {} },
    );
    return {
      activeSellers: kpis.activeSellers,
      totalProducts: kpis.totalProducts,
      totalOrders: kpis.totalOrders,
      retailRevenue: this.revenueValue(kpis.retailRevenue),
      categoryDistribution: kpis.categoryDistribution,
    };
  }

  async getMarketplaceSellers(franchiseId: string, search?: string, category?: string, status?: string) {
    const { sellers, total } = await this.call(
      this.marketplace,
      'franchise_marketplace_sellers',
      { franchiseId, search, category, status },
      { sellers: [] as any[], total: 0 },
    );

    const mapped = sellers.map((s: any) => ({
      id: s.id,
      name: s.businessName || s.storeSlug || 'Unknown Store',
      location: s.address?.city || 'Unknown',
      rating: s.sellerRating || 0,
      products: s.totalProducts || 0,
      orders: s.totalOrders || 0,
      status:
        s.verificationStatus === 'VERIFIED' ? 'active' : s.verificationStatus === 'SUSPENDED' ? 'suspended' : 'pending',
      joined: s.createdAt
        ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(s.createdAt))
        : 'Unknown',
    }));

    return { franchiseId, sellers: mapped, total, page: 1, limit: 20 };
  }

  async updateSellerStatus(franchiseId: string, sellerId: string, status: string) {
    const result = await this.call(
      this.marketplace,
      'franchise_marketplace_update_seller_status',
      { franchiseId, sellerId, status },
      { success: false, message: 'Marketplace service unavailable' },
    );
    if (result.success) {
      await this.kafka.publish('franchise.marketplace.seller_status_updated', {
        franchiseId, sellerId, newStatus: status, updatedAt: new Date().toISOString(),
      });
    }
    return result;
  }

  // ─── GROCERY MODULE ────────────────────────────────────────────────────────

  async getGroceryKpis(franchiseId: string) {
    const kpis = await this.call(
      this.grocery,
      'franchise_grocery_kpis',
      { franchiseId },
      { activeStores: 0, totalProducts: 0, totalOrders: 0, revenue: 0 },
    );
    return {
      activeStores: kpis.activeStores,
      totalProducts: kpis.totalProducts,
      totalOrders: kpis.totalOrders,
      revenue: this.revenueValue(kpis.revenue),
    };
  }

  async getGroceryStores(franchiseId: string, search?: string, status?: string) {
    return this.call(this.grocery, 'franchise_grocery_stores', { franchiseId, search, status }, { stores: [], total: 0 });
  }

  async getGroceryOrders(franchiseId: string, page = 1, status?: string) {
    return this.call(this.grocery, 'franchise_grocery_orders', { franchiseId, page, status }, { orders: [], total: 0, page });
  }

  async getGroceryProducts(franchiseId: string, search?: string, category?: string) {
    return this.call(this.grocery, 'franchise_grocery_products', { franchiseId, search, category }, { products: [], total: 0 });
  }

  async getGroceryAnalytics(franchiseId: string, period?: string) {
    return this.call(
      this.grocery,
      'franchise_grocery_analytics',
      { franchiseId, period },
      { revenue: 0, orders: 0, period: period || '30d' },
    );
  }

  async getGrocerySettings(franchiseId: string) {
    return this.getModuleSettings(franchiseId, 'grocery');
  }

  async updateGroceryStoreStatus(franchiseId: string, storeId: string, status: string) {
    return this.updateModuleEntityStatus(
      this.grocery, 'franchise_grocery_update_store_status',
      { franchiseId, storeId, status }, 'franchise.grocery.store_status_updated',
      { franchiseId, entityId: storeId, status },
    );
  }

  // ─── RESTAURANT MODULE ─────────────────────────────────────────────────────

  async getRestaurantKpis(franchiseId: string) {
    const kpis = await this.call(
      this.restaurant,
      'franchise_restaurant_kpis',
      { franchiseId },
      { activeRestaurants: 0, totalOrders: 0, revenue: 0, avgRating: 0 },
    );
    return {
      activeRestaurants: kpis.activeRestaurants,
      totalOrders: kpis.totalOrders,
      revenue: this.revenueValue(kpis.revenue),
      avgRating: kpis.avgRating,
    };
  }

  async getRestaurants(franchiseId: string, search?: string, status?: string) {
    return this.call(
      this.restaurant, 'franchise_restaurant_list',
      { franchiseId, search, status }, { restaurants: [], total: 0 },
    );
  }

  async getRestaurantOrders(franchiseId: string, page = 1, status?: string) {
    return this.call(
      this.restaurant, 'franchise_restaurant_orders',
      { franchiseId, page, status }, { orders: [], total: 0, page },
    );
  }

  async getRestaurantMenuStats(franchiseId: string) {
    return this.call(
      this.restaurant, 'franchise_restaurant_menu_stats',
      { franchiseId }, { totalItems: 0, categories: [] },
    );
  }

  async getRestaurantAnalytics(franchiseId: string, period?: string) {
    return this.call(
      this.restaurant, 'franchise_restaurant_analytics',
      { franchiseId, period }, { revenue: 0, orders: 0, period: period || '30d' },
    );
  }

  async updateRestaurantStatus(franchiseId: string, restaurantId: string, status: string) {
    return this.updateModuleEntityStatus(
      this.restaurant, 'franchise_restaurant_update_status',
      { franchiseId, restaurantId, status }, 'franchise.restaurant.status_updated',
      { franchiseId, entityId: restaurantId, status },
    );
  }

  async getRestaurantSettings(franchiseId: string) {
    return this.getModuleSettings(franchiseId, 'restaurant');
  }

  // ─── PHARMACY MODULE ───────────────────────────────────────────────────────

  async getPharmacyKpis(franchiseId: string) {
    const kpis = await this.call(
      this.pharmacy,
      'franchise_pharmacy_kpis',
      { franchiseId },
      { activeStores: 0, totalProducts: 0, totalOrders: 0, revenue: 0 },
    );
    return {
      activeStores: kpis.activeStores,
      totalProducts: kpis.totalProducts,
      totalOrders: kpis.totalOrders,
      revenue: this.revenueValue(kpis.revenue),
    };
  }

  async getPharmacyStores(franchiseId: string, search?: string, status?: string) {
    return this.call(this.pharmacy, 'franchise_pharmacy_stores', { franchiseId, search, status }, { stores: [], total: 0 });
  }

  async getPharmacyOrders(franchiseId: string, page = 1, status?: string) {
    return this.call(this.pharmacy, 'franchise_pharmacy_orders', { franchiseId, page, status }, { orders: [], total: 0, page });
  }

  async getPharmacyInventory(franchiseId: string) {
    return this.call(this.pharmacy, 'franchise_pharmacy_inventory', { franchiseId }, { items: [], lowStock: 0 });
  }

  async getPharmacyCompliance(franchiseId: string) {
    return this.call(this.pharmacy, 'franchise_pharmacy_compliance', { franchiseId }, { compliant: 0, total: 0, issues: [] });
  }

  async getPharmacyAnalytics(franchiseId: string, period?: string) {
    return this.call(
      this.pharmacy, 'franchise_pharmacy_analytics',
      { franchiseId, period }, { revenue: 0, orders: 0, period: period || '30d' },
    );
  }

  async updatePharmacyStoreStatus(franchiseId: string, storeId: string, status: string) {
    return this.updateModuleEntityStatus(
      this.pharmacy, 'franchise_pharmacy_update_store_status',
      { franchiseId, storeId, status }, 'franchise.pharmacy.store_status_updated',
      { franchiseId, entityId: storeId, status },
    );
  }

  async getPharmacySettings(franchiseId: string) {
    return this.getModuleSettings(franchiseId, 'pharmacy');
  }

  // ─── DOCTOR MODULE ─────────────────────────────────────────────────────────

  async getDoctorKpis(franchiseId: string) {
    const kpis = await this.call(
      this.doctor,
      'franchise_doctor_kpis',
      { franchiseId },
      { activeClinics: 0, totalDoctors: 0, todayAppointments: 0, revenue: 0 },
    );
    return {
      activeClinics: kpis.activeClinics,
      totalDoctors: kpis.totalDoctors,
      todayAppointments: kpis.todayAppointments,
      revenue: this.revenueValue(kpis.revenue),
    };
  }

  async getDoctorClinics(franchiseId: string, search?: string, status?: string) {
    return this.call(this.doctor, 'franchise_doctor_clinics', { franchiseId, search, status }, { clinics: [], total: 0 });
  }

  async getDoctorAppointments(franchiseId: string, page = 1, status?: string) {
    return this.call(
      this.doctor, 'franchise_doctor_appointments',
      { franchiseId, page, status }, { appointments: [], total: 0, page },
    );
  }

  async getDoctors(franchiseId: string, specialty?: string) {
    return this.call(this.doctor, 'franchise_doctor_doctors', { franchiseId, search: specialty }, { doctors: [], total: 0 });
  }

  async getDoctorAnalytics(franchiseId: string, period?: string) {
    return this.call(
      this.doctor, 'franchise_doctor_analytics',
      { franchiseId, period }, { revenue: 0, orders: 0, period: period || '30d' },
    );
  }

  async updateDoctorClinicStatus(franchiseId: string, clinicId: string, status: string) {
    return this.updateModuleEntityStatus(
      this.doctor, 'franchise_doctor_update_clinic_status',
      { franchiseId, clinicId, status }, 'franchise.doctor.clinic_status_updated',
      { franchiseId, entityId: clinicId, status },
    );
  }

  async getDoctorSettings(franchiseId: string) {
    return this.getModuleSettings(franchiseId, 'doctor');
  }

  // ─── TAXI MODULE ───────────────────────────────────────────────────────────
  // taxi_* tables carry no franchise_id, so there is no franchise scope to query yet.
  // These stay cache/stub-backed until Taxi gains franchise ownership.

  async getTaxiKpis(franchiseId: string) {
    const cached = await this.redis.getJson(`franchise:${franchiseId}:taxi:kpis`);
    return cached || { totalDrivers: 0, onlineDrivers: 0, todayRides: 0, revenue: '₹0' };
  }

  async getTaxiDrivers(franchiseId: string, search?: string, status?: string) {
    const cached = await this.redis.getJson(`franchise:${franchiseId}:taxi:drivers`);
    return cached || { drivers: [], total: 0 };
  }

  async getTaxiRides(franchiseId: string, page = 1, status?: string) {
    return { rides: [] as unknown[], total: 0, page };
  }

  async getTaxiFleet(franchiseId: string) {
    return { vehicles: [] as unknown[], total: 0 };
  }

  async getTaxiAnalytics(franchiseId: string, period?: string) {
    return { revenue: 0, rides: 0, period: period || '30d' };
  }

  async updateTaxiDriverStatus(franchiseId: string, driverId: string, status: string) {
    await this.kafka.publish('franchise.taxi.driver_status_updated', {
      franchiseId, driverId, status, updatedAt: new Date().toISOString(),
    });
    return { success: true, message: `Driver ${driverId} status updated to ${status}` };
  }

  async getTaxiSettings(franchiseId: string) {
    return this.getModuleSettings(franchiseId, 'taxi');
  }

  // ─── HOTEL MODULE ──────────────────────────────────────────────────────────
  // hotels carry no franchise_id either — same situation as Taxi.

  async getHotelKpis(franchiseId: string) {
    const cached = await this.redis.getJson(`franchise:${franchiseId}:hotel:kpis`);
    return cached || { activeHotels: 0, totalRooms: 0, todayBookings: 0, avgOccupancy: 0, revenue: '₹0' };
  }

  async getHotels(franchiseId: string, search?: string, status?: string) {
    const cached = await this.redis.getJson(`franchise:${franchiseId}:hotel:hotels`);
    return cached || { hotels: [], total: 0 };
  }

  async getHotelBookings(franchiseId: string, page = 1, status?: string) {
    return { bookings: [] as unknown[], total: 0, page };
  }

  async getHotelRooms(franchiseId: string) {
    return { rooms: [] as unknown[], total: 0 };
  }

  async getHotelAnalytics(franchiseId: string, period?: string) {
    return { revenue: 0, occupancy: 0, bookings: 0, period: period || '30d' };
  }

  async updateHotelStatus(franchiseId: string, hotelId: string, status: string) {
    await this.kafka.publish('franchise.hotel.status_updated', {
      franchiseId, hotelId, status, updatedAt: new Date().toISOString(),
    });
    return { success: true, message: `Hotel ${hotelId} status updated to ${status}` };
  }

  async getHotelSettings(franchiseId: string) {
    return this.getModuleSettings(franchiseId, 'hotel');
  }

  // ─── SHARED HELPERS ────────────────────────────────────────────────────────

  private async getModuleSettings(franchiseId: string, module: string) {
    const franchise = await this.franchiseRepo.findOne({ where: { id: franchiseId } });
    const rate = franchise?.commissionRates?.[module] || 0;
    return {
      settings: {
        commissionRate: `${rate}%`,
        franchiseId,
        module,
        lastUpdated: franchise?.updatedAt?.toISOString() || new Date().toISOString(),
      },
    };
  }

  /**
   * Status changes are applied by the module that owns the row, scoped to the
   * franchise — a franchise can never mutate an entity outside its own estate.
   * The old implementation ran `UPDATE ${table} SET status = ...` from here.
   */
  private async updateModuleEntityStatus(
    client: ClientProxy,
    cmd: string,
    payload: Record<string, unknown>,
    kafkaTopic: string,
    event: Record<string, unknown>,
  ) {
    const result = await this.call<{ success: boolean; message: string }>(
      client, cmd, payload, { success: false, message: 'Module service unavailable' },
    );
    if (result.success) {
      await this.kafka.publish(kafkaTopic, { ...event, updatedAt: new Date().toISOString() });
    }
    return result;
  }
}
