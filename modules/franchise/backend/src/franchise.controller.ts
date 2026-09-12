import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FranchiseService } from './franchise.service';
import { RpcAwareExceptionsFilter } from '@app/common';

/**
 * franchise-service's whole transport surface.
 *
 * Every command below that names a franchise carries `scope` — the market the
 * API Gateway resolved from the caller's verified token, set only when that
 * caller is region-locked. `scoped()` is the one place it is enforced, on the
 * way in, because this controller is the only door into `FranchiseService`:
 * asserting in each of the fifty handlers would be fifty copies of one rule,
 * and the copy that got missed would be the hole.
 *
 * This is defence in depth, not the primary control. The gateway's
 * `FranchiseAccessGuard` also refuses a caller who neither owns the franchise
 * nor holds a staff role — but that guard is a gateway artefact, and anything
 * else that learns to send `franchise.get_dashboard` would otherwise be
 * authorised by nothing at all.
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class FranchiseController {
  constructor(private readonly svc: FranchiseService) {}

  /**
   * Run `handler` against a franchise the caller may act in.
   *
   * Validates the id (a missing one used to reach `findOne({ where: { id:
   * undefined } })`, which in TypeORM returns the *first* franchise rather than
   * none) and then refuses a region-locked caller a franchise in another
   * market.
   */
  private async scoped<T>(
    data: { id?: string; scope?: string } | undefined,
    handler: (id: string) => Promise<T> | T,
  ): Promise<T> {
    const id = await this.svc.assertFranchiseInScope(data?.id, data?.scope);
    return handler(id);
  }

  // ─── CORE ──────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.health' })
  health() {
    return this.svc.healthCheck();
  }

  @MessagePattern({ cmd: 'franchise.register' })
  register(@Payload() dto: any) {
    return this.svc.registerFranchise(dto);
  }

  @MessagePattern({ cmd: 'franchise.get_by_owner' })
  getByOwner(@Payload() data: { ownerId: string }) {
    return this.svc.getFranchiseByOwner(data.ownerId);
  }

  /**
   * Owner and market of one franchise, for the gateway's FranchiseAccessGuard.
   *
   * Read-only and deliberately narrow: three fields, no revenue, no estate. It
   * is the answer to "may this caller touch this franchise at all", so it is
   * the one franchise command that cannot itself take a `scope` — resolving it
   * is what produces the decision.
   */
  @MessagePattern({ cmd: 'franchise.get_access' })
  getAccess(@Payload() data: { id: string }) {
    return this.svc.getFranchiseAccess(data?.id);
  }

  // ── Market ──────────────────────────────────────────────────────────────
  //
  // Which country this franchise operates in, and everything that follows from
  // it: currency and its minor units, tax, timezone, locale, and the modules
  // the market actually runs.

  @MessagePattern({ cmd: 'franchise.get_region' })
  getRegion(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getRegionSettings(id));
  }

  /** The markets a franchise may register in — for the registration form. */
  @MessagePattern({ cmd: 'franchise.list_markets' })
  listMarkets() {
    return this.svc.listSupportedMarkets();
  }

  @MessagePattern({ cmd: 'franchise.get_dashboard' })
  getDashboard(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getFranchiseDashboard(id));
  }

  @MessagePattern({ cmd: 'franchise.get_stores' })
  getStores(@Payload() data: { id: string; scope?: string; page?: number; limit?: number }) {
    return this.scoped(data, (id) =>
      this.svc.getFranchiseStores(id, data.page ?? 1, data.limit ?? 20),
    );
  }

  @MessagePattern({ cmd: 'franchise.get_performance' })
  getPerf(@Payload() data: { id: string; scope?: string; storeId: string; period?: string }) {
    return this.scoped(data, (id) =>
      this.svc.getStorePerformance(id, data.storeId, data.period ?? '30d'),
    );
  }

  @MessagePattern({ cmd: 'franchise.submit_compliance' })
  submitCompliance(@Payload() data: { id: string; scope?: string; storeId: string; payload: any }) {
    return this.scoped(data, (id) =>
      this.svc.submitComplianceReport(id, data.storeId, data.payload),
    );
  }

  // ─── MARKETPLACE MODULE ────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.marketplace.get_kpis' })
  getMarketplaceKpis(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getMarketplaceKpis(id));
  }

  @MessagePattern({ cmd: 'franchise.marketplace.get_sellers' })
  getMarketplaceSellers(
    @Payload()
    data: {
      id: string;
      scope?: string;
      search?: string;
      category?: string;
      status?: string;
    },
  ) {
    return this.scoped(data, (id) =>
      this.svc.getMarketplaceSellers(id, data.search, data.category, data.status),
    );
  }

  @MessagePattern({ cmd: 'franchise.marketplace.update_seller_status' })
  updateSellerStatus(
    @Payload() data: { id: string; scope?: string; sellerId: string; status: string },
  ) {
    return this.scoped(data, (id) => this.svc.updateSellerStatus(id, data.sellerId, data.status));
  }

  // ─── GROCERY MODULE ────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.grocery.get_kpis' })
  getGroceryKpis(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getGroceryKpis(id));
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_stores' })
  getGroceryStores(
    @Payload() data: { id: string; scope?: string; search?: string; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getGroceryStores(id, data.search, data.status));
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_orders' })
  getGroceryOrders(
    @Payload() data: { id: string; scope?: string; page?: number; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getGroceryOrders(id, data.page, data.status));
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_products' })
  getGroceryProducts(
    @Payload() data: { id: string; scope?: string; search?: string; category?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getGroceryProducts(id, data.search, data.category));
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_analytics' })
  getGroceryAnalytics(@Payload() data: { id: string; scope?: string; period?: string }) {
    return this.scoped(data, (id) => this.svc.getGroceryAnalytics(id, data.period));
  }

  @MessagePattern({ cmd: 'franchise.grocery.update_store_status' })
  updateGroceryStoreStatus(
    @Payload() data: { id: string; scope?: string; storeId: string; status: string },
  ) {
    return this.scoped(data, (id) =>
      this.svc.updateGroceryStoreStatus(id, data.storeId, data.status),
    );
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_settings' })
  getGrocerySettings(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getGrocerySettings(id));
  }

  // ─── RESTAURANT MODULE ─────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.restaurant.get_kpis' })
  getRestaurantKpis(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getRestaurantKpis(id));
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_restaurants' })
  getRestaurants(
    @Payload() data: { id: string; scope?: string; search?: string; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getRestaurants(id, data.search, data.status));
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_orders' })
  getRestaurantOrders(
    @Payload() data: { id: string; scope?: string; page?: number; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getRestaurantOrders(id, data.page, data.status));
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_menu_stats' })
  getRestaurantMenuStats(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getRestaurantMenuStats(id));
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_analytics' })
  getRestaurantAnalytics(@Payload() data: { id: string; scope?: string; period?: string }) {
    return this.scoped(data, (id) => this.svc.getRestaurantAnalytics(id, data.period));
  }

  @MessagePattern({ cmd: 'franchise.restaurant.update_status' })
  updateRestaurantStatus(
    @Payload() data: { id: string; scope?: string; restaurantId: string; status: string },
  ) {
    return this.scoped(data, (id) =>
      this.svc.updateRestaurantStatus(id, data.restaurantId, data.status),
    );
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_settings' })
  getRestaurantSettings(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getRestaurantSettings(id));
  }

  // ─── PHARMACY MODULE ───────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.pharmacy.get_kpis' })
  getPharmacyKpis(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getPharmacyKpis(id));
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_stores' })
  getPharmacyStores(
    @Payload() data: { id: string; scope?: string; search?: string; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getPharmacyStores(id, data.search, data.status));
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_orders' })
  getPharmacyOrders(
    @Payload() data: { id: string; scope?: string; page?: number; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getPharmacyOrders(id, data.page, data.status));
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_inventory' })
  getPharmacyInventory(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getPharmacyInventory(id));
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_compliance' })
  getPharmacyCompliance(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getPharmacyCompliance(id));
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.update_store_status' })
  updatePharmacyStoreStatus(
    @Payload() data: { id: string; scope?: string; storeId: string; status: string },
  ) {
    return this.scoped(data, (id) =>
      this.svc.updatePharmacyStoreStatus(id, data.storeId, data.status),
    );
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_settings' })
  getPharmacySettings(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getPharmacySettings(id));
  }

  // ─── DOCTOR MODULE ─────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.doctor.get_kpis' })
  getDoctorKpis(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getDoctorKpis(id));
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_clinics' })
  getDoctorClinics(
    @Payload() data: { id: string; scope?: string; search?: string; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getDoctorClinics(id, data.search, data.status));
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_appointments' })
  getDoctorAppointments(
    @Payload() data: { id: string; scope?: string; page?: number; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getDoctorAppointments(id, data.page, data.status));
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_doctors' })
  getDoctorDoctors(@Payload() data: { id: string; scope?: string; specialty?: string }) {
    return this.scoped(data, (id) => this.svc.getDoctors(id, data.specialty));
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_analytics' })
  getDoctorAnalytics(@Payload() data: { id: string; scope?: string; period?: string }) {
    return this.scoped(data, (id) => this.svc.getDoctorAnalytics(id, data.period));
  }

  @MessagePattern({ cmd: 'franchise.doctor.update_clinic_status' })
  updateDoctorClinicStatus(
    @Payload() data: { id: string; scope?: string; clinicId: string; status: string },
  ) {
    return this.scoped(data, (id) =>
      this.svc.updateDoctorClinicStatus(id, data.clinicId, data.status),
    );
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_settings' })
  getDoctorSettings(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getDoctorSettings(id));
  }

  // ─── TAXI MODULE ───────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.taxi.get_kpis' })
  getTaxiKpis(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getTaxiKpis(id));
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_drivers' })
  getTaxiDrivers(
    @Payload() data: { id: string; scope?: string; search?: string; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getTaxiDrivers(id, data.search, data.status));
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_rides' })
  getTaxiRides(@Payload() data: { id: string; scope?: string; page?: number; status?: string }) {
    return this.scoped(data, (id) => this.svc.getTaxiRides(id, data.page, data.status));
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_fleet' })
  getTaxiFleet(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getTaxiFleet(id));
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_analytics' })
  getTaxiAnalytics(@Payload() data: { id: string; scope?: string; period?: string }) {
    return this.scoped(data, (id) => this.svc.getTaxiAnalytics(id, data.period));
  }

  @MessagePattern({ cmd: 'franchise.taxi.update_driver_status' })
  updateTaxiDriverStatus(
    @Payload() data: { id: string; scope?: string; driverId: string; status: string },
  ) {
    return this.scoped(data, (id) =>
      this.svc.updateTaxiDriverStatus(id, data.driverId, data.status),
    );
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_settings' })
  getTaxiSettings(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getTaxiSettings(id));
  }

  // ─── HOTEL MODULE ──────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.hotel.get_kpis' })
  getHotelKpis(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getHotelKpis(id));
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_hotels' })
  getHotels(@Payload() data: { id: string; scope?: string; search?: string; status?: string }) {
    return this.scoped(data, (id) => this.svc.getHotels(id, data.search, data.status));
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_bookings' })
  getHotelBookings(
    @Payload() data: { id: string; scope?: string; page?: number; status?: string },
  ) {
    return this.scoped(data, (id) => this.svc.getHotelBookings(id, data.page, data.status));
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_rooms' })
  getHotelRooms(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getHotelRooms(id));
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_analytics' })
  getHotelAnalytics(@Payload() data: { id: string; scope?: string; period?: string }) {
    return this.scoped(data, (id) => this.svc.getHotelAnalytics(id, data.period));
  }

  @MessagePattern({ cmd: 'franchise.hotel.update_hotel_status' })
  updateHotelStatus(
    @Payload() data: { id: string; scope?: string; hotelId: string; status: string },
  ) {
    return this.scoped(data, (id) => this.svc.updateHotelStatus(id, data.hotelId, data.status));
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_settings' })
  getHotelSettings(@Payload() data: { id: string; scope?: string }) {
    return this.scoped(data, (id) => this.svc.getHotelSettings(id));
  }
}
