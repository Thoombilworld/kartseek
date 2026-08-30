import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FranchiseService } from './franchise.service';
import { RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class FranchiseController {
  constructor(private readonly svc: FranchiseService) {}

  // ─── CORE ──────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.health' })
  health() { return this.svc.healthCheck(); }

  @MessagePattern({ cmd: 'franchise.register' })
  register(@Payload() dto: any) { return this.svc.registerFranchise(dto); }

  @MessagePattern({ cmd: 'franchise.get_by_owner' })
  getByOwner(@Payload() data: { ownerId: string }) { return this.svc.getFranchiseByOwner(data.ownerId); }

  @MessagePattern({ cmd: 'franchise.get_dashboard' })
  getDashboard(@Payload() data: { id: string }) { return this.svc.getFranchiseDashboard(data.id); }

  @MessagePattern({ cmd: 'franchise.get_stores' })
  getStores(@Payload() data: { id: string; page?: number; limit?: number }) { 
    return this.svc.getFranchiseStores(data.id, data.page ?? 1, data.limit ?? 20); 
  }

  @MessagePattern({ cmd: 'franchise.get_performance' })
  getPerf(@Payload() data: { id: string; storeId: string; period?: string }) { 
    return this.svc.getStorePerformance(data.id, data.storeId, data.period ?? '30d'); 
  }

  @MessagePattern({ cmd: 'franchise.submit_compliance' })
  submitCompliance(@Payload() data: { id: string; storeId: string; payload: any }) { 
    return this.svc.submitComplianceReport(data.id, data.storeId, data.payload); 
  }

  // ─── MARKETPLACE MODULE ────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.marketplace.get_kpis' })
  getMarketplaceKpis(@Payload() data: { id: string }) {
    return this.svc.getMarketplaceKpis(data.id);
  }

  @MessagePattern({ cmd: 'franchise.marketplace.get_sellers' })
  getMarketplaceSellers(@Payload() data: { id: string; search?: string; category?: string; status?: string }) {
    return this.svc.getMarketplaceSellers(data.id, data.search, data.category, data.status);
  }

  @MessagePattern({ cmd: 'franchise.marketplace.update_seller_status' })
  updateSellerStatus(@Payload() data: { id: string; sellerId: string; status: string }) {
    return this.svc.updateSellerStatus(data.id, data.sellerId, data.status);
  }

  // ─── GROCERY MODULE ────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.grocery.get_kpis' })
  getGroceryKpis(@Payload() data: { id: string }) {
    return this.svc.getGroceryKpis(data.id);
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_stores' })
  getGroceryStores(@Payload() data: { id: string; search?: string; status?: string }) {
    return this.svc.getGroceryStores(data.id, data.search, data.status);
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_orders' })
  getGroceryOrders(@Payload() data: { id: string; page?: number; status?: string }) {
    return this.svc.getGroceryOrders(data.id, data.page, data.status);
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_products' })
  getGroceryProducts(@Payload() data: { id: string; search?: string; category?: string }) {
    return this.svc.getGroceryProducts(data.id, data.search, data.category);
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_analytics' })
  getGroceryAnalytics(@Payload() data: { id: string; period?: string }) {
    return this.svc.getGroceryAnalytics(data.id, data.period);
  }

  @MessagePattern({ cmd: 'franchise.grocery.update_store_status' })
  updateGroceryStoreStatus(@Payload() data: { id: string; storeId: string; status: string }) {
    return this.svc.updateGroceryStoreStatus(data.id, data.storeId, data.status);
  }

  @MessagePattern({ cmd: 'franchise.grocery.get_settings' })
  getGrocerySettings(@Payload() data: { id: string }) {
    return this.svc.getGrocerySettings(data.id);
  }

  // ─── RESTAURANT MODULE ─────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.restaurant.get_kpis' })
  getRestaurantKpis(@Payload() data: { id: string }) {
    return this.svc.getRestaurantKpis(data.id);
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_restaurants' })
  getRestaurants(@Payload() data: { id: string; search?: string; status?: string }) {
    return this.svc.getRestaurants(data.id, data.search, data.status);
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_orders' })
  getRestaurantOrders(@Payload() data: { id: string; page?: number; status?: string }) {
    return this.svc.getRestaurantOrders(data.id, data.page, data.status);
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_menu_stats' })
  getRestaurantMenuStats(@Payload() data: { id: string }) {
    return this.svc.getRestaurantMenuStats(data.id);
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_analytics' })
  getRestaurantAnalytics(@Payload() data: { id: string; period?: string }) {
    return this.svc.getRestaurantAnalytics(data.id, data.period);
  }

  @MessagePattern({ cmd: 'franchise.restaurant.update_status' })
  updateRestaurantStatus(@Payload() data: { id: string; restaurantId: string; status: string }) {
    return this.svc.updateRestaurantStatus(data.id, data.restaurantId, data.status);
  }

  @MessagePattern({ cmd: 'franchise.restaurant.get_settings' })
  getRestaurantSettings(@Payload() data: { id: string }) {
    return this.svc.getRestaurantSettings(data.id);
  }

  // ─── PHARMACY MODULE ───────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.pharmacy.get_kpis' })
  getPharmacyKpis(@Payload() data: { id: string }) {
    return this.svc.getPharmacyKpis(data.id);
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_stores' })
  getPharmacyStores(@Payload() data: { id: string; search?: string; status?: string }) {
    return this.svc.getPharmacyStores(data.id, data.search, data.status);
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_orders' })
  getPharmacyOrders(@Payload() data: { id: string; page?: number; status?: string }) {
    return this.svc.getPharmacyOrders(data.id, data.page, data.status);
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_inventory' })
  getPharmacyInventory(@Payload() data: { id: string }) {
    return this.svc.getPharmacyInventory(data.id);
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_compliance' })
  getPharmacyCompliance(@Payload() data: { id: string }) {
    return this.svc.getPharmacyCompliance(data.id);
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.update_store_status' })
  updatePharmacyStoreStatus(@Payload() data: { id: string; storeId: string; status: string }) {
    return this.svc.updatePharmacyStoreStatus(data.id, data.storeId, data.status);
  }

  @MessagePattern({ cmd: 'franchise.pharmacy.get_settings' })
  getPharmacySettings(@Payload() data: { id: string }) {
    return this.svc.getPharmacySettings(data.id);
  }

  // ─── DOCTOR MODULE ─────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.doctor.get_kpis' })
  getDoctorKpis(@Payload() data: { id: string }) {
    return this.svc.getDoctorKpis(data.id);
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_clinics' })
  getDoctorClinics(@Payload() data: { id: string; search?: string; status?: string }) {
    return this.svc.getDoctorClinics(data.id, data.search, data.status);
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_appointments' })
  getDoctorAppointments(@Payload() data: { id: string; page?: number; status?: string }) {
    return this.svc.getDoctorAppointments(data.id, data.page, data.status);
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_doctors' })
  getDoctorDoctors(@Payload() data: { id: string; specialty?: string }) {
    return this.svc.getDoctors(data.id, data.specialty);
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_analytics' })
  getDoctorAnalytics(@Payload() data: { id: string; period?: string }) {
    return this.svc.getDoctorAnalytics(data.id, data.period);
  }

  @MessagePattern({ cmd: 'franchise.doctor.update_clinic_status' })
  updateDoctorClinicStatus(@Payload() data: { id: string; clinicId: string; status: string }) {
    return this.svc.updateDoctorClinicStatus(data.id, data.clinicId, data.status);
  }

  @MessagePattern({ cmd: 'franchise.doctor.get_settings' })
  getDoctorSettings(@Payload() data: { id: string }) {
    return this.svc.getDoctorSettings(data.id);
  }

  // ─── TAXI MODULE ───────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.taxi.get_kpis' })
  getTaxiKpis(@Payload() data: { id: string }) {
    return this.svc.getTaxiKpis(data.id);
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_drivers' })
  getTaxiDrivers(@Payload() data: { id: string; search?: string; status?: string }) {
    return this.svc.getTaxiDrivers(data.id, data.search, data.status);
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_rides' })
  getTaxiRides(@Payload() data: { id: string; page?: number; status?: string }) {
    return this.svc.getTaxiRides(data.id, data.page, data.status);
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_fleet' })
  getTaxiFleet(@Payload() data: { id: string }) {
    return this.svc.getTaxiFleet(data.id);
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_analytics' })
  getTaxiAnalytics(@Payload() data: { id: string; period?: string }) {
    return this.svc.getTaxiAnalytics(data.id, data.period);
  }

  @MessagePattern({ cmd: 'franchise.taxi.update_driver_status' })
  updateTaxiDriverStatus(@Payload() data: { id: string; driverId: string; status: string }) {
    return this.svc.updateTaxiDriverStatus(data.id, data.driverId, data.status);
  }

  @MessagePattern({ cmd: 'franchise.taxi.get_settings' })
  getTaxiSettings(@Payload() data: { id: string }) {
    return this.svc.getTaxiSettings(data.id);
  }

  // ─── HOTEL MODULE ──────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'franchise.hotel.get_kpis' })
  getHotelKpis(@Payload() data: { id: string }) {
    return this.svc.getHotelKpis(data.id);
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_hotels' })
  getHotels(@Payload() data: { id: string; search?: string; status?: string }) {
    return this.svc.getHotels(data.id, data.search, data.status);
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_bookings' })
  getHotelBookings(@Payload() data: { id: string; page?: number; status?: string }) {
    return this.svc.getHotelBookings(data.id, data.page, data.status);
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_rooms' })
  getHotelRooms(@Payload() data: { id: string }) {
    return this.svc.getHotelRooms(data.id);
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_analytics' })
  getHotelAnalytics(@Payload() data: { id: string; period?: string }) {
    return this.svc.getHotelAnalytics(data.id, data.period);
  }

  @MessagePattern({ cmd: 'franchise.hotel.update_hotel_status' })
  updateHotelStatus(@Payload() data: { id: string; hotelId: string; status: string }) {
    return this.svc.updateHotelStatus(data.id, data.hotelId, data.status);
  }

  @MessagePattern({ cmd: 'franchise.hotel.get_settings' })
  getHotelSettings(@Payload() data: { id: string }) {
    return this.svc.getHotelSettings(data.id);
  }
}
