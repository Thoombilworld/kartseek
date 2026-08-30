import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RestaurantService } from './restaurant.service';
import { FranchiseViewService } from './franchise/franchise-view.service';
import { RestaurantOrderStatus, ReservationStatus } from './entities';
import { DtoMessage, EmptyMessage, IdMessage, PaginatedMessage, RestaurantScopedMessage, RpcAwareExceptionsFilter, messageId, requireId, requireValue } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('restaurants')
export class RestaurantController {
  constructor(
    private readonly svc: RestaurantService,
    private readonly franchiseView: FranchiseViewService,
  ) {}

  @Get('health')
  health() { return this.svc.healthCheck(); }

  // ── Customer-facing ─────────────────────────────────────────────────────────

  @Get('nearby')
  getNearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') radius = 5) {
    return this.svc.getNearbyRestaurants(parseFloat(lat), parseFloat(lng), +radius);
  }

  @Get('search')
  search(@Query('q') q: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.searchRestaurants(q, +page, +limit);
  }

  @Get('cuisines')
  getCuisines() { return this.svc.getCuisines(); }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) { return this.svc.getRestaurantBySlug(slug); }

  @Get(':id/menu')
  getMenu(@Param('id') id: string) { return this.svc.getMenuByRestaurant(id); }

  @Get(':id/reviews')
  getReviews(@Param('id') id: string, @Query('page') p = 1, @Query('limit') l = 20) {
    return this.svc.getReviews(id, +p, +l);
  }

  @Post(':id/review')
  submitReview(@Param('id') id: string, @Body() dto: any) {
    return this.svc.submitReview({ ...dto, restaurantId: id });
  }

  @Get(':id/offers')
  getOffers(@Param('id') id: string) { return this.svc.getOffers(id); }

  @Post(':id/book-table')
  bookTable(@Param('id') id: string, @Body() dto: any) {
    return this.svc.bookTable(id, dto);
  }

  @Post(':id/order')
  placeOrder(@Param('id') id: string, @Body() dto: any) {
    return this.svc.placeOrder({ ...dto, restaurantId: id });
  }

  // ── Menu Management ─────────────────────────────────────────────────────────

  @Post('menu-item')
  addMenuItem(@Body() dto: any & { restaurantId: string }) {
    return this.svc.addMenuItem(dto.restaurantId, dto);
  }

  @Put('menu-item/:itemId')
  updateMenuItem(@Param('itemId') itemId: string, @Body() dto: any) {
    return this.svc.updateMenuItem(itemId, dto);
  }

  @Delete('menu-item/:itemId')
  deleteMenuItem(@Param('itemId') itemId: string) {
    return this.svc.deleteMenuItem(itemId);
  }

  @Get('menu-categories')
  getMenuCategories(@Query('restaurantId') rid: string) {
    return this.svc.getMenuCategories(rid);
  }

  @Post('menu-category')
  addCategory(@Body() dto: any) {
    return this.svc.addMenuCategory(dto.restaurantId, dto);
  }

  @Put('menu-category/:id')
  updateCategory(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateMenuCategory(id, dto);
  }

  @Delete('menu-category/:id')
  deleteCategory(@Param('id') id: string) {
    return this.svc.deleteMenuCategory(id);
  }

  // ── Restaurant Status ───────────────────────────────────────────────────────

  @Put('status')
  toggleStatus(@Body('restaurantId') rid: string, @Body('isOnline') isOnline: boolean) {
    return this.svc.toggleRestaurantStatus(rid, isOnline);
  }

  @Put(':id/profile')
  updateProfile(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateRestaurantProfile(id, dto);
  }

  // ── Reservations ────────────────────────────────────────────────────────────

  @Get(':id/reservations')
  getReservations(@Param('id') id: string, @Query('status') status?: string, @Query('date') date?: string) {
    return this.svc.getReservations(id, { status, date });
  }

  @Put('reservations/:id/status')
  updateReservationStatus(@Param('id') id: string, @Body('status') status: ReservationStatus, @Body() meta: any) {
    return this.svc.updateReservationStatus(id, status, meta);
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  @Get(':id/orders')
  getOrders(@Param('id') id: string, @Query('status') status?: string, @Query('type') type?: string,
    @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.getOrdersByRestaurant(id, { status, type, page: +page, limit: +limit });
  }

  @Get(':restaurantId/orders/:orderId')
  getOrder(@Param('restaurantId') rid: string, @Param('orderId') oid: string) {
    return this.svc.getOrderById(rid, oid);
  }

  @Post(':restaurantId/orders/:orderId/accept')
  acceptOrder(@Param('restaurantId') rid: string, @Param('orderId') oid: string) {
    return this.svc.updateOrderStatus(rid, oid, RestaurantOrderStatus.RESTAURANT_ACCEPTED);
  }

  @Post(':restaurantId/orders/:orderId/reject')
  rejectOrder(@Param('restaurantId') rid: string, @Param('orderId') oid: string, @Body('reason') reason: string) {
    return this.svc.updateOrderStatus(rid, oid, RestaurantOrderStatus.RESTAURANT_REJECTED, { reason, cancelledBy: 'restaurant' });
  }

  @Put(':restaurantId/orders/:orderId/status')
  updateOrderStatus(@Param('restaurantId') rid: string, @Param('orderId') oid: string,
    @Body('status') status: RestaurantOrderStatus, @Body() meta: any) {
    return this.svc.updateOrderStatus(rid, oid, status, meta);
  }

  // ── Tables ──────────────────────────────────────────────────────────────────

  @Get(':id/tables')
  getTables(@Param('id') id: string) { return this.svc.getTables(id); }

  @Put(':id/tables/:tableId')
  updateTable(@Param('id') id: string, @Param('tableId') tid: string, @Body() dto: any) {
    return this.svc.updateTable(id, tid, dto);
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────

  @Get(':id/payouts')
  getPayouts(@Param('id') id: string) { return this.svc.getPayouts(id); }

  @Get(':id/earnings')
  getEarnings(@Param('id') id: string) { return this.svc.getEarnings(id); }

  // ── Promotions ──────────────────────────────────────────────────────────────

  @Get(':id/promotions')
  getPromotions(@Param('id') id: string) { return this.svc.getPromotions(id); }

  @Post(':id/promotions')
  createPromotion(@Param('id') id: string, @Body() dto: any) { return this.svc.createPromotion(id, dto); }

  @Put(':id/promotions/:promoId')
  updatePromotion(@Param('promoId') pid: string, @Body() dto: any) { return this.svc.updatePromotion(pid, dto); }

  @Delete(':id/promotions/:promoId')
  deletePromotion(@Param('promoId') pid: string) { return this.svc.deletePromotion(pid); }

  // ── Staff ───────────────────────────────────────────────────────────────────

  @Get(':id/staff')
  getStaff(@Param('id') id: string) { return this.svc.getStaff(id); }

  @Post(':id/staff')
  addStaff(@Param('id') id: string, @Body() dto: any) { return this.svc.addStaff(id, dto); }

  @Put(':id/staff/:staffId')
  updateStaff(@Param('staffId') sid: string, @Body() dto: any) { return this.svc.updateStaff(sid, dto); }

  @Delete(':id/staff/:staffId')
  removeStaff(@Param('staffId') sid: string) { return this.svc.removeStaff(sid); }

  // ── Analytics ───────────────────────────────────────────────────────────────

  @Get(':id/analytics')
  getAnalytics(@Param('id') id: string) { return this.svc.getAnalytics(id); }

  // ── Inventory ───────────────────────────────────────────────────────────────

  @Get(':id/inventory')
  getInventory(@Param('id') id: string) { return this.svc.getInventory(id); }

  @Put(':id/inventory/:itemId')
  updateInventory(@Param('id') id: string, @Param('itemId') iid: string, @Body() dto: any) {
    return this.svc.updateInventoryItem(id, iid, dto);
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  @Get('approvals/pending')
  getPendingApprovals() { return this.svc.getPendingApprovals(); }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.svc.approveRestaurant(id, adminId);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.rejectRestaurant(id, reason);
  }

  @Post('admin/:id/suspend')
  suspend(@Param('id') id: string) { return this.svc.suspendRestaurant(id); }

  @Post('admin/:id/unsuspend')
  unsuspend(@Param('id') id: string) { return this.svc.unsuspendRestaurant(id); }

  @Post('admin/:id/block')
  block(@Param('id') id: string) { return this.svc.blockRestaurant(id); }

  @Post('admin/:id/unblock')
  unblock(@Param('id') id: string) { return this.svc.unblockRestaurant(id); }

  @Put('admin/:id/commission')
  setCommission(@Param('id') id: string, @Body('rate') rate: number) {
    return this.svc.setCommission(id, rate);
  }

  @Get('admin/list')
  adminList(@Query('status') status?: string, @Query('page') p = 1, @Query('limit') l = 50) {
    return this.svc.getAdminRestaurantList({ status, page: +p, limit: +l });
  }

  @Get('admin/:id')
  adminGetById(@Param('id') id: string) { return this.svc.getRestaurantById(id); }

  // ── Message Patterns (TCP/gRPC microservice calls) ──────────────────────────

  // These three declared `@Payload() id: string` while the gateway has always
  // sent `{ id }`, so the whole object arrived where a uuid was expected and
  // Postgres rejected it: `invalid input syntax for type uuid:
  // "{"id":"176fe297-..."}"`. Every restaurant detail, menu and analytics view
  // was a 500 — previously hidden as an empty 200 by the gateway fallback.
  // `d?.id ?? d` accepts both shapes so neither side has to change in lockstep.
  @MessagePattern({ cmd: 'get_restaurant_by_id' })
  msgGetById(@Payload() d: IdMessage | string) { return this.svc.getRestaurantById(requireId(messageId(d), 'record')); }

  @MessagePattern({ cmd: 'get_restaurant_menu' })
  msgGetMenu(@Payload() d: IdMessage | string) { return this.svc.getMenuByRestaurant(requireId(messageId(d), 'record')); }

  @MessagePattern({ cmd: 'get_nearby_restaurants' })
  msgNearby(@Payload() d: { lat: number; lng: number; radiusKm: number }) {
    return this.svc.getNearbyRestaurants(d.lat, d.lng, d.radiusKm);
  }

  @MessagePattern({ cmd: 'place_restaurant_order' })
  msgPlaceOrder(@Payload() dto: any) { return this.svc.placeOrder(dto); }

  @MessagePattern({ cmd: 'get_restaurant_analytics' })
  msgAnalytics(@Payload() d: IdMessage | string) { return this.svc.getAnalytics(requireId(messageId(d), 'record')); }

  // ── Franchise module boundary ───────────────────────────────────────────
  // Consumed by franchise-service. These replace the raw cross-module SQL that
  // franchise-service used to run against restaurant tables directly.

  @MessagePattern({ cmd: 'franchise_restaurant_kpis' })
  msgFranchiseKpis(@Payload() d: EmptyMessage) { return this.franchiseView.getKpis(d.franchiseId); }

  @MessagePattern({ cmd: 'franchise_restaurant_list' })
  msgFranchiseList(@Payload() d: EmptyMessage) { return this.franchiseView.getRestaurants(d.franchiseId, d.search, d.status); }

  @MessagePattern({ cmd: 'franchise_restaurant_orders' })
  msgFranchiseOrders(@Payload() d: EmptyMessage) { return this.franchiseView.getOrders(d.franchiseId, d.page, d.status); }

  @MessagePattern({ cmd: 'franchise_restaurant_menu_stats' })
  msgFranchiseMenuStats(@Payload() d: EmptyMessage) { return this.franchiseView.getMenuStats(d.franchiseId); }

  @MessagePattern({ cmd: 'franchise_restaurant_analytics' })
  msgFranchiseAnalytics(@Payload() d: EmptyMessage) { return this.franchiseView.getAnalytics(d.franchiseId, d.period); }

  @MessagePattern({ cmd: 'franchise_restaurant_update_status' })
  msgFranchiseUpdateStatus(@Payload() d: any) {
    return this.franchiseView.updateRestaurantStatus(d.franchiseId, d.restaurantId, d.status);
  }

  // ===========================================================================
  // TCP handlers for the rest of the restaurant surface.
  //
  // The gateway's restaurant controller sends 115 distinct commands; this
  // controller answered 11 of them. The other 104 had no @MessagePattern, so
  // every one came back "There is no matching message handler defined in the
  // remote service" -- and the gateway's old fallback turned that into an empty
  // 200, which is why the restaurant module looked healthy while almost none of
  // it worked.
  //
  // The business logic was never missing: RestaurantService already implements
  // 54 methods. The 44 below are the ones with a direct counterpart, wired to
  // the existing implementation. Payloads follow the `d?.dto ?? d` convention
  // used in marketplace-service, because the gateway spreads dto fields flat.
  // ===========================================================================

  @MessagePattern({ cmd: 'add_menu_category' })
  tcpAddMenuCategory(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.addMenuCategory(requireId(d?.restaurantId, 'restaurant'), d?.dto ?? d); }

  @MessagePattern({ cmd: 'add_menu_item' })
  tcpAddMenuItem(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.addMenuItem(requireId(d?.restaurantId, 'restaurant'), d?.dto ?? d); }

  @MessagePattern({ cmd: 'add_staff' })
  tcpAddStaff(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.addStaff(requireId(d?.restaurantId, 'restaurant'), d?.dto ?? d); }

  @MessagePattern({ cmd: 'approve_restaurant' })
  tcpApproveRestaurant(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.approveRestaurant(requireId(d?.restaurantId, 'restaurant'), d?.adminId); }

  @MessagePattern({ cmd: 'block_restaurant' })
  tcpBlockRestaurant(@Payload() d: RestaurantScopedMessage) { return this.svc.blockRestaurant(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'book_table' })
  tcpBookTable(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.bookTable(requireId(d?.restaurantId, 'restaurant'), d?.dto ?? d); }

  @MessagePattern({ cmd: 'bulk_update_availability' })
  tcpBulkUpdateAvailability(@Payload() d: DtoMessage) { return this.svc.bulkUpdateAvailability(d?.items); }

  @MessagePattern({ cmd: 'cancel_reservation' })
  tcpCancelReservation(@Payload() d: DtoMessage) { return this.svc.cancelReservation(d?.reservationId, d?.customerId, d?.reason); }

  @MessagePattern({ cmd: 'create_promotion' })
  tcpCreatePromotion(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.createPromotion(requireId(d?.restaurantId, 'restaurant'), d?.dto ?? d); }

  @MessagePattern({ cmd: 'delete_menu_category' })
  tcpDeleteMenuCategory(@Payload() d: DtoMessage) { return this.svc.deleteMenuCategory(d?.categoryId); }

  @MessagePattern({ cmd: 'delete_menu_item' })
  tcpDeleteMenuItem(@Payload() d: DtoMessage) { return this.svc.deleteMenuItem(d?.itemId); }

  @MessagePattern({ cmd: 'delete_promotion' })
  tcpDeletePromotion(@Payload() d: DtoMessage) { return this.svc.deletePromotion(d?.promoId); }

  @MessagePattern({ cmd: 'get_cuisines' })
  tcpGetCuisines(@Payload() d: EmptyMessage) { return this.svc.getCuisines(); }

  @MessagePattern({ cmd: 'get_customer_reservations' })
  tcpGetCustomerReservations(@Payload() d: DtoMessage) { return this.svc.getCustomerReservations(d?.customerId); }

  @MessagePattern({ cmd: 'get_earnings' })
  tcpGetEarnings(@Payload() d: RestaurantScopedMessage) { return this.svc.getEarnings(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'get_inventory' })
  tcpGetInventory(@Payload() d: RestaurantScopedMessage) { return this.svc.getInventory(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'get_menu_categories' })
  tcpGetMenuCategories(@Payload() d: RestaurantScopedMessage) { return this.svc.getMenuCategories(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'get_offers' })
  tcpGetOffers(@Payload() d: RestaurantScopedMessage) { return this.svc.getOffers(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'get_orders_by_restaurant' })
  tcpGetOrdersByRestaurant(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.getOrdersByRestaurant(requireId(d?.restaurantId, 'restaurant'), d?.opts); }

  // ── Customer-facing order reads ─────────────────────────────────────────────
  // The gateway answered all three of these from objects written into its own
  // controller. They now read `restaurant_orders`, scoped to the customer whose
  // token the gateway verified.

  @MessagePattern({ cmd: 'get_customer_restaurant_orders' })
  tcpGetCustomerOrders(@Payload() d: { customerId?: string; status?: string; type?: string; page?: number; limit?: number }) {
    return this.svc.getCustomerOrders(requireId(d?.customerId, 'customer'), {
      status: d?.status, type: d?.type, page: d?.page, limit: d?.limit,
    });
  }

  @MessagePattern({ cmd: 'get_customer_restaurant_order' })
  tcpGetCustomerOrder(@Payload() d: { customerId?: string; orderId?: string }) {
    return this.svc.getCustomerOrderById(requireId(d?.customerId, 'customer'), requireId(d?.orderId, 'order'));
  }

  @MessagePattern({ cmd: 'get_customer_restaurant_order_tracking' })
  tcpGetCustomerOrderTracking(@Payload() d: { customerId?: string; orderId?: string }) {
    return this.svc.getCustomerOrderTracking(requireId(d?.customerId, 'customer'), requireId(d?.orderId, 'order'));
  }

  @MessagePattern({ cmd: 'cancel_customer_restaurant_order' })
  tcpCancelCustomerOrder(@Payload() d: { customerId?: string; orderId?: string; reason?: string }) {
    return this.svc.cancelCustomerOrder(requireId(d?.customerId, 'customer'), requireId(d?.orderId, 'order'), d?.reason);
  }

  @MessagePattern({ cmd: 'reorder_customer_restaurant_order' })
  tcpReorderCustomerOrder(@Payload() d: { customerId?: string; orderId?: string }) {
    return this.svc.getReorderItems(requireId(d?.customerId, 'customer'), requireId(d?.orderId, 'order'));
  }

  @MessagePattern({ cmd: 'get_payouts' })
  tcpGetPayouts(@Payload() d: RestaurantScopedMessage) { return this.svc.getPayouts(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'get_pending_approvals' })
  tcpGetPendingApprovals(@Payload() d: EmptyMessage) { return this.svc.getPendingApprovals(); }

  @MessagePattern({ cmd: 'get_promotions' })
  tcpGetPromotions(@Payload() d: RestaurantScopedMessage) { return this.svc.getPromotions(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'get_reservations' })
  tcpGetReservations(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.getReservations(requireId(d?.restaurantId, 'restaurant'), d?.opts); }

  @MessagePattern({ cmd: 'get_restaurant_by_slug' })
  tcpGetRestaurantBySlug(@Payload() d: DtoMessage) { return this.svc.getRestaurantBySlug(d?.slug); }

  @MessagePattern({ cmd: 'get_staff' })
  tcpGetStaff(@Payload() d: RestaurantScopedMessage) { return this.svc.getStaff(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'get_tables' })
  tcpGetTables(@Payload() d: RestaurantScopedMessage) { return this.svc.getTables(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'list_restaurants' })
  tcpListRestaurants(@Payload() d: EmptyMessage) { return this.svc.listRestaurants(d); }

  @MessagePattern({ cmd: 'reject_restaurant' })
  tcpRejectRestaurant(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.rejectRestaurant(requireId(d?.restaurantId, 'restaurant'), d?.reason); }

  @MessagePattern({ cmd: 'remove_staff' })
  tcpRemoveStaff(@Payload() d: DtoMessage) { return this.svc.removeStaff(d?.staffId); }

  @MessagePattern({ cmd: 'search_restaurants' })
  tcpSearchRestaurants(@Payload() d: PaginatedMessage & DtoMessage) { return this.svc.searchRestaurants(d?.q, d?.page ?? 1, d?.limit ?? 20); }

  @MessagePattern({ cmd: 'set_commission' })
  tcpSetCommission(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.setCommission(requireId(d?.restaurantId, 'restaurant'), d?.rate); }

  @MessagePattern({ cmd: 'submit_review' })
  tcpSubmitReview(@Payload() d: EmptyMessage) { return this.svc.submitReview(d); }

  @MessagePattern({ cmd: 'suspend_restaurant' })
  tcpSuspendRestaurant(@Payload() d: RestaurantScopedMessage) { return this.svc.suspendRestaurant(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'toggle_restaurant_status' })
  tcpToggleRestaurantStatus(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.toggleRestaurantStatus(requireId(d?.restaurantId, 'restaurant'), d?.isOnline); }

  @MessagePattern({ cmd: 'unblock_restaurant' })
  tcpUnblockRestaurant(@Payload() d: RestaurantScopedMessage) { return this.svc.unblockRestaurant(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'unsuspend_restaurant' })
  tcpUnsuspendRestaurant(@Payload() d: RestaurantScopedMessage) { return this.svc.unsuspendRestaurant(requireId(d?.restaurantId, 'restaurant')); }

  @MessagePattern({ cmd: 'update_inventory_item' })
  tcpUpdateInventoryItem(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.updateInventoryItem(requireId(d?.restaurantId, 'restaurant'), d?.itemId, d?.dto ?? d); }

  @MessagePattern({ cmd: 'update_menu_category' })
  tcpUpdateMenuCategory(@Payload() d: DtoMessage) { return this.svc.updateMenuCategory(d?.categoryId, d?.dto ?? d); }

  @MessagePattern({ cmd: 'update_menu_item' })
  tcpUpdateMenuItem(@Payload() d: DtoMessage) { return this.svc.updateMenuItem(d?.itemId, d?.dto ?? d); }

  @MessagePattern({ cmd: 'update_promotion' })
  tcpUpdatePromotion(@Payload() d: DtoMessage) { return this.svc.updatePromotion(d?.promoId, d?.dto ?? d); }

  @MessagePattern({ cmd: 'update_reservation_status' })
  // `status` is the reservation enum here, not the free-form status string that
  // PaginatedMessage carries for list filters — hence the explicit narrowing.
  tcpUpdateReservationStatus(
    @Payload() d: DtoMessage & { reservationId?: string; status?: ReservationStatus },
  ) { return this.svc.updateReservationStatus(requireId(d?.reservationId, 'reservation'), requireValue(d?.status, 'status'), d?.meta); }

  @MessagePattern({ cmd: 'update_restaurant_profile' })
  tcpUpdateRestaurantProfile(@Payload() d: IdMessage & DtoMessage) { return this.svc.updateRestaurantProfile(requireId(d?.id, 'record'), d?.update); }

  @MessagePattern({ cmd: 'update_staff' })
  tcpUpdateStaff(@Payload() d: DtoMessage) { return this.svc.updateStaff(d?.staffId, d?.dto ?? d); }

  @MessagePattern({ cmd: 'update_table' })
  tcpUpdateTable(@Payload() d: RestaurantScopedMessage & DtoMessage) { return this.svc.updateTable(requireId(d?.restaurantId, 'restaurant'), d?.tableId, d?.dto ?? d); }

  // ── Admin console commands ────────────────────────────────────────────────
  // The gateway's admin-* controllers address this service with dot-notation
  // commands and none had a handler, so every admin screen for this module got
  // "no matching message handler" — an empty 200 while the gateway fallbacks
  // were in place, a 503 once they were removed. The implementations already
  // existed; only the patterns were missing.

  @MessagePattern({ cmd: 'admin.restaurant.list' })
  tcpAdminGetAdminRestaurantList(@Payload() d: EmptyMessage) { return this.svc.getAdminRestaurantList(d); }

  @MessagePattern({ cmd: 'admin.restaurant.approve' })
  tcpAdminApproveRestaurant(@Payload() d: RestaurantScopedMessage & IdMessage & { adminId?: string }) { return this.svc.approveRestaurant(requireId(d?.id, 'record') ?? d?.restaurantId, requireId(d?.adminId, 'admin')); }

  @MessagePattern({ cmd: 'admin.restaurant.suspend' })
  tcpAdminSuspendRestaurant(@Payload() d: RestaurantScopedMessage & IdMessage) { return this.svc.suspendRestaurant(requireId(d?.id, 'record') ?? d?.restaurantId); }


  @MessagePattern({ cmd: 'admin.restaurant.cuisines' })
  tcpAdminGetCuisines(@Payload() d: EmptyMessage) { return this.svc.getCuisines(); }

  // ── Discovery ──────────────────────────────────────────────────────────────
  //
  // The gateway has routed /restaurants/home-feed, /collections,
  // /popular-dishes, /suggestions and /:id/reviews since it was written. None
  // of them had a handler here, so each answered 503 and the pages that needed
  // them shipped hardcoded arrays instead.

  @MessagePattern({ cmd: 'get_home_feed' })
  tcpGetHomeFeed(@Payload() d: EmptyMessage) { return this.svc.getHomeFeed(d?.regionCode); }

  @MessagePattern({ cmd: 'get_collections' })
  tcpGetCollections(@Payload() d: EmptyMessage) { return this.svc.getCollections(d?.regionCode); }

  @MessagePattern({ cmd: 'get_popular_dishes' })
  tcpGetPopularDishes(@Payload() d: EmptyMessage) {
    return this.svc.getPopularDishes(d?.limit, d?.regionCode);
  }

  @MessagePattern({ cmd: 'get_suggestions' })
  tcpGetSuggestions(@Payload() d: EmptyMessage) { return this.svc.getSuggestions(d?.q, d?.regionCode); }

  @MessagePattern({ cmd: 'get_reviews' })
  tcpGetReviews(@Payload() d: EmptyMessage) {
    return this.svc.getReviews(d.restaurantId, d?.page, d?.limit);
  }

}
