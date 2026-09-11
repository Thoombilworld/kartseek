import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PharmacyService } from './pharmacy.service';
import { FranchiseViewService } from './franchise/franchise-view.service';
import { type EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('pharmacy')
export class PharmacyController {
  constructor(
    private readonly svc: PharmacyService,
    private readonly franchiseView: FranchiseViewService,
  ) {}

  // ── Health ──────────────────────────────────────────────────────────────────

  @Get('health')
  health() {
    return this.svc.healthCheck();
  }

  // ── Customer — Stores ───────────────────────────────────────────────────────

  @Get('stores')
  listStores(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('is24hr') is24hr?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.listStores({
      page: +page,
      limit: +limit,
      is24hr: is24hr === 'true' ? true : undefined,
      search,
    });
  }

  @Get('stores/:id')
  getStore(@Param('id') id: string) {
    return this.svc.getStoreById(id);
  }

  @Get('stores/slug/:slug')
  getStoreBySlug(@Param('slug') slug: string) {
    return this.svc.getStoreBySlug(slug);
  }

  @Get('stores/:storeId/medicines')
  getMedicines(
    @Param('storeId') storeId: string,
    @Query('category') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.getMedicines(storeId, { categoryId, search, page: +page, limit: +limit });
  }

  @Get('medicines/:id')
  getMedicineById(@Param('id') id: string) {
    return this.svc.getMedicineById(id);
  }

  @Get('search')
  searchMedicines(@Query('q') q: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.searchMedicines(q, +page, +limit);
  }

  // ── Customer — Categories ──────────────────────────────────────────────────

  @Get('categories')
  getCategories() {
    return this.svc.getCategories();
  }

  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return this.svc.getCategoryById(id);
  }

  // ── Customer — Prescriptions ───────────────────────────────────────────────

  @Post('prescriptions')
  uploadPrescription(@Body() dto: any) {
    return this.svc.uploadPrescription(dto);
  }

  @Get('prescriptions/:customerId')
  getCustomerPrescriptions(@Param('customerId') customerId: string) {
    return this.svc.getCustomerPrescriptions(customerId);
  }

  // ── Customer — Orders ──────────────────────────────────────────────────────

  @Post('orders')
  placeOrder(@Body() dto: any) {
    return this.svc.placeOrder(dto);
  }

  /**
   * Internal read on the service's own HTTP port, for operators and debugging.
   * `requesterId` must be supplied: the service refuses an unscoped order read.
   */
  @Get('orders/:orderId')
  getOrderById(
    @Param('orderId') orderId: string,
    @Query('requesterId') requesterId?: string,
    @Query('requesterRole') requesterRole?: string,
  ) {
    return this.svc.getOrderById(orderId, { id: requesterId, role: requesterRole });
  }

  // ── Customer — Reviews ─────────────────────────────────────────────────────

  @Get('stores/:storeId/reviews')
  getStoreReviews(
    @Param('storeId') storeId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.getStoreReviews(storeId, +page, +limit);
  }

  @Post('stores/:storeId/review')
  submitReview(@Param('storeId') storeId: string, @Body() dto: any) {
    return this.svc.submitReview({ ...dto, storeId });
  }

  @Get('stores/:storeId/promotions')
  getStorePromotions(@Param('storeId') storeId: string) {
    return this.svc.getStorePromotions(storeId);
  }

  // ── Seller ─────────────────────────────────────────────────────────────────

  @Get(':storeId/dashboard')
  getSellerDashboard(@Param('storeId') storeId: string) {
    return this.svc.getSellerDashboard(storeId);
  }

  @Get(':storeId/seller-orders')
  getSellerOrders(
    @Param('storeId') storeId: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.getSellerOrders(storeId, { status, page: +page, limit: +limit });
  }

  @Put('orders/:orderId/status')
  updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: any,
    @Body() meta: any,
  ) {
    return this.svc.updateOrderStatus(orderId, status, meta);
  }

  @Post(':storeId/medicines')
  addMedicine(@Param('storeId') storeId: string, @Body() dto: any) {
    return this.svc.addMedicine(storeId, dto);
  }

  @Put('medicines/:itemId')
  updateMedicine(@Param('itemId') itemId: string, @Body() dto: any) {
    return this.svc.updateMedicine(itemId, dto);
  }

  @Delete('medicines/:itemId')
  deleteMedicine(@Param('itemId') itemId: string) {
    return this.svc.deleteMedicine(itemId);
  }

  @Get(':storeId/inventory')
  getInventory(@Param('storeId') storeId: string) {
    return this.svc.getInventory(storeId);
  }

  @Put('medicines/:itemId/stock')
  updateStock(@Param('itemId') itemId: string, @Body('stockLevel') stockLevel: number) {
    return this.svc.updateStock(itemId, stockLevel);
  }

  @Get(':storeId/staff')
  getStaff(@Param('storeId') storeId: string) {
    return this.svc.getStaff(storeId);
  }

  @Post(':storeId/staff')
  addStaff(@Param('storeId') storeId: string, @Body() dto: any) {
    return this.svc.addStaff(storeId, dto);
  }

  @Put('staff/:staffId')
  updateStaff(@Param('staffId') staffId: string, @Body() dto: any) {
    return this.svc.updateStaff(staffId, dto);
  }

  @Delete('staff/:staffId')
  removeStaff(@Param('staffId') staffId: string) {
    return this.svc.removeStaff(staffId);
  }

  @Get(':storeId/payouts')
  getPayouts(@Param('storeId') storeId: string) {
    return this.svc.getPayouts(storeId);
  }

  @Get(':storeId/earnings')
  getEarnings(@Param('storeId') storeId: string) {
    return this.svc.getEarnings(storeId);
  }

  @Get(':storeId/promotions')
  getPromotions(@Param('storeId') storeId: string) {
    return this.svc.getStorePromotions(storeId);
  }

  @Post(':storeId/promotions')
  createPromotion(@Param('storeId') storeId: string, @Body() dto: any) {
    return this.svc.createPromotion(storeId, dto);
  }

  @Put('promotions/:promoId')
  updatePromotion(@Param('promoId') promoId: string, @Body() dto: any) {
    return this.svc.updatePromotion(promoId, dto);
  }

  @Delete('promotions/:promoId')
  deletePromotion(@Param('promoId') promoId: string) {
    return this.svc.deletePromotion(promoId);
  }

  @Get(':storeId/analytics')
  getAnalytics(@Param('storeId') storeId: string) {
    return this.svc.getAnalytics(storeId);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Post('admin/:storeId/approve')
  approveStore(@Param('storeId') storeId: string) {
    return this.svc.approveStore(storeId);
  }

  @Post('admin/:storeId/suspend')
  suspendStore(@Param('storeId') storeId: string, @Body('reason') reason?: string) {
    return this.svc.suspendStore(storeId, reason);
  }

  @Get('admin/stores')
  adminListStores(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.svc.getAdminStoreList({ status, page: +page, limit: +limit });
  }

  @Put('admin/:storeId/commission')
  setCommission(@Param('storeId') storeId: string, @Body('rate') rate: number) {
    return this.svc.setCommission(storeId, rate);
  }

  @Post('prescriptions/:prescId/verify')
  verifyPrescription(@Param('prescId') prescId: string, @Body() dto: any) {
    return this.svc.verifyPrescription(prescId, dto);
  }

  @Get('admin/prescriptions/pending')
  getPendingPrescriptions(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.getPendingPrescriptions(+page, +limit);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TCP MessagePattern handlers (called by API Gateway via ClientProxy)
  // ═══════════════════════════════════════════════════════════════════════════

  @MessagePattern({ cmd: 'pharmacy_health' })
  msgHealth() {
    return this.svc.healthCheck();
  }

  @MessagePattern({ cmd: 'list_pharmacy_stores' })
  msgListStores(@Payload() d: EmptyMessage) {
    return this.svc.listStores(d);
  }

  @MessagePattern({ cmd: 'get_pharmacy_store' })
  msgGetStore(@Payload() d: { id: string }) {
    return this.svc.getStoreById(d.id);
  }

  @MessagePattern({ cmd: 'get_pharmacy_store_by_slug' })
  msgGetStoreBySlug(@Payload() d: { slug: string }) {
    return this.svc.getStoreBySlug(d.slug);
  }

  @MessagePattern({ cmd: 'search_pharmacy_stores' })
  msgSearchStores(@Payload() d: EmptyMessage) {
    return this.svc.searchStores(d.q, d.page, d.limit);
  }

  @MessagePattern({ cmd: 'get_pharmacy_categories' })
  msgGetCategories() {
    return this.svc.getCategories();
  }

  @MessagePattern({ cmd: 'get_pharmacy_category' })
  msgGetCategory(@Payload() d: { id: string }) {
    return this.svc.getCategoryById(d.id);
  }

  @MessagePattern({ cmd: 'get_pharmacy_medicines' })
  msgGetMedicines(@Payload() d: EmptyMessage) {
    return this.svc.getMedicines(d.storeId, d);
  }

  @MessagePattern({ cmd: 'get_pharmacy_medicine' })
  msgGetMedicine(@Payload() d: { id: string }) {
    return this.svc.getMedicineById(d.id);
  }

  @MessagePattern({ cmd: 'search_medicines' })
  msgSearchMedicines(@Payload() d: EmptyMessage) {
    return this.svc.searchMedicines(d.query ?? d.q, d.page, d.limit);
  }

  @MessagePattern({ cmd: 'lookup_by_barcode' })
  msgLookupByBarcode(@Payload() d: { code: string }) {
    return this.svc.lookupByBarcode(d.code);
  }

  @MessagePattern({ cmd: 'upload_prescription' })
  msgUploadPrescription(@Payload() d: EmptyMessage) {
    return this.svc.uploadPrescription(d);
  }

  @MessagePattern({ cmd: 'get_customer_prescriptions' })
  msgGetPrescriptions(@Payload() d: { customerId: string }) {
    return this.svc.getCustomerPrescriptions(d.customerId);
  }

  @MessagePattern({ cmd: 'place_pharmacy_order' })
  msgPlaceOrder(@Payload() d: EmptyMessage) {
    return this.svc.placeOrder(d);
  }

  @MessagePattern({ cmd: 'get_pharmacy_order' })
  msgGetOrder(@Payload() d: { orderId: string; requesterId?: string; requesterRole?: string }) {
    // The gateway has always sent these two; this handler used to drop them and
    // call `getOrderById(orderId)`, which looked the order up by id alone.
    return this.svc.getOrderById(d.orderId, { id: d.requesterId, role: d.requesterRole });
  }

  @MessagePattern({ cmd: 'get_customer_pharmacy_orders' })
  msgGetCustomerOrders(@Payload() d: EmptyMessage) {
    return this.svc.getCustomerOrders(d.customerId, d.page, d.limit);
  }

  @MessagePattern({ cmd: 'get_pharmacy_reviews' })
  msgGetReviews(@Payload() d: EmptyMessage) {
    return this.svc.getStoreReviews(d.storeId, d.page, d.limit);
  }

  @MessagePattern({ cmd: 'submit_pharmacy_review' })
  msgSubmitReview(@Payload() d: EmptyMessage) {
    return this.svc.submitReview(d);
  }

  @MessagePattern({ cmd: 'get_pharmacy_promotions' })
  msgGetPromotions(@Payload() d: { storeId: string }) {
    return this.svc.getStorePromotions(d.storeId);
  }

  @MessagePattern({ cmd: 'get_pharmacy_dashboard' })
  msgDashboard(@Payload() d: { storeId: string }) {
    return this.svc.getSellerDashboard(d.storeId);
  }

  @MessagePattern({ cmd: 'get_pharmacy_seller_orders' })
  msgSellerOrders(@Payload() d: EmptyMessage) {
    return this.svc.getSellerOrders(d.storeId, d);
  }

  @MessagePattern({ cmd: 'update_pharmacy_order_status' })
  msgUpdateOrderStatus(@Payload() d: EmptyMessage) {
    return this.svc.updateOrderStatus(d.orderId, d.status, d);
  }

  @MessagePattern({ cmd: 'add_pharmacy_medicine' })
  msgAddMedicine(@Payload() d: EmptyMessage) {
    return this.svc.addMedicine(d.storeId, d);
  }

  @MessagePattern({ cmd: 'update_pharmacy_medicine' })
  msgUpdateMedicine(@Payload() d: EmptyMessage) {
    return this.svc.updateMedicine(d.itemId, d);
  }

  @MessagePattern({ cmd: 'delete_pharmacy_medicine' })
  msgDeleteMedicine(@Payload() d: { itemId: string }) {
    return this.svc.deleteMedicine(d.itemId);
  }

  @MessagePattern({ cmd: 'get_pharmacy_inventory' })
  msgGetInventory(@Payload() d: { storeId: string }) {
    return this.svc.getInventory(d.storeId);
  }

  @MessagePattern({ cmd: 'update_pharmacy_stock' })
  msgUpdateStock(@Payload() d: { itemId: string; stockLevel: number }) {
    return this.svc.updateStock(d.itemId, d.stockLevel);
  }

  @MessagePattern({ cmd: 'get_pharmacy_staff' })
  msgGetStaff(@Payload() d: { storeId: string }) {
    return this.svc.getStaff(d.storeId);
  }

  @MessagePattern({ cmd: 'add_pharmacy_staff' })
  msgAddStaff(@Payload() d: EmptyMessage) {
    return this.svc.addStaff(d.storeId, d);
  }

  @MessagePattern({ cmd: 'update_pharmacy_staff' })
  msgUpdateStaff(@Payload() d: EmptyMessage) {
    return this.svc.updateStaff(d.staffId, d);
  }

  @MessagePattern({ cmd: 'remove_pharmacy_staff' })
  msgRemoveStaff(@Payload() d: { staffId: string }) {
    return this.svc.removeStaff(d.staffId);
  }

  @MessagePattern({ cmd: 'get_pharmacy_payouts' })
  msgGetPayouts(@Payload() d: { storeId: string }) {
    return this.svc.getPayouts(d.storeId);
  }

  @MessagePattern({ cmd: 'get_pharmacy_earnings' })
  msgGetEarnings(@Payload() d: { storeId: string }) {
    return this.svc.getEarnings(d.storeId);
  }

  @MessagePattern({ cmd: 'create_pharmacy_promotion' })
  msgCreatePromotion(@Payload() d: EmptyMessage) {
    return this.svc.createPromotion(d.storeId, d);
  }

  @MessagePattern({ cmd: 'update_pharmacy_promotion' })
  msgUpdatePromotion(@Payload() d: EmptyMessage) {
    return this.svc.updatePromotion(d.promoId, d);
  }

  @MessagePattern({ cmd: 'delete_pharmacy_promotion' })
  msgDeletePromotion(@Payload() d: { promoId: string }) {
    return this.svc.deletePromotion(d.promoId);
  }

  @MessagePattern({ cmd: 'get_pharmacy_analytics' })
  msgGetAnalytics(@Payload() d: { storeId: string }) {
    return this.svc.getAnalytics(d.storeId);
  }

  @MessagePattern({ cmd: 'approve_pharmacy_store' })
  msgApproveStore(@Payload() d: { storeId: string }) {
    return this.svc.approveStore(d.storeId);
  }

  @MessagePattern({ cmd: 'suspend_pharmacy_store' })
  msgSuspendStore(@Payload() d: { storeId: string; reason?: string }) {
    return this.svc.suspendStore(d.storeId, d.reason);
  }

  // `scope` is the caller's market when the gateway resolved one for a
  // region-locked administrator, and undefined for a global one. The gateway
  // names it `countryCode` on the wire; the column it resolves to here is
  // `regionCode`, the platform's ISO-2 market identifier.
  @MessagePattern({ cmd: 'admin_list_pharmacy_stores' })
  msgAdminList(@Payload() d: EmptyMessage) {
    return this.svc.getAdminStoreList({ ...d, regionCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'set_pharmacy_commission' })
  msgSetCommission(@Payload() d: { storeId: string; rate: number }) {
    return this.svc.setCommission(d.storeId, d.rate);
  }

  @MessagePattern({ cmd: 'verify_prescription' })
  msgVerifyPrescription(@Payload() d: EmptyMessage) {
    return this.svc.verifyPrescription(d.prescId, d);
  }

  @MessagePattern({ cmd: 'get_pending_prescriptions' })
  msgGetPendingPrescriptions(@Payload() d: EmptyMessage) {
    return this.svc.getPendingPrescriptions(d.page, d.limit);
  }

  @MessagePattern({ cmd: 'pharmacy_home' })
  msgPharmacyHome(@Payload() d: EmptyMessage) {
    return this.svc.getPharmacyHome(d);
  }

  @MessagePattern({ cmd: 'get_pharmacy_stores_by_franchise' })
  msgGetStoresByFranchise(@Payload() d: EmptyMessage) {
    return this.svc.getStoresByFranchise(d.franchiseId, d.page, d.limit);
  }

  // ── Franchise module boundary ───────────────────────────────────────────
  // Consumed by franchise-service. These replace the raw cross-module SQL that
  // franchise-service used to run against pharmacy tables directly.

  @MessagePattern({ cmd: 'franchise_pharmacy_kpis' })
  msgFranchiseKpis(@Payload() d: EmptyMessage) {
    return this.franchiseView.getKpis(d.franchiseId);
  }

  @MessagePattern({ cmd: 'franchise_pharmacy_stores' })
  msgFranchiseStores(@Payload() d: EmptyMessage) {
    return this.franchiseView.getStores(d.franchiseId, d.search, d.status);
  }

  @MessagePattern({ cmd: 'franchise_pharmacy_orders' })
  msgFranchiseOrders(@Payload() d: EmptyMessage) {
    return this.franchiseView.getOrders(d.franchiseId, d.page, d.status);
  }

  @MessagePattern({ cmd: 'franchise_pharmacy_products' })
  msgFranchiseProducts(@Payload() d: EmptyMessage) {
    return this.franchiseView.getProducts(d.franchiseId, d.search, d.category);
  }

  @MessagePattern({ cmd: 'franchise_pharmacy_analytics' })
  msgFranchiseAnalytics(@Payload() d: EmptyMessage) {
    return this.franchiseView.getAnalytics(d.franchiseId, d.period);
  }

  @MessagePattern({ cmd: 'franchise_pharmacy_inventory' })
  msgFranchiseInventory(@Payload() d: EmptyMessage) {
    return this.franchiseView.getLowStockInventory(d.franchiseId, d.threshold);
  }

  @MessagePattern({ cmd: 'franchise_pharmacy_compliance' })
  msgFranchiseCompliance(@Payload() d: EmptyMessage) {
    return this.franchiseView.getCompliance(d.franchiseId);
  }

  @MessagePattern({ cmd: 'franchise_pharmacy_update_store_status' })
  msgFranchiseUpdateStoreStatus(@Payload() d: any) {
    return this.franchiseView.updateStoreStatus(d.franchiseId, d.storeId, d.status);
  }

  // ── Admin console commands ────────────────────────────────────────────────
  // The gateway's admin-* controllers address this service with dot-notation
  // commands and none had a handler, so every admin screen for this module got
  // "no matching message handler" — an empty 200 while the gateway fallbacks
  // were in place, a 503 once they were removed. The implementations already
  // existed; only the patterns were missing.

  // `getAdminStoreList`, not `franchiseView.getStores` — the latter is scoped to
  // one franchise, and the admin console sends only { page, limit, status }, so
  // it filtered on an undefined franchiseId and the Stores screen was empty
  // while the database held six.
  @MessagePattern({ cmd: 'admin.pharmacy.stores' })
  tcpAdminGetStores(@Payload() d: any) {
    return this.svc.getAdminStoreList({
      status: d?.status,
      page: d?.page,
      limit: d?.limit,
      regionCode: d?.scope ?? d?.countryCode,
    });
  }

  @MessagePattern({ cmd: 'admin.pharmacy.categories' })
  tcpAdminGetCategories(@Payload() d: EmptyMessage) {
    return this.svc.getCategories();
  }
}
