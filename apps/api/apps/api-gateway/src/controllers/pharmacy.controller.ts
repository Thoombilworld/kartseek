import { Controller, Get, Post, Put, Delete, Inject, Param, Body, Query, Req, UseGuards, DefaultValuePipe, ParseIntPipe, ParseUUIDPipe, Logger, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery, ApiBody,
  ApiOkResponse, ApiCreatedResponse,
  ApiForbiddenResponse, ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { SellerModuleGuard, SellerModule } from '../guards/seller-module.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';

/**
 * Pharmacy Controller — API Gateway Proxy
 *
 * Forwards all pharmacy requests to the pharmacy-service microservice via TCP ClientProxy.
 * Uses timeout + catchError fallback so the gateway stays operational even when
 * the pharmacy-service microservice is unavailable.
 */
@ApiTags('💊 Pharmacy')
@ApiBearerAuth('JWT')
@Controller('pharmacy')
export class PharmacyController {
  private readonly logger = new Logger(PharmacyController.name);

  constructor(
    @Inject('PHARMACY_SERVICE') private readonly pharmacyClient: ClientProxy) {}

  /** Helper — sends TCP message with 5s timeout and graceful fallback. */
    /**
   * Forward to pharmacy-service, preserving the failure.
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
        this.pharmacyClient
          .send<T>({ cmd }, payload)
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Pharmacy service unavailable')),
          ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`pharmacy-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Pharmacy service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Home
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('home')
  @ApiOperation({ summary: 'Pharmacy home screen', description: 'Returns featured stores, categories, and active promotions.' })
  @ApiOkResponse({ description: 'Home screen data (featuredStores, categories, promotions)' })
  getPharmacyHome() {
    return this.send('pharmacy_home', {});
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Store Discovery
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('stores')
  @ApiOperation({ summary: 'List nearby pharmacies' })
  @ApiQuery({ name: 'search', required: false, example: 'MedPlus' })
  @ApiQuery({ name: 'is24hr', required: false, example: true })
  @ApiQuery({ name: 'lat', required: false, example: -1.2921 })
  @ApiQuery({ name: 'lng', required: false, example: 36.8219 })
  @ApiQuery({ name: 'radius', required: false, example: 10 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ description: 'Paginated pharmacy store list' })
  listStores(
    @Query('search') search?: string,
    @Query('is24hr') is24hr?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('list_pharmacy_stores', {
      search,
      is24hr: is24hr === 'true' ? true : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseFloat(radius) : undefined,
      page, limit,
    });
  }

  @Get('stores/slug/:slug')
  @ApiOperation({ summary: 'Get pharmacy by slug' })
  @ApiParam({ name: 'slug', example: 'medplus-pharmacy' })
  getStoreBySlug(@Param('slug') slug: string) {
    return this.send('get_pharmacy_store_by_slug', { slug });
  }

  @Get('stores/:storeId')
  @ApiOperation({ summary: 'Get a single pharmacy store' })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  getStore(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_store', { id: storeId });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search medicines across all pharmacies' })
  @ApiQuery({ name: 'q', example: 'Paracetamol', required: true })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  search(
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('search_medicines', { query: q, page, limit });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Barcode / Product Scan
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('scan/barcode/:code')
  @ApiOperation({ summary: 'Lookup product by barcode, EAN, GTIN, or SKU' })
  @ApiParam({ name: 'code', example: '8901234567890' })
  lookupBarcode(@Param('code') code: string) {
    return this.send('lookup_by_barcode', { code });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Categories
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('categories')
  @ApiOperation({ summary: 'List pharmacy categories' })
  getCategories() {
    return this.send('get_pharmacy_categories', {});
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a single category' })
  getCategoryById(@Param('id') id: string) {
    return this.send('get_pharmacy_category', { id });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Medicines
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('stores/:storeId/medicines')
  @ApiOperation({ summary: 'List medicines for a pharmacy' })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getMedicines(
    @Param('storeId') storeId: string,
    @Query('category') categoryId?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('get_pharmacy_medicines', { storeId, categoryId, search, page, limit });
  }

  @Get('stores/:storeId/medicines/:medicineId')
  @ApiOperation({ summary: 'Get a single medicine' })
  getMedicine(@Param('medicineId') medicineId: string) {
    return this.send('get_pharmacy_medicine', { id: medicineId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Prescriptions
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('prescriptions/upload')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload a prescription for verification' })
  @ApiCreatedResponse({ description: 'Prescription uploaded and pending review' })
  uploadPrescription(@Body() body: any) {
    return this.send('upload_prescription', body);
  }

  @Get('prescriptions/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my prescriptions' })
  getMyPrescriptions(@Query('customerId') customerId: string) {
    return this.send('get_customer_prescriptions', { customerId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Orders
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Place a pharmacy order' })
  @ApiCreatedResponse({ description: 'Order placed' })
  placeOrder(@Body() body: any) {
    return this.send('place_pharmacy_order', body);
  }

  /**
   * A pharmacy order names the patient, the delivery address and the medicines
   * dispensed. This route had no guard while `my-orders` immediately below it
   * did, so the whole order — prescription included — was readable by anyone who
   * could guess or enumerate an order id.
   *
   * The requester is passed down so pharmacy-service can scope the read to the
   * order's own customer rather than trusting the gateway to have done it.
   */
  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get order details' })
  /* `ParseUUIDPipe` so a malformed id is refused as a 400 here rather than
     reaching Postgres and coming back as a 500 quoting
     `invalid input syntax for type uuid`. A 500 tells a caller the server broke
     when in fact their input was wrong, and it leaks the column type. */
  getOrder(@Param('orderId', ParseUUIDPipe) orderId: string, @Req() req: any) {
    return this.send('get_pharmacy_order', {
      orderId,
      requesterId: req?.user?.id ?? req?.user?.userId ?? req?.user?.sub,
      requesterRole: req?.user?.role,
    });
  }

  /**
   * The signed-in customer's own pharmacy orders.
   *
   * `customerId` came off the query string. Two things followed from that, on a
   * route called "my-orders":
   *
   *  • Omit it and pharmacy-service ran `findAndCount({ where: { customerId } })`
   *    with `customerId` undefined. TypeORM drops an undefined condition rather
   *    than matching nothing, so the query returned *every* customer's pharmacy
   *    orders — patient name, delivery address, medicines dispensed and
   *    prescription flags — to whoever asked. That is what the web client did.
   *
   *  • Pass somebody else's id and you read their orders instead of your own.
   *
   * The id now comes from the verified token and cannot be supplied by the
   * caller, and a token without a subject is refused rather than being allowed
   * through as an unscoped query.
   */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List my pharmacy orders' })
  getMyOrders(@Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    const customerId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!customerId) throw new UnauthorizedException('Authenticated customer required');
    return this.send('get_customer_pharmacy_orders', { customerId, page, limit });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Reviews & Promotions
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('stores/:storeId/reviews')
  @ApiOperation({ summary: 'Get store reviews' })
  getReviews(@Param('storeId') storeId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('get_pharmacy_reviews', { storeId, page, limit });
  }

  @Post('stores/:storeId/review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a review' })
  submitReview(@Param('storeId') storeId: string, @Body() body: any) {
    return this.send('submit_pharmacy_review', { ...body, storeId });
  }

  @Get('stores/:storeId/promotions')
  @ApiOperation({ summary: 'Get store promotions' })
  getPromotions(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_promotions', { storeId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Seller Portal
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('seller/:storeId/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller dashboard' })
  getSellerDashboard(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_dashboard', { storeId });
  }

  @Get('seller/:storeId/orders')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: list orders' })
  getSellerOrders(@Param('storeId') storeId: string, @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('get_pharmacy_seller_orders', { storeId, status, page, limit });
  }

  @Put('seller/orders/:orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: update order status' })
  updateOrderStatus(@Param('orderId') orderId: string, @Body() body: any) {
    return this.send('update_pharmacy_order_status', { orderId, ...body });
  }

  @Post('seller/:storeId/medicines')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: add medicine' })
  addMedicine(@Param('storeId') storeId: string, @Body() body: any) {
    return this.send('add_pharmacy_medicine', { ...body, storeId });
  }

  @Put('seller/medicines/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: update medicine' })
  updateMedicine(@Param('itemId') itemId: string, @Body() body: any) {
    return this.send('update_pharmacy_medicine', { itemId, ...body });
  }

  @Delete('seller/medicines/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: delete medicine' })
  deleteMedicine(@Param('itemId') itemId: string) {
    return this.send('delete_pharmacy_medicine', { itemId });
  }

  @Get('seller/:storeId/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: view inventory' })
  getInventory(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_inventory', { storeId });
  }

  @Put('seller/medicines/:itemId/stock')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: update stock level' })
  updateStock(@Param('itemId') itemId: string, @Body('stockLevel') stockLevel: number) {
    return this.send('update_pharmacy_stock', { itemId, stockLevel });
  }

  @Get('seller/:storeId/staff')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: list staff' })
  getStaff(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_staff', { storeId });
  }

  @Post('seller/:storeId/staff')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: add staff' })
  addStaff(@Param('storeId') storeId: string, @Body() body: any) {
    return this.send('add_pharmacy_staff', { ...body, storeId });
  }

  @Put('seller/staff/:staffId')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: update staff' })
  updateStaff(@Param('staffId') staffId: string, @Body() body: any) {
    return this.send('update_pharmacy_staff', { staffId, ...body });
  }

  @Delete('seller/staff/:staffId')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: remove staff' })
  removeStaff(@Param('staffId') staffId: string) {
    return this.send('remove_pharmacy_staff', { staffId });
  }

  @Get('seller/:storeId/payouts')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: payouts & earnings' })
  getPayouts(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_payouts', { storeId });
  }

  @Get('seller/:storeId/promotions')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: list promotions' })
  getSellerPromotions(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_promotions', { storeId });
  }

  @Post('seller/:storeId/promotions')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: create promotion' })
  createPromotion(@Param('storeId') storeId: string, @Body() body: any) {
    return this.send('create_pharmacy_promotion', { ...body, storeId });
  }

  @Put('seller/promotions/:promoId')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: update promotion' })
  updatePromotion(@Param('promoId') promoId: string, @Body() body: any) {
    return this.send('update_pharmacy_promotion', { promoId, ...body });
  }

  @Delete('seller/promotions/:promoId')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: delete promotion' })
  deletePromotion(@Param('promoId') promoId: string) {
    return this.send('delete_pharmacy_promotion', { promoId });
  }

  @Get('seller/:storeId/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('pharmacy')
  @ApiOperation({ summary: 'Seller: analytics' })
  getSellerAnalytics(@Param('storeId') storeId: string) {
    return this.send('get_pharmacy_analytics', { storeId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Admin
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('admin/:storeId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: approve pharmacy store' })
  approveStore(@Param('storeId') storeId: string) {
    return this.send('approve_pharmacy_store', { storeId });
  }

  @Post('admin/:storeId/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: suspend pharmacy store' })
  suspendStore(@Param('storeId') storeId: string, @Body('reason') reason?: string) {
    return this.send('suspend_pharmacy_store', { storeId, reason });
  }

  @Get('admin/stores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: list all stores' })
  adminListStores(@Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number) {
    return this.send('admin_list_pharmacy_stores', { status, page, limit });
  }

  @Put('admin/:storeId/commission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: set store commission rate' })
  setCommission(@Param('storeId') storeId: string, @Body('rate') rate: number) {
    return this.send('set_pharmacy_commission', { storeId, rate });
  }

  @Post('admin/prescriptions/:prescId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Admin: verify prescription' })
  verifyPrescription(@Param('prescId') prescId: string, @Body() body: any) {
    return this.send('verify_prescription', { prescId, ...body });
  }

  @Get('admin/prescriptions/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Admin: get pending prescriptions' })
  getPendingPrescriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('get_pending_prescriptions', { page, limit });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Franchise
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('franchise/:franchiseId/stores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FRANCHISE_OWNER)
  @ApiOperation({ summary: 'Franchise: list pharmacy stores by franchise' })
  @ApiParam({ name: 'franchiseId', example: 'franchise-uuid' })
  getStoresByFranchise(
    @Param('franchiseId') franchiseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('get_pharmacy_stores_by_franchise', { franchiseId, page, limit });
  }
}
