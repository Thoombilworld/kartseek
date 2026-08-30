import { Controller, Get, Post, Body, Param, Query, Inject, UseGuards, Req, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCatch } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { lastValueFrom, timeout, catchError } from 'rxjs';

@ApiTags('🏢 Franchise Operations')
@Controller('franchise')
export class FranchiseGatewayController {
  private readonly logger = new Logger(FranchiseGatewayController.name);

  constructor(@Inject('FRANCHISE_SERVICE') private readonly franchiseClient: ClientProxy) {}

    /**
   * Forward to franchise-service, preserving the failure.
   *
   * This helper used to take a `fallback` and return it as a 200 whenever the
   * service was unreachable, so an outage was indistinguishable from an empty
   * result: the listing pages showed "no results in your area" rather than
   * "we could not reach the service", and the admin screens showed empty queues
   * rather than an error. The fallback parameter is gone; failures propagate and
   * the client can tell the two apart.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.franchiseClient
          .send<T>({ cmd }, payload)
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Franchise service unavailable')),
          ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`franchise-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Franchise service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Franchise Microservice Health Check' })
  async health() {
    return this.send('franchise.health', {});
  }

  @Post('register')
  @ApiOperation({ summary: 'Register for a new franchise opportunity' })
  async register(@Body() payload: any) {
    return this.send('franchise.register', payload);
  }

  /**
   * Resolve the caller's own franchise.
   *
   * Declared above every `:id` route on purpose — a literal segment placed after
   * a parameterised one is silently captured by it, and this controller already
   * has `:id/dashboard`, `:id/stores` and friends below.
   *
   * Takes the owner from the verified token, never from a query parameter, so
   * one franchisee cannot resolve another's estate id by asking for it.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get('me')
  @ApiOperation({ summary: "Get the signed-in user's own franchise, or null if they own none" })
  async getMine(@Req() req: { user?: { sub?: string; id?: string } }) {
    const ownerId = req.user?.sub ?? req.user?.id;
    if (!ownerId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.send('franchise.get_by_owner', { ownerId });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get franchise dashboard overview' })
  async getDashboard(@Param('id') id: string) {
    return this.send('franchise.get_dashboard', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/stores')
  @ApiOperation({ summary: 'Get franchise regional stores' })
  async getStores(@Param('id') id: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.send('franchise.get_stores', { id, page, limit });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/stores/:storeId/performance')
  @ApiOperation({ summary: 'Get specific store performance within franchise zone' })
  async getStorePerformance(@Param('id') id: string, @Param('storeId') storeId: string, @Query('period') period: string) {
    return this.send('franchise.get_performance', { id, storeId, period });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/stores/:storeId/compliance')
  @ApiOperation({ summary: 'Submit store compliance checks' })
  async submitCompliance(@Param('id') id: string, @Param('storeId') storeId: string, @Body() payload: any) {
    return this.send('franchise.submit_compliance', { id, storeId, payload });
  }

  // --- MARKETPLACE MODULE ---
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/marketplace/kpis')
  @ApiOperation({ summary: 'Get marketplace KPIs for franchise dashboard' })
  async getMarketplaceKpis(@Param('id') id: string) {
    return this.send('franchise.marketplace.get_kpis', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/marketplace/sellers')
  @ApiOperation({ summary: 'Get marketplace sellers for franchise region' })
  async getMarketplaceSellers(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string
  ) {
    return this.send('franchise.marketplace.get_sellers', { id, search, category, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/marketplace/sellers/:sellerId/status')
  @ApiOperation({ summary: 'Update marketplace seller status (Approve/Suspend)' })
  async updateMarketplaceSellerStatus(
    @Param('id') id: string,
    @Param('sellerId') sellerId: string,
    @Body('status') status: string
  ) {
    return this.send('franchise.marketplace.update_seller_status', { id, sellerId, status });
  }

  // ─── GROCERY MODULE ─────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/grocery/kpis')
  @ApiOperation({ summary: 'Get grocery KPIs for franchise zone' })
  async getGroceryKpis(@Param('id') id: string) {
    return this.send('franchise.grocery.get_kpis', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/grocery/stores')
  @ApiOperation({ summary: 'Get grocery stores in franchise zone' })
  async getGroceryStores(@Param('id') id: string, @Query('search') search?: string, @Query('status') status?: string) {
    return this.send('franchise.grocery.get_stores', { id, search, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/grocery/orders')
  @ApiOperation({ summary: 'Get grocery orders in franchise zone' })
  async getGroceryOrders(@Param('id') id: string, @Query('page') page?: number, @Query('status') status?: string) {
    return this.send('franchise.grocery.get_orders', { id, page, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/grocery/products')
  @ApiOperation({ summary: 'Get grocery products in franchise zone' })
  async getGroceryProducts(@Param('id') id: string, @Query('search') search?: string, @Query('category') category?: string) {
    return this.send('franchise.grocery.get_products', { id, search, category });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/grocery/analytics')
  @ApiOperation({ summary: 'Get grocery analytics' })
  async getGroceryAnalytics(@Param('id') id: string, @Query('period') period?: string) {
    return this.send('franchise.grocery.get_analytics', { id, period });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/grocery/stores/:storeId/status')
  @ApiOperation({ summary: 'Update grocery store status' })
  async updateGroceryStoreStatus(@Param('id') id: string, @Param('storeId') storeId: string, @Body('status') status: string) {
    return this.send('franchise.grocery.update_store_status', { id, storeId, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/grocery/settings')
  @ApiOperation({ summary: 'Get grocery module settings' })
  async getGrocerySettings(@Param('id') id: string) {
    return this.send('franchise.grocery.get_settings', { id });
  }

  // ─── RESTAURANT MODULE ──────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/restaurant/kpis')
  @ApiOperation({ summary: 'Get restaurant KPIs for franchise zone' })
  async getRestaurantKpis(@Param('id') id: string) {
    return this.send('franchise.restaurant.get_kpis', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/restaurant/restaurants')
  @ApiOperation({ summary: 'Get restaurants in franchise zone' })
  async getRestaurants(@Param('id') id: string, @Query('search') search?: string, @Query('status') status?: string) {
    return this.send('franchise.restaurant.get_restaurants', { id, search, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/restaurant/orders')
  @ApiOperation({ summary: 'Get restaurant orders' })
  async getRestaurantOrders(@Param('id') id: string, @Query('page') page?: number, @Query('status') status?: string) {
    return this.send('franchise.restaurant.get_orders', { id, page, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/restaurant/menu-stats')
  @ApiOperation({ summary: 'Get menu statistics across restaurants' })
  async getRestaurantMenuStats(@Param('id') id: string) {
    return this.send('franchise.restaurant.get_menu_stats', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/restaurant/analytics')
  @ApiOperation({ summary: 'Get restaurant analytics' })
  async getRestaurantAnalytics(@Param('id') id: string, @Query('period') period?: string) {
    return this.send('franchise.restaurant.get_analytics', { id, period });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/restaurant/restaurants/:restaurantId/status')
  @ApiOperation({ summary: 'Update restaurant status' })
  async updateRestaurantStatus(@Param('id') id: string, @Param('restaurantId') restaurantId: string, @Body('status') status: string) {
    return this.send('franchise.restaurant.update_status', { id, restaurantId, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/restaurant/settings')
  @ApiOperation({ summary: 'Get restaurant module settings' })
  async getRestaurantSettings(@Param('id') id: string) {
    return this.send('franchise.restaurant.get_settings', { id });
  }

  // ─── PHARMACY MODULE ────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/pharmacy/kpis')
  @ApiOperation({ summary: 'Get pharmacy KPIs for franchise zone' })
  async getPharmacyKpis(@Param('id') id: string) {
    return this.send('franchise.pharmacy.get_kpis', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/pharmacy/stores')
  @ApiOperation({ summary: 'Get pharmacy stores in franchise zone' })
  async getPharmacyStores(@Param('id') id: string, @Query('search') search?: string, @Query('status') status?: string) {
    return this.send('franchise.pharmacy.get_stores', { id, search, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/pharmacy/orders')
  @ApiOperation({ summary: 'Get pharmacy orders' })
  async getPharmacyOrders(@Param('id') id: string, @Query('page') page?: number, @Query('status') status?: string) {
    return this.send('franchise.pharmacy.get_orders', { id, page, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/pharmacy/inventory')
  @ApiOperation({ summary: 'Get pharmacy inventory overview' })
  async getPharmacyInventory(@Param('id') id: string) {
    return this.send('franchise.pharmacy.get_inventory', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/pharmacy/compliance')
  @ApiOperation({ summary: 'Get pharmacy compliance status' })
  async getPharmacyCompliance(@Param('id') id: string) {
    return this.send('franchise.pharmacy.get_compliance', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/pharmacy/stores/:storeId/status')
  @ApiOperation({ summary: 'Update pharmacy store status' })
  async updatePharmacyStoreStatus(@Param('id') id: string, @Param('storeId') storeId: string, @Body('status') status: string) {
    return this.send('franchise.pharmacy.update_store_status', { id, storeId, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/pharmacy/settings')
  @ApiOperation({ summary: 'Get pharmacy module settings' })
  async getPharmacySettings(@Param('id') id: string) {
    return this.send('franchise.pharmacy.get_settings', { id });
  }

  // ─── DOCTOR MODULE ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/doctor/kpis')
  @ApiOperation({ summary: 'Get doctor KPIs for franchise zone' })
  async getDoctorKpis(@Param('id') id: string) {
    return this.send('franchise.doctor.get_kpis', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/doctor/clinics')
  @ApiOperation({ summary: 'Get clinics in franchise zone' })
  async getDoctorClinics(@Param('id') id: string, @Query('search') search?: string, @Query('status') status?: string) {
    return this.send('franchise.doctor.get_clinics', { id, search, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/doctor/appointments')
  @ApiOperation({ summary: 'Get appointments in franchise zone' })
  async getDoctorAppointments(@Param('id') id: string, @Query('page') page?: number, @Query('status') status?: string) {
    return this.send('franchise.doctor.get_appointments', { id, page, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/doctor/doctors')
  @ApiOperation({ summary: 'Get doctors in franchise zone' })
  async getDoctorDoctors(@Param('id') id: string, @Query('specialty') specialty?: string) {
    return this.send('franchise.doctor.get_doctors', { id, specialty });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/doctor/analytics')
  @ApiOperation({ summary: 'Get doctor analytics' })
  async getDoctorAnalytics(@Param('id') id: string, @Query('period') period?: string) {
    return this.send('franchise.doctor.get_analytics', { id, period });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/doctor/clinics/:clinicId/status')
  @ApiOperation({ summary: 'Update clinic status' })
  async updateDoctorClinicStatus(@Param('id') id: string, @Param('clinicId') clinicId: string, @Body('status') status: string) {
    return this.send('franchise.doctor.update_clinic_status', { id, clinicId, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/doctor/settings')
  @ApiOperation({ summary: 'Get doctor module settings' })
  async getDoctorSettings(@Param('id') id: string) {
    return this.send('franchise.doctor.get_settings', { id });
  }

  // ─── TAXI MODULE ────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/taxi/kpis')
  @ApiOperation({ summary: 'Get taxi KPIs for franchise zone' })
  async getTaxiKpis(@Param('id') id: string) {
    return this.send('franchise.taxi.get_kpis', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/taxi/drivers')
  @ApiOperation({ summary: 'Get taxi drivers in franchise zone' })
  async getTaxiDrivers(@Param('id') id: string, @Query('search') search?: string, @Query('status') status?: string) {
    return this.send('franchise.taxi.get_drivers', { id, search, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/taxi/rides')
  @ApiOperation({ summary: 'Get taxi rides in franchise zone' })
  async getTaxiRides(@Param('id') id: string, @Query('page') page?: number, @Query('status') status?: string) {
    return this.send('franchise.taxi.get_rides', { id, page, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/taxi/fleet')
  @ApiOperation({ summary: 'Get taxi fleet overview' })
  async getTaxiFleet(@Param('id') id: string) {
    return this.send('franchise.taxi.get_fleet', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/taxi/analytics')
  @ApiOperation({ summary: 'Get taxi analytics' })
  async getTaxiAnalytics(@Param('id') id: string, @Query('period') period?: string) {
    return this.send('franchise.taxi.get_analytics', { id, period });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/taxi/drivers/:driverId/status')
  @ApiOperation({ summary: 'Update taxi driver status' })
  async updateTaxiDriverStatus(@Param('id') id: string, @Param('driverId') driverId: string, @Body('status') status: string) {
    return this.send('franchise.taxi.update_driver_status', { id, driverId, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/taxi/settings')
  @ApiOperation({ summary: 'Get taxi module settings' })
  async getTaxiSettings(@Param('id') id: string) {
    return this.send('franchise.taxi.get_settings', { id });
  }

  // ─── HOTEL MODULE ───────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/hotel/kpis')
  @ApiOperation({ summary: 'Get hotel KPIs for franchise zone' })
  async getHotelKpis(@Param('id') id: string) {
    return this.send('franchise.hotel.get_kpis', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/hotel/hotels')
  @ApiOperation({ summary: 'Get hotels in franchise zone' })
  async getHotels(@Param('id') id: string, @Query('search') search?: string, @Query('status') status?: string) {
    return this.send('franchise.hotel.get_hotels', { id, search, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/hotel/bookings')
  @ApiOperation({ summary: 'Get hotel bookings in franchise zone' })
  async getHotelBookings(@Param('id') id: string, @Query('page') page?: number, @Query('status') status?: string) {
    return this.send('franchise.hotel.get_bookings', { id, page, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/hotel/rooms')
  @ApiOperation({ summary: 'Get hotel rooms overview' })
  async getHotelRooms(@Param('id') id: string) {
    return this.send('franchise.hotel.get_rooms', { id });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/hotel/analytics')
  @ApiOperation({ summary: 'Get hotel analytics' })
  async getHotelAnalytics(@Param('id') id: string, @Query('period') period?: string) {
    return this.send('franchise.hotel.get_analytics', { id, period });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post(':id/hotel/hotels/:hotelId/status')
  @ApiOperation({ summary: 'Update hotel status' })
  async updateHotelStatus(@Param('id') id: string, @Param('hotelId') hotelId: string, @Body('status') status: string) {
    return this.send('franchise.hotel.update_hotel_status', { id, hotelId, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get(':id/hotel/settings')
  @ApiOperation({ summary: 'Get hotel module settings' })
  async getHotelSettings(@Param('id') id: string) {
    return this.send('franchise.hotel.get_settings', { id });
  }
}
