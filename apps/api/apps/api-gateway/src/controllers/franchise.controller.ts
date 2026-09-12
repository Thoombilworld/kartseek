import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  Req,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCatch } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { Public } from '../decorators/public.decorator';
import { FranchiseAccessGuard } from '../guards/franchise-access.guard';
import { resolveScope } from '../guards/market-scope';

/**
 * The franchise console's API surface.
 *
 * Every `:id` route here was guarded by `JwtAuthGuard` alone — authenticated,
 * unrolled and un-owned — so any signed-in user could read or act on any
 * franchise by naming its id in the URL (audit AUD2, §13 X-46/X-47).
 * `FranchiseAccessGuard` is bound class-wide rather than route by route
 * precisely because the old arrangement was route by route: 51 copies of one
 * decorator, and a 52nd route added later would have shipped with none.
 *
 * The three routes that carry no `:id` keep working: `health` and `register`
 * are `@Public()` (the enquiry form runs before anyone has an account), and
 * `GET /franchise/me` takes the owner from the verified token.
 */
@ApiTags('🏢 Franchise Operations')
@UseGuards(JwtAuthGuard, FranchiseAccessGuard)
@ApiBearerAuth('JWT')
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
          .pipe(timeout(5000), catchError(rpcCatch('Franchise service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`franchise-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Franchise service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * @see resolveScope — the shared implementation.
   *
   * Defence in depth beside `FranchiseAccessGuard`: the guard is a gateway
   * artefact, and franchise-service's TCP surface has to stand on its own —
   * anything else that learns to send `franchise.get_dashboard` would otherwise
   * be authorised by nothing at all. The `scope` this returns is the market the
   * service checks the franchise's own `country_code` against.
   */
  private scopeOf(req: any, requested?: string, what = 'that franchise') {
    return resolveScope(req, requested, what);
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Franchise Microservice Health Check' })
  async health() {
    return this.send('franchise.health', {});
  }

  /**
   * The markets a franchise may operate in.
   *
   * Public, and declared before every `:id` route — the registration form needs
   * it before anyone has an account, let alone a franchise.
   *
   * `@Public()` states that in code rather than only in this comment: the route
   * exposure guard treats an undecorated, unauthenticated route as an oversight,
   * which is the right default. It returns the market registry — country,
   * currency, tax rate, timezone — and no user or franchise data.
   */
  @Public()
  @Get('markets')
  @ApiOperation({ summary: 'Countries a franchise can be registered in, with currency and tax' })
  async markets() {
    return this.send('franchise.list_markets', {});
  }

  // The enquiry form, filled in before the applicant has an account. Public
  // before this change too (it carried no guard at all); `@Public()` now says
  // so, because the class-level `JwtAuthGuard` would otherwise close it.
  @Public()
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
  @Get('me')
  @ApiOperation({ summary: "Get the signed-in user's own franchise, or null if they own none" })
  async getMine(@Req() req: { user?: { sub?: string; id?: string } }) {
    const ownerId = req.user?.sub ?? req.user?.id;
    if (!ownerId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.send('franchise.get_by_owner', { ownerId });
  }

  @Get(':id/region')
  @ApiOperation({
    summary: "A franchise's market: currency, minor units, tax, timezone and enabled modules",
  })
  async region(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.get_region', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get franchise dashboard overview' })
  async getDashboard(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.get_dashboard', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/stores')
  @ApiOperation({ summary: 'Get franchise regional stores' })
  async getStores(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.send('franchise.get_stores', { id, page, limit, scope: this.scopeOf(req).scope });
  }

  @Get(':id/stores/:storeId/performance')
  @ApiOperation({ summary: 'Get specific store performance within franchise zone' })
  async getStorePerformance(
    @Req() req: any,
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Query('period') period: string,
  ) {
    return this.send('franchise.get_performance', {
      id,
      storeId,
      period,
      scope: this.scopeOf(req).scope,
    });
  }

  @Post(':id/stores/:storeId/compliance')
  @ApiOperation({ summary: 'Submit store compliance checks' })
  async submitCompliance(
    @Req() req: any,
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Body() payload: any,
  ) {
    return this.send('franchise.submit_compliance', {
      id,
      storeId,
      payload,
      scope: this.scopeOf(req).scope,
    });
  }

  // --- MARKETPLACE MODULE ---
  @Get(':id/marketplace/kpis')
  @ApiOperation({ summary: 'Get marketplace KPIs for franchise dashboard' })
  async getMarketplaceKpis(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.marketplace.get_kpis', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/marketplace/sellers')
  @ApiOperation({ summary: 'Get marketplace sellers for franchise region' })
  async getMarketplaceSellers(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.marketplace.get_sellers', {
      id,
      search,
      category,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Post(':id/marketplace/sellers/:sellerId/status')
  @ApiOperation({ summary: 'Update marketplace seller status (Approve/Suspend)' })
  async updateMarketplaceSellerStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sellerId') sellerId: string,
    @Body('status') status: string,
  ) {
    return this.send('franchise.marketplace.update_seller_status', {
      id,
      sellerId,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  // ─── GROCERY MODULE ─────────────────────────────────────────────────────────

  @Get(':id/grocery/kpis')
  @ApiOperation({ summary: 'Get grocery KPIs for franchise zone' })
  async getGroceryKpis(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.grocery.get_kpis', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/grocery/stores')
  @ApiOperation({ summary: 'Get grocery stores in franchise zone' })
  async getGroceryStores(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.grocery.get_stores', {
      id,
      search,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/grocery/orders')
  @ApiOperation({ summary: 'Get grocery orders in franchise zone' })
  async getGroceryOrders(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.grocery.get_orders', {
      id,
      page,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/grocery/products')
  @ApiOperation({ summary: 'Get grocery products in franchise zone' })
  async getGroceryProducts(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.send('franchise.grocery.get_products', {
      id,
      search,
      category,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/grocery/analytics')
  @ApiOperation({ summary: 'Get grocery analytics' })
  async getGroceryAnalytics(
    @Req() req: any,
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    return this.send('franchise.grocery.get_analytics', {
      id,
      period,
      scope: this.scopeOf(req).scope,
    });
  }

  @Post(':id/grocery/stores/:storeId/status')
  @ApiOperation({ summary: 'Update grocery store status' })
  async updateGroceryStoreStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Body('status') status: string,
  ) {
    return this.send('franchise.grocery.update_store_status', {
      id,
      storeId,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/grocery/settings')
  @ApiOperation({ summary: 'Get grocery module settings' })
  async getGrocerySettings(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.grocery.get_settings', { id, scope: this.scopeOf(req).scope });
  }

  // ─── RESTAURANT MODULE ──────────────────────────────────────────────────────

  @Get(':id/restaurant/kpis')
  @ApiOperation({ summary: 'Get restaurant KPIs for franchise zone' })
  async getRestaurantKpis(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.restaurant.get_kpis', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/restaurant/restaurants')
  @ApiOperation({ summary: 'Get restaurants in franchise zone' })
  async getRestaurants(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.restaurant.get_restaurants', {
      id,
      search,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/restaurant/orders')
  @ApiOperation({ summary: 'Get restaurant orders' })
  async getRestaurantOrders(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.restaurant.get_orders', {
      id,
      page,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/restaurant/menu-stats')
  @ApiOperation({ summary: 'Get menu statistics across restaurants' })
  async getRestaurantMenuStats(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.restaurant.get_menu_stats', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/restaurant/analytics')
  @ApiOperation({ summary: 'Get restaurant analytics' })
  async getRestaurantAnalytics(
    @Req() req: any,
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    return this.send('franchise.restaurant.get_analytics', {
      id,
      period,
      scope: this.scopeOf(req).scope,
    });
  }

  @Post(':id/restaurant/restaurants/:restaurantId/status')
  @ApiOperation({ summary: 'Update restaurant status' })
  async updateRestaurantStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('restaurantId') restaurantId: string,
    @Body('status') status: string,
  ) {
    return this.send('franchise.restaurant.update_status', {
      id,
      restaurantId,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/restaurant/settings')
  @ApiOperation({ summary: 'Get restaurant module settings' })
  async getRestaurantSettings(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.restaurant.get_settings', { id, scope: this.scopeOf(req).scope });
  }

  // ─── PHARMACY MODULE ────────────────────────────────────────────────────────

  @Get(':id/pharmacy/kpis')
  @ApiOperation({ summary: 'Get pharmacy KPIs for franchise zone' })
  async getPharmacyKpis(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.pharmacy.get_kpis', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/pharmacy/stores')
  @ApiOperation({ summary: 'Get pharmacy stores in franchise zone' })
  async getPharmacyStores(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.pharmacy.get_stores', {
      id,
      search,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/pharmacy/orders')
  @ApiOperation({ summary: 'Get pharmacy orders' })
  async getPharmacyOrders(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.pharmacy.get_orders', {
      id,
      page,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/pharmacy/inventory')
  @ApiOperation({ summary: 'Get pharmacy inventory overview' })
  async getPharmacyInventory(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.pharmacy.get_inventory', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/pharmacy/compliance')
  @ApiOperation({ summary: 'Get pharmacy compliance status' })
  async getPharmacyCompliance(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.pharmacy.get_compliance', { id, scope: this.scopeOf(req).scope });
  }

  @Post(':id/pharmacy/stores/:storeId/status')
  @ApiOperation({ summary: 'Update pharmacy store status' })
  async updatePharmacyStoreStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Body('status') status: string,
  ) {
    return this.send('franchise.pharmacy.update_store_status', {
      id,
      storeId,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/pharmacy/settings')
  @ApiOperation({ summary: 'Get pharmacy module settings' })
  async getPharmacySettings(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.pharmacy.get_settings', { id, scope: this.scopeOf(req).scope });
  }

  // ─── DOCTOR MODULE ──────────────────────────────────────────────────────────

  @Get(':id/doctor/kpis')
  @ApiOperation({ summary: 'Get doctor KPIs for franchise zone' })
  async getDoctorKpis(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.doctor.get_kpis', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/doctor/clinics')
  @ApiOperation({ summary: 'Get clinics in franchise zone' })
  async getDoctorClinics(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.doctor.get_clinics', {
      id,
      search,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/doctor/appointments')
  @ApiOperation({ summary: 'Get appointments in franchise zone' })
  async getDoctorAppointments(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.doctor.get_appointments', {
      id,
      page,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/doctor/doctors')
  @ApiOperation({ summary: 'Get doctors in franchise zone' })
  async getDoctorDoctors(
    @Req() req: any,
    @Param('id') id: string,
    @Query('specialty') specialty?: string,
  ) {
    return this.send('franchise.doctor.get_doctors', {
      id,
      specialty,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/doctor/analytics')
  @ApiOperation({ summary: 'Get doctor analytics' })
  async getDoctorAnalytics(
    @Req() req: any,
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    return this.send('franchise.doctor.get_analytics', {
      id,
      period,
      scope: this.scopeOf(req).scope,
    });
  }

  @Post(':id/doctor/clinics/:clinicId/status')
  @ApiOperation({ summary: 'Update clinic status' })
  async updateDoctorClinicStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('clinicId') clinicId: string,
    @Body('status') status: string,
  ) {
    return this.send('franchise.doctor.update_clinic_status', {
      id,
      clinicId,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/doctor/settings')
  @ApiOperation({ summary: 'Get doctor module settings' })
  async getDoctorSettings(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.doctor.get_settings', { id, scope: this.scopeOf(req).scope });
  }

  // ─── TAXI MODULE ────────────────────────────────────────────────────────────

  @Get(':id/taxi/kpis')
  @ApiOperation({ summary: 'Get taxi KPIs for franchise zone' })
  async getTaxiKpis(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.taxi.get_kpis', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/taxi/drivers')
  @ApiOperation({ summary: 'Get taxi drivers in franchise zone' })
  async getTaxiDrivers(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.taxi.get_drivers', {
      id,
      search,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/taxi/rides')
  @ApiOperation({ summary: 'Get taxi rides in franchise zone' })
  async getTaxiRides(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.taxi.get_rides', {
      id,
      page,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/taxi/fleet')
  @ApiOperation({ summary: 'Get taxi fleet overview' })
  async getTaxiFleet(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.taxi.get_fleet', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/taxi/analytics')
  @ApiOperation({ summary: 'Get taxi analytics' })
  async getTaxiAnalytics(
    @Req() req: any,
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    return this.send('franchise.taxi.get_analytics', {
      id,
      period,
      scope: this.scopeOf(req).scope,
    });
  }

  @Post(':id/taxi/drivers/:driverId/status')
  @ApiOperation({ summary: 'Update taxi driver status' })
  async updateTaxiDriverStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('driverId') driverId: string,
    @Body('status') status: string,
  ) {
    return this.send('franchise.taxi.update_driver_status', {
      id,
      driverId,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/taxi/settings')
  @ApiOperation({ summary: 'Get taxi module settings' })
  async getTaxiSettings(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.taxi.get_settings', { id, scope: this.scopeOf(req).scope });
  }

  // ─── HOTEL MODULE ───────────────────────────────────────────────────────────

  @Get(':id/hotel/kpis')
  @ApiOperation({ summary: 'Get hotel KPIs for franchise zone' })
  async getHotelKpis(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.hotel.get_kpis', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/hotel/hotels')
  @ApiOperation({ summary: 'Get hotels in franchise zone' })
  async getHotels(
    @Req() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.hotel.get_hotels', {
      id,
      search,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/hotel/bookings')
  @ApiOperation({ summary: 'Get hotel bookings in franchise zone' })
  async getHotelBookings(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('status') status?: string,
  ) {
    return this.send('franchise.hotel.get_bookings', {
      id,
      page,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/hotel/rooms')
  @ApiOperation({ summary: 'Get hotel rooms overview' })
  async getHotelRooms(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.hotel.get_rooms', { id, scope: this.scopeOf(req).scope });
  }

  @Get(':id/hotel/analytics')
  @ApiOperation({ summary: 'Get hotel analytics' })
  async getHotelAnalytics(
    @Req() req: any,
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    return this.send('franchise.hotel.get_analytics', {
      id,
      period,
      scope: this.scopeOf(req).scope,
    });
  }

  @Post(':id/hotel/hotels/:hotelId/status')
  @ApiOperation({ summary: 'Update hotel status' })
  async updateHotelStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('hotelId') hotelId: string,
    @Body('status') status: string,
  ) {
    return this.send('franchise.hotel.update_hotel_status', {
      id,
      hotelId,
      status,
      scope: this.scopeOf(req).scope,
    });
  }

  @Get(':id/hotel/settings')
  @ApiOperation({ summary: 'Get hotel module settings' })
  async getHotelSettings(@Req() req: any, @Param('id') id: string) {
    return this.send('franchise.hotel.get_settings', { id, scope: this.scopeOf(req).scope });
  }
}
