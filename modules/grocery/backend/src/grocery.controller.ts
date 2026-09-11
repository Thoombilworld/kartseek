import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Sse,
  Res,
  Header,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GroceryService } from './grocery.service';
import { GroceryAdminService } from './admin/admin.service';
import { FranchiseViewService } from './franchise/franchise-view.service';
import { CreateGroceryOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  CreateFlashDealDto,
  RejectFlashDealDto,
  CreateReviewDto,
  AddToWishlistDto,
  ReorderDto,
  ProductTranslationDto,
} from './dto/flash-deal.dto';
import { GroceryOrderStatus } from './entities/grocery-order.entity';
import { GroceryStore } from './entities/grocery-store.entity';
import { GroceryDeliveryZone } from './entities/grocery-delivery-zone.entity';
import { GroceryCategory } from './entities/grocery-category.entity';
import { GroceryItem } from './entities/grocery-item.entity';
import { FlashDealStatus } from './entities/grocery-flash-deal.entity';
import { Observable, interval, map, switchMap, startWith, from } from 'rxjs';
import { type Response } from 'express';
import { type EmptyMessage, RpcAwareExceptionsFilter, requireId, requireValue } from '@app/common';
import {
  type StoreMsg,
  type StoreProductMsg,
  type PageMsg,
  type StoreListMsg,
  type SearchMsg,
  type OrderMsg,
  type CustomerOrdersMsg,
  type FlashDealMsg,
  type WishlistMsg,
  type CategoryMsg,
  type FranchiseMsg,
  type AdminIdMsg,
  type AdminListMsg,
  type DtoPayload,
} from './transport/rpc-payloads';

/** The caller the gateway attached, in the shape the service expects. */
function actorOf(d: any): { id?: string; role?: string } {
  return { id: d?.actorId, role: d?.actorRole };
}

@ApiTags('🥬 Grocery')
@ApiBearerAuth('JWT')
@UseFilters(RpcAwareExceptionsFilter)
@Controller('grocery')
export class GroceryController {
  constructor(
    private readonly svc: GroceryService,
    private readonly admin: GroceryAdminService,
    private readonly franchiseView: FranchiseViewService,
  ) {}

  // ── Health ───────────────────────────────────────────────────────────────
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return this.svc.healthCheck();
  }

  // ── Categories ───────────────────────────────────────────────────────────

  /** GET /grocery/categories — all active categories (cached, 5 min TTL) */
  @Get('categories')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'List all active grocery categories' })
  getCategories() {
    return this.svc.getCategories();
  }

  /** GET /grocery/categories/:id — single category detail with subcategory tree */
  @Get('categories/:id')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get a single category with subcategories' })
  @ApiParam({ name: 'id', example: 'fruits-vegetables' })
  getCategoryById(@Param('id') id: string) {
    return this.svc.getCategoryById(id);
  }

  /** POST /grocery/categories — admin: create a new category */
  @Post('categories')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin: create a new grocery category' })
  createCategory(@Body() data: Partial<GroceryCategory>) {
    return this.svc.createCategory(data);
  }

  /** PATCH /grocery/categories/:id — admin: update a category */
  @Patch('categories/:id')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin: update a grocery category' })
  @ApiParam({ name: 'id', example: 'fruits-vegetables' })
  updateCategory(@Param('id') id: string, @Body() data: Partial<GroceryCategory>) {
    return this.svc.updateCategory(id, data);
  }

  /** DELETE /grocery/categories/cache — admin: force-invalidate category cache */
  @Delete('categories/cache')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin: invalidate the category cache' })
  invalidateCategoryCache() {
    return this.svc.invalidateCategoryCache();
  }

  // ── Stores ────────────────────────────────────────────────────────────────

  @Get('stores')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'List nearby grocery stores' })
  @ApiQuery({ name: 'lat', required: false, example: -1.2921 })
  @ApiQuery({ name: 'lng', required: false, example: 36.8219 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getStores(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.svc.getStores(
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      page,
      limit,
    );
  }

  @Get('stores/:id')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get a single store' })
  @ApiParam({ name: 'id', example: 'store-uuid' })
  getStore(@Param('id') id: string) {
    return this.svc.getStoreById(id);
  }

  @Get('stores/:id/categories')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get categories for a specific store' })
  getStoreCategories(@Param('id') id: string) {
    return this.svc.getStoreCategoriesByStoreId(id);
  }

  // ── Products ──────────────────────────────────────────────────────────────

  @Get('stores/:id/products')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'List products for a store' })
  @ApiParam({ name: 'id', example: 'store-uuid' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  getProducts(
    @Param('id') storeId: string,
    @Query('category') category?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.svc.getProducts(storeId, category, page, limit);
  }

  /** GET /grocery/stores/:id/products/export — CSV download (must be before /:productId) */
  @Get('stores/:id/products/export')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: export products as CSV' })
  async exportProducts(@Param('id') storeId: string, @Res() res: Response) {
    const result = await this.svc.exportProductsCsv(storeId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  }

  @Get('stores/:storeId/products/:productId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get a single product' })
  getProduct(@Param('storeId') storeId: string, @Param('productId') productId: string) {
    return this.svc.getProductById(storeId, productId);
  }

  /** GET /grocery/products/:productId — store-agnostic lookup for the detail page. */
  @Get('products/:productId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get a product by id, without knowing its store' })
  getProductAnyStore(@Param('productId') productId: string) {
    return this.svc.getProductByIdAnyStore(productId);
  }

  @Post('stores/:id/products')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: create a product' })
  createProduct(@Param('id') storeId: string, @Body() data: Partial<GroceryItem>) {
    return this.svc.createProduct(storeId, data);
  }

  @Put('stores/:storeId/products/:productId')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: update a product' })
  updateProduct(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() data: Partial<GroceryItem>,
  ) {
    return this.svc.updateProduct(storeId, productId, data);
  }

  @Delete('stores/:storeId/products/:productId')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: delete a product' })
  deleteProduct(@Param('storeId') storeId: string, @Param('productId') productId: string) {
    return this.svc.deleteProduct(storeId, productId);
  }

  @Post('stores/:id/products/bulk')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: bulk import products' })
  bulkImport(@Param('id') storeId: string, @Body() body: { products: Partial<GroceryItem>[] }) {
    return this.svc.bulkImportProducts(storeId, body.products);
  }

  // ── Product Translations ──────────────────────────────────────────────────

  @Patch('stores/:storeId/products/:productId/translations')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Update product translation for a locale' })
  updateTranslation(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: ProductTranslationDto,
  ) {
    return this.svc.updateProductTranslation(storeId, productId, dto);
  }

  @Get('stores/:storeId/products/:productId/translated')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get product with translations applied' })
  @ApiQuery({ name: 'locale', required: true, example: 'ar' })
  getTranslated(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Query('locale') locale: string,
  ) {
    return this.svc.getProductTranslated(storeId, productId, locale);
  }

  // ── Product Reviews ───────────────────────────────────────────────────────

  @Post('stores/:storeId/products/:productId/reviews')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a product review' })
  submitReview(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.svc.submitReview(storeId, productId, dto);
  }

  @Get('stores/:storeId/products/:productId/reviews')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get reviews for a product' })
  getProductReviews(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.svc.getProductReviews(storeId, productId, page, limit);
  }

  // ── Seller: Analytics & Settings ──────────────────────────────────────────

  @Get('stores/:id/analytics')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: store analytics' })
  getAnalytics(@Param('id') id: string, @Query('period') period?: string) {
    return this.svc.getStoreAnalytics(id, period);
  }

  @Patch('stores/:id/settings')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: update store settings' })
  updateSettings(@Param('id') id: string, @Body() settings: Record<string, any>) {
    return this.svc.updateStoreSettings(id, settings);
  }

  @Get('stores/:id/promotions')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: store promotions' })
  getPromotions(@Param('id') id: string) {
    return this.svc.getStorePromotions(id);
  }

  @Patch('stores/:storeId/products/:productId/promote')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Toggle product promotion' })
  togglePromotion(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() body: { promoted: boolean },
  ) {
    return this.svc.toggleProductPromotion(storeId, productId, body.promoted);
  }

  @Get('stores/:id/low-stock')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: low-stock items' })
  getLowStock(@Param('id') id: string, @Query('threshold') threshold?: string) {
    return this.svc.getLowStockItems(id, threshold ? parseInt(threshold) : undefined);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Search products across stores' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  searchProducts(
    @Query('q') q: string,
    @Query('storeId') storeId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.svc.searchProducts(q, storeId, categoryId, page, limit);
  }

  // ── Wishlist ──────────────────────────────────────────────────────────────

  @Post('wishlist')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Add product to wishlist' })
  addToWishlist(@Body() dto: AddToWishlistDto) {
    return this.svc.addToWishlist(dto);
  }

  @Delete('wishlist/:customerId/:productId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Remove product from wishlist' })
  removeFromWishlist(
    @Param('customerId') customerId: string,
    @Param('productId') productId: string,
  ) {
    return this.svc.removeFromWishlist(customerId, productId);
  }

  @Get('wishlist/:customerId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get customer wishlist' })
  getWishlist(
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.svc.getWishlist(customerId, page, limit);
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  @Post('orders')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Place a new grocery order' })
  createOrder(@Body() dto: CreateGroceryOrderDto) {
    return this.svc.createGroceryOrder(dto);
  }

  @Get('orders/:id')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiParam({ name: 'id', example: 'order-uuid' })
  getOrder(@Param('id') id: string) {
    return this.svc.getOrderById(id);
  }

  @Get('orders/customer/:customerId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get order history for a customer' })
  @ApiParam({ name: 'customerId', example: 'customer-uuid' })
  getCustomerOrders(
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.svc.getOrdersByCustomer(customerId, page, limit);
  }

  @Get('orders/store/:storeId')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: "Get orders for a seller's store" })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  @ApiQuery({ name: 'status', required: false, enum: GroceryOrderStatus })
  getStoreOrders(
    @Param('storeId') storeId: string,
    @Query('status') status?: GroceryOrderStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.svc.getOrdersByStore(storeId, status, page, limit);
  }

  @Patch('orders/:id/status')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Update order status (seller/admin)' })
  @ApiParam({ name: 'id', example: 'order-uuid' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.svc.updateOrderStatus(id, dto);
  }

  /** POST /grocery/orders/:id/reorder — clone past order items */
  @Post('orders/:id/reorder')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Reorder: clone items from a past order' })
  reorder(@Param('id') orderId: string, @Body() dto: ReorderDto) {
    return this.svc.reorderFromHistory(orderId, dto);
  }

  /**
   * GET /grocery/orders/:id/tracking — SSE for live order tracking.
   *
   * `map(async …)` emits the Promise itself, so every frame on the wire was a
   * serialised empty object and the tracking page never advanced past its initial
   * state. `switchMap` subscribes to the promise and emits what it resolves to;
   * it also cancels an in-flight lookup if the next tick arrives first, so a slow
   * query cannot queue up behind itself. The stream ends on error rather than
   * silently stalling, which lets EventSource reconnect.
   */
  @Sse('orders/:id/tracking')
  @ApiOperation({ summary: 'Live order tracking (SSE)' })
  orderTracking(@Param('id') orderId: string): Observable<MessageEvent> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => from(this.svc.getDeliveryTracking(orderId))),
      map((tracking) => ({ data: tracking }) as MessageEvent),
    );
  }

  // ── Flash Deals ───────────────────────────────────────────────────────────

  @Post('flash-deals')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: create a flash deal' })
  createFlashDeal(@Body() dto: CreateFlashDealDto) {
    return this.svc.createFlashDeal(dto);
  }

  @Patch('flash-deals/:id/submit')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Seller: submit flash deal for approval' })
  submitFlashDeal(@Param('id') id: string) {
    return this.svc.submitFlashDeal(id);
  }

  @Patch('flash-deals/:id/approve')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin: approve a flash deal' })
  approveFlashDeal(@Param('id') id: string) {
    return this.svc.approveFlashDeal(id);
  }

  @Patch('flash-deals/:id/reject')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin: reject a flash deal' })
  rejectFlashDeal(@Param('id') id: string, @Body() dto: RejectFlashDealDto) {
    return this.svc.rejectFlashDeal(id, dto);
  }

  @Patch('flash-deals/:id/pause')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Pause an active flash deal' })
  pauseFlashDeal(@Param('id') id: string) {
    return this.svc.pauseFlashDeal(id);
  }

  @Patch('flash-deals/:id/resume')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Resume a paused flash deal' })
  resumeFlashDeal(@Param('id') id: string) {
    return this.svc.resumeFlashDeal(id);
  }

  @Get('flash-deals')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'List flash deals (admin/seller)' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: FlashDealStatus })
  getFlashDeals(
    @Query('storeId') storeId?: string,
    @Query('status') status?: FlashDealStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.svc.getFlashDeals({ storeId, status, page, limit });
  }

  @Get('flash-deals/store/:storeId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get active flash deals for a store (customer-facing)' })
  getStoreFlashDeals(@Param('storeId') storeId: string) {
    return this.svc.getActiveFlashDealsByStore(storeId);
  }

  // ── TCP / gRPC MessagePatterns (Flutter mobile apps) ─────────────────────

  @MessagePattern({ cmd: 'get_grocery_stores' })
  msgStores(
    @Payload()
    d: StoreListMsg & { lat?: number; lng?: number; regionCode?: string; category?: string },
  ) {
    return this.svc.getStores(d.lat, d.lng, d.page, d.limit, d.regionCode, d.category);
  }

  @MessagePattern({ cmd: 'get_grocery_categories' })
  msgCategories(@Payload() d: { regionCode?: string; stockedOnly?: boolean } | EmptyMessage) {
    const p = (d ?? {}) as { regionCode?: string; stockedOnly?: boolean };
    return this.svc.getCategories(p.regionCode, p.stockedOnly === true);
  }

  @MessagePattern({ cmd: 'get_grocery_category' })
  msgCategory(@Payload() d: CategoryMsg) {
    return this.svc.getCategoryById(requireId(d.id, 'record'));
  }

  @MessagePattern({ cmd: 'get_store_categories' })
  msgStoreCategories(@Payload() d: StoreMsg) {
    return this.svc.getStoreCategoriesByStoreId(requireId(d.storeId, 'store'));
  }

  @MessagePattern({ cmd: 'get_grocery_brands' })
  getBrands(@Payload() d: { regionCode?: string; limit?: number }) {
    return this.svc.getBrands(d?.regionCode, d?.limit);
  }

  @MessagePattern({ cmd: 'get_grocery_products_by_brand' })
  getProductsByBrand(
    @Payload() d: { brand: string; regionCode?: string; page?: number; limit?: number },
  ) {
    return this.svc.getProductsByBrand(d?.brand, d?.regionCode, d?.page, d?.limit);
  }

  /** The department -> category -> subcategory tree. */
  @MessagePattern({ cmd: 'get_grocery_category_tree' })
  msgCategoryTree(@Payload() d: { regionCode?: string }) {
    return this.svc.getCategoryTree(d?.regionCode);
  }

  /** Admin: rebuild the catalogue tree from categories and real product data. */
  @MessagePattern({ cmd: 'rebuild_grocery_catalog_tree' })
  msgRebuildCatalogTree() {
    return this.svc.rebuildCatalogTree();
  }

  // ── Brands & variants ──────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'request_grocery_brand' })
  msgRequestBrand(@Payload() d: any) {
    return this.svc.requestBrand(d, d?.sellerId);
  }

  @MessagePattern({ cmd: 'set_grocery_brand_approval' })
  msgSetBrandApproval(
    @Payload() d: { brandId: string; status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    return this.svc.setBrandApproval(requireId(d?.brandId, 'brand'), d?.status, d?.reason);
  }

  @MessagePattern({ cmd: 'list_grocery_brands' })
  msgListBrands(@Payload() d: { status?: string; page?: number; limit?: number }) {
    return this.svc.getBrands2(d?.status, d?.page, d?.limit);
  }

  @MessagePattern({ cmd: 'backfill_grocery_catalog_entities' })
  msgBackfillCatalogEntities() {
    return this.svc.backfillCatalogEntities();
  }

  // ── Warehouses ─────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'list_grocery_warehouses' })
  msgListWarehouses(@Payload() d: { storeId: string; includeInactive?: boolean }) {
    return this.svc.listWarehouses(d?.storeId, d?.includeInactive);
  }

  @MessagePattern({ cmd: 'create_grocery_warehouse' })
  msgCreateWarehouse(@Payload() d: any) {
    return this.svc.createWarehouse(d?.storeId, d);
  }

  @MessagePattern({ cmd: 'transfer_grocery_stock' })
  msgTransferStock(@Payload() d: any) {
    return this.svc.transferStock(d);
  }

  @MessagePattern({ cmd: 'get_grocery_variant_stock_locations' })
  msgVariantStockLocations(@Payload() d: { variantId: string }) {
    return this.svc.getVariantStockByLocation(d?.variantId);
  }

  @MessagePattern({ cmd: 'audit_grocery_warehouse_stock' })
  msgAuditWarehouse(@Payload() d: any) {
    return this.svc.auditWarehouseStock(d);
  }

  @MessagePattern({ cmd: 'backfill_grocery_warehouses' })
  msgBackfillWarehouses() {
    return this.svc.backfillWarehouses();
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'record_grocery_stock_movement' })
  msgStockMovement(@Payload() d: any) {
    return this.svc.recordStockMovement(d);
  }

  @MessagePattern({ cmd: 'write_off_grocery_stock' })
  msgWriteOffStock(@Payload() d: any) {
    return this.svc.writeOffStock(d);
  }

  @MessagePattern({ cmd: 'get_grocery_low_stock_variants' })
  msgLowStockVariants(@Payload() d: { storeId: string; threshold?: number }) {
    return this.svc.getLowStockVariants(d?.storeId, d?.threshold);
  }

  @MessagePattern({ cmd: 'get_grocery_stock_history' })
  msgStockHistory(@Payload() d: { variantId: string; page?: number; limit?: number }) {
    return this.svc.getStockHistory(d?.variantId, d?.page, d?.limit);
  }

  @MessagePattern({ cmd: 'get_grocery_products' })
  msgProducts(@Payload() d: StoreListMsg & { regionCode?: string }) {
    return this.svc.getProducts(d.storeId, d.category, d.page, d.limit, d.regionCode, actorOf(d));
  }

  /** Moderation: approve or reject a listing. Gateway restricts to admins. */
  @MessagePattern({ cmd: 'set_grocery_product_approval' })
  msgSetProductApproval(
    @Payload()
    d: {
      productId: string;
      status: 'APPROVED' | 'REJECTED';
      reason?: string;
      actorId?: string;
      actorRole?: string;
      actorIp?: string;
    },
  ) {
    return this.svc.setProductApproval(requireId(d?.productId, 'product'), d?.status, d?.reason, {
      actorId: d?.actorId,
      actorRole: d?.actorRole,
      actorIp: d?.actorIp,
    });
  }

  /** Moderation queue. */
  @MessagePattern({ cmd: 'get_grocery_pending_products' })
  msgPendingProducts(@Payload() d: { page?: number; limit?: number; storeId?: string }) {
    return this.svc.getPendingProducts(d?.page, d?.limit, d?.storeId);
  }

  @MessagePattern({ cmd: 'create_grocery_order' })
  msgCreateOrder(@Payload() d: DtoPayload) {
    return this.svc.createGroceryOrder(d as unknown as CreateGroceryOrderDto);
  }

  @MessagePattern({ cmd: 'get_grocery_order' })
  msgGetOrder(@Payload() d: OrderMsg) {
    return this.svc.getOrderById(requireId(d.orderId, 'order'), d?.requesterId, d?.requesterRole);
  }

  @MessagePattern({ cmd: 'get_grocery_order_status' })
  msgOrderStatus(@Payload() d: OrderMsg) {
    return this.svc.getOrderById(requireId(d.orderId, 'order'), d?.requesterId, d?.requesterRole);
  }

  @MessagePattern({ cmd: 'get_grocery_order_tracking' })
  msgOrderTracking(@Payload() d: OrderMsg) {
    return this.svc.getDeliveryTracking(
      requireId(d.orderId, 'order'),
      d?.requesterId,
      d?.requesterRole,
    );
  }

  @MessagePattern({ cmd: 'get_customer_grocery_orders' })
  msgCustomerOrders(@Payload() d: CustomerOrdersMsg) {
    return this.svc.getOrdersByCustomer(requireId(d.customerId, 'customer'), d.page, d.limit);
  }

  @MessagePattern({ cmd: 'update_grocery_order_status' })
  msgUpdateStatus(@Payload() d: OrderMsg & DtoPayload) {
    return this.svc.updateOrderStatus(d.orderId!, d as unknown as UpdateOrderStatusDto, {
      id: d?.actorId,
      role: d?.actorRole,
    });
  }

  @MessagePattern({ cmd: 'search_grocery_products' })
  msgSearch(@Payload() d: SearchMsg) {
    return this.svc.searchProducts(
      requireId(d.query, 'query'),
      d.storeId,
      d.categoryId,
      d.page,
      d.limit,
    );
  }

  // ── Seller MessagePatterns ──────────────────────────────────────────────

  @MessagePattern({ cmd: 'create_grocery_product' })
  msgCreateProduct(@Payload() d: StoreProductMsg & DtoPayload) {
    return this.svc.createProduct(requireId(d.storeId, 'store'), d);
  }

  @MessagePattern({ cmd: 'update_grocery_product' })
  msgUpdateProduct(@Payload() d: StoreProductMsg & DtoPayload) {
    return this.svc.updateProduct(
      requireId(d.storeId, 'store'),
      requireId(d.productId, 'product'),
      d,
    );
  }

  @MessagePattern({ cmd: 'delete_grocery_product' })
  msgDeleteProduct(@Payload() d: StoreProductMsg) {
    return this.svc.deleteProduct(requireId(d.storeId, 'store'), requireId(d.productId, 'product'));
  }

  @MessagePattern({ cmd: 'get_grocery_store_analytics' })
  msgAnalytics(@Payload() d: StoreMsg & { period?: string }) {
    return this.svc.getStoreAnalytics(requireId(d.storeId, 'store'), d.period);
  }

  @MessagePattern({ cmd: 'update_grocery_store_settings' })
  msgSettings(@Payload() d: StoreMsg & DtoPayload) {
    return this.svc.updateStoreSettings(d.storeId!, d as Partial<GroceryStore>);
  }

  @MessagePattern({ cmd: 'get_grocery_low_stock' })
  msgLowStock(@Payload() d: StoreMsg & { threshold?: number }) {
    return this.svc.getLowStockItems(requireId(d.storeId, 'store'), d.threshold);
  }

  @MessagePattern({ cmd: 'bulk_import_grocery_products' })
  msgBulkImport(@Payload() d: StoreMsg & { products?: any[] }) {
    return this.svc.bulkImportProducts(
      requireId(d.storeId, 'store'),
      requireValue(d.products, 'products'),
    );
  }

  @MessagePattern({ cmd: 'get_grocery_store' })
  msgGetStore(@Payload() d: CategoryMsg) {
    return this.svc.getStoreById(requireId(d.id, 'record'));
  }

  @MessagePattern({ cmd: 'get_grocery_product' })
  msgGetProduct(@Payload() d: StoreProductMsg) {
    return this.svc.getProductById(
      requireId(d.storeId, 'store'),
      requireId(d.productId, 'product'),
    );
  }

  @MessagePattern({ cmd: 'get_grocery_product_any_store' })
  msgGetProductAnyStore(@Payload() d: StoreProductMsg) {
    return this.svc.getProductByIdAnyStore(requireId(d.productId, 'product'));
  }

  @MessagePattern({ cmd: 'get_store_grocery_orders' })
  msgStoreOrders(@Payload() d: StoreListMsg) {
    return this.svc.getOrdersByStore(
      d.storeId!,
      d.status as GroceryOrderStatus | undefined,
      d.page,
      d.limit,
    );
  }

  @MessagePattern({ cmd: 'create_grocery_category' })
  msgCreateCategory(@Payload() d: DtoPayload) {
    return this.svc.createCategory(d);
  }

  @MessagePattern({ cmd: 'invalidate_grocery_cache' })
  msgInvalidateCache(@Payload() _d: EmptyMessage) {
    return this.svc.invalidateCategoryCache();
  }

  @MessagePattern({ cmd: 'get_grocery_store_promotions' })
  msgPromotions(@Payload() d: StoreMsg) {
    return this.svc.getStorePromotions(requireId(d.storeId, 'store'));
  }

  @MessagePattern({ cmd: 'toggle_grocery_promotion' })
  msgTogglePromotion(@Payload() d: StoreProductMsg & { promoted?: boolean }) {
    return this.svc.toggleProductPromotion(
      requireId(d.storeId, 'store'),
      requireId(d.productId, 'product'),
      requireValue(d.promoted, 'promoted'),
    );
  }

  // ── New MessagePatterns: Flash Deals, Reviews, Wishlist ─────────────────

  @MessagePattern({ cmd: 'create_flash_deal' })
  msgCreateFlashDeal(@Payload() d: DtoPayload) {
    return this.svc.createFlashDeal(d as unknown as CreateFlashDealDto, actorOf(d));
  }

  @MessagePattern({ cmd: 'submit_flash_deal' })
  msgSubmitFlashDeal(@Payload() d: FlashDealMsg) {
    return this.svc.submitFlashDeal(requireId(d.dealId, 'flash deal'), actorOf(d));
  }

  @MessagePattern({ cmd: 'approve_flash_deal' })
  msgApproveFlashDeal(@Payload() d: FlashDealMsg & { scope?: string }) {
    return this.svc.approveFlashDeal(requireId(d.dealId, 'flash deal'), d.approvedBy, d?.scope);
  }

  @MessagePattern({ cmd: 'reject_flash_deal' })
  msgRejectFlashDeal(@Payload() d: FlashDealMsg & DtoPayload & { scope?: string }) {
    return this.svc.rejectFlashDeal(d.dealId!, d as unknown as RejectFlashDealDto, d?.scope);
  }

  @MessagePattern({ cmd: 'get_store_flash_deals' })
  msgStoreFlashDeals(@Payload() d: FlashDealMsg) {
    return this.svc.getActiveFlashDealsByStore(requireId(d.storeId, 'store'));
  }

  @MessagePattern({ cmd: 'submit_grocery_review' })
  msgSubmitReview(@Payload() d: StoreProductMsg & DtoPayload) {
    return this.svc.submitReview(d.storeId!, d.productId!, d as unknown as CreateReviewDto);
  }

  @MessagePattern({ cmd: 'get_grocery_wishlist' })
  msgGetWishlist(@Payload() d: WishlistMsg) {
    return this.svc.getWishlist(requireId(d.customerId, 'customer'), d.page, d.limit);
  }

  @MessagePattern({ cmd: 'reorder_grocery' })
  msgReorder(@Payload() d: OrderMsg & DtoPayload) {
    return this.svc.reorderFromHistory(d.orderId!, d as unknown as ReorderDto);
  }

  // ── New MessagePatterns (matching gateway routes) ─────────────────────

  @MessagePattern({ cmd: 'update_grocery_category' })
  msgUpdateCategory(@Payload() d: CategoryMsg & DtoPayload) {
    return this.svc.updateCategory(requireId(d.id, 'record'), d);
  }

  @MessagePattern({ cmd: 'export_grocery_products' })
  msgExportProducts(@Payload() d: StoreMsg) {
    return this.svc.exportProductsCsv(requireId(d.storeId, 'store'));
  }

  @MessagePattern({ cmd: 'update_product_translation' })
  msgUpdateTranslation(@Payload() d: StoreProductMsg & DtoPayload) {
    return this.svc.updateProductTranslation(
      d.storeId!,
      d.productId!,
      d as unknown as ProductTranslationDto,
    );
  }

  @MessagePattern({ cmd: 'get_product_translated' })
  msgGetTranslated(@Payload() d: StoreProductMsg & { locale?: string }) {
    return this.svc.getProductTranslated(
      requireId(d.storeId, 'store'),
      requireId(d.productId, 'product'),
      requireId(d.locale, 'locale'),
    );
  }

  @MessagePattern({ cmd: 'get_product_reviews' })
  msgGetReviews(@Payload() d: StoreProductMsg & PageMsg) {
    return this.svc.getProductReviews(
      requireId(d.storeId, 'store'),
      requireId(d.productId, 'product'),
      d.page,
      d.limit,
    );
  }

  @MessagePattern({ cmd: 'add_to_grocery_wishlist' })
  msgAddToWishlist(@Payload() d: DtoPayload) {
    return this.svc.addToWishlist(d as unknown as AddToWishlistDto);
  }

  @MessagePattern({ cmd: 'remove_from_grocery_wishlist' })
  msgRemoveFromWishlist(@Payload() d: WishlistMsg) {
    return this.svc.removeFromWishlist(
      requireId(d.customerId, 'customer'),
      requireId(d.productId, 'product'),
    );
  }

  @MessagePattern({ cmd: 'pause_flash_deal' })
  msgPauseFlashDeal(@Payload() d: FlashDealMsg) {
    return this.svc.pauseFlashDeal(requireId(d.dealId, 'flash deal'), actorOf(d));
  }

  @MessagePattern({ cmd: 'resume_flash_deal' })
  msgResumeFlashDeal(@Payload() d: FlashDealMsg) {
    return this.svc.resumeFlashDeal(requireId(d.dealId, 'flash deal'), actorOf(d));
  }

  // ── Franchise module boundary ───────────────────────────────────────────
  // Consumed by franchise-service. These replace the raw cross-module SQL that
  // franchise-service used to run against grocery tables directly.

  @MessagePattern({ cmd: 'franchise_grocery_kpis' })
  msgFranchiseKpis(@Payload() d: FranchiseMsg) {
    return this.franchiseView.getKpis(requireId(d.franchiseId, 'franchise'));
  }

  @MessagePattern({ cmd: 'franchise_grocery_stores' })
  msgFranchiseStores(@Payload() d: FranchiseMsg) {
    return this.franchiseView.getStores(requireId(d.franchiseId, 'franchise'), d.search, d.status);
  }

  @MessagePattern({ cmd: 'franchise_grocery_orders' })
  msgFranchiseOrders(@Payload() d: FranchiseMsg) {
    return this.franchiseView.getOrders(requireId(d.franchiseId, 'franchise'), d.page, d.status);
  }

  @MessagePattern({ cmd: 'franchise_grocery_products' })
  msgFranchiseProducts(@Payload() d: FranchiseMsg) {
    return this.franchiseView.getProducts(
      requireId(d.franchiseId, 'franchise'),
      d.search,
      d.category,
    );
  }

  @MessagePattern({ cmd: 'franchise_grocery_analytics' })
  msgFranchiseAnalytics(@Payload() d: FranchiseMsg) {
    return this.franchiseView.getAnalytics(requireId(d.franchiseId, 'franchise'), d.period);
  }

  @MessagePattern({ cmd: 'franchise_grocery_update_store_status' })
  msgFranchiseUpdateStoreStatus(@Payload() d: FranchiseMsg) {
    return this.franchiseView.updateStoreStatus(
      requireId(d.franchiseId, 'franchise'),
      requireId(d.storeId, 'store'),
      requireId(d.status, 'status'),
    );
  }

  // ── Admin console commands ────────────────────────────────────────────────
  // The gateway's AdminGroceryController addresses this service with eighteen
  // dot-notation commands. Two had handlers; the other sixteen had none, so every
  // remaining admin screen got "no matching message handler" — an empty 200 while
  // the gateway fallbacks were in place, a 503 once they were removed. All
  // eighteen are bound below.
  //
  // Every one of these also carries `d?.scope`: set only for a market-locked
  // admin (see `AdminGroceryController.scopeOf`), it is the defense-in-depth
  // half of market isolation — the gateway already forced `regionCode` to that
  // admin's own market, and the service asserts it again against the record it
  // actually loaded.

  @MessagePattern({ cmd: 'admin.grocery.dashboard' })
  tcpAdminDashboard(@Payload() d: { scope?: string }) {
    return this.admin.getDashboard(d?.scope);
  }

  @MessagePattern({ cmd: 'admin.grocery.stores' })
  tcpAdminStores(@Payload() d: AdminListMsg & { scope?: string }) {
    return this.admin.listStores({ ...d, regionCode: d?.scope ?? d?.regionCode });
  }

  @MessagePattern({ cmd: 'admin.grocery.storeDetail' })
  tcpAdminStoreDetail(@Payload() d: AdminIdMsg & { scope?: string }) {
    return this.admin.getStoreDetail(requireId(d.id, 'record'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.grocery.approve' })
  tcpAdminApproveStore(@Payload() d: AdminIdMsg & { scope?: string }) {
    return this.admin.setStoreStatus(
      requireId(d.id, 'record'),
      'APPROVED',
      d?.reason,
      d?.actorId,
      d?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin.grocery.suspend' })
  tcpAdminSuspendStore(@Payload() d: AdminIdMsg & { scope?: string }) {
    return this.admin.setStoreStatus(
      requireId(d.id, 'record'),
      'SUSPENDED',
      d?.reason,
      d?.actorId,
      d?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin.grocery.products' })
  tcpAdminGetProducts(@Payload() d: AdminListMsg & { scope?: string }) {
    // Admins see the whole catalogue, PENDING included — this is the screen
    // moderation happens on. When listing moderation was added, `getProducts`
    // gained a filter that hides unapproved rows from anyone without a
    // privileged actor, and this call passed none: seller-submitted products
    // stopped appearing in the Super Admin panel entirely.
    //
    // The route is `@Roles(ADMIN, SUPER_ADMIN)` on `AdminGroceryController`, so
    // reaching this handler already proves the caller is a moderator — which is
    // also why the region filter below does not also require store approval
    // (see the `privileged` branch in `getProducts`).
    return this.svc.getProducts(
      d?.storeId,
      d?.category,
      d?.page ?? 1,
      d?.limit ?? 30,
      d?.scope ?? d?.regionCode,
      { role: 'ADMIN' },
      (d as any)?.approvalStatus,
    );
  }

  @MessagePattern({ cmd: 'admin.grocery.orders' })
  tcpAdminOrders(@Payload() d: AdminListMsg & { scope?: string }) {
    return this.admin.listOrders({ ...d, regionCode: d?.scope ?? d?.regionCode });
  }

  @MessagePattern({ cmd: 'admin.grocery.categories' })
  tcpAdminGetCategories(@Payload() _d: EmptyMessage) {
    return this.svc.getCategories();
  }

  @MessagePattern({ cmd: 'admin.grocery.createCategory' })
  tcpAdminCreateCategory(@Payload() d: DtoPayload) {
    return this.svc.createCategory(d);
  }

  @MessagePattern({ cmd: 'admin.grocery.updateCategory' })
  tcpAdminUpdateCategory(@Payload() d: CategoryMsg & DtoPayload) {
    const { id, ...rest } = d ?? {};
    return this.svc.updateCategory(requireId(id, 'category'), rest);
  }

  @MessagePattern({ cmd: 'admin.grocery.deleteCategory' })
  tcpAdminDeleteCategory(@Payload() d: AdminIdMsg) {
    return this.svc.deleteCategory(requireId(d.id, 'record'));
  }

  @MessagePattern({ cmd: 'admin.grocery.deliveryZones' })
  tcpAdminDeliveryZones(@Payload() d: AdminListMsg & { scope?: string }) {
    return this.admin.listDeliveryZones(d?.scope ?? d?.regionCode);
  }

  @MessagePattern({ cmd: 'admin.grocery.createDeliveryZone' })
  tcpAdminCreateDeliveryZone(@Payload() d: DtoPayload) {
    const { scope, ...body } = d ?? {};
    return this.admin.createDeliveryZone(body as Partial<GroceryDeliveryZone>, scope);
  }

  @MessagePattern({ cmd: 'admin.grocery.updateDeliveryZone' })
  tcpAdminUpdateDeliveryZone(@Payload() d: AdminIdMsg & DtoPayload & { scope?: string }) {
    const { id, scope, ...rest } = d ?? {};
    return this.admin.updateDeliveryZone(
      requireId(id, 'delivery zone'),
      rest as Partial<GroceryDeliveryZone>,
      scope,
    );
  }

  @MessagePattern({ cmd: 'admin.grocery.deleteDeliveryZone' })
  tcpAdminDeleteDeliveryZone(@Payload() d: AdminIdMsg & { scope?: string }) {
    return this.admin.deleteDeliveryZone(requireId(d.id, 'record'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.grocery.flashDeals' })
  tcpAdminFlashDeals(@Payload() d: FlashDealMsg & { regionCode?: string; scope?: string }) {
    return this.admin.listFlashDeals({ ...d, regionCode: d?.scope ?? d?.regionCode });
  }

  @MessagePattern({ cmd: 'admin.grocery.createFlashDeal' })
  tcpAdminCreateFlashDeal(@Payload() d: DtoPayload) {
    const { scope, ...dto } = d ?? {};
    return this.svc.createFlashDeal(dto as unknown as CreateFlashDealDto, undefined, scope);
  }

  @MessagePattern({ cmd: 'admin.grocery.reports' })
  tcpAdminReports(@Payload() d: { period?: string; scope?: string }) {
    return this.admin.getReports(d?.period, d?.scope);
  }

  @MessagePattern({ cmd: 'admin.grocery.settings' })
  tcpAdminSettings(@Payload() _d: EmptyMessage) {
    return this.admin.getSettings();
  }

  @MessagePattern({ cmd: 'admin.grocery.updateSettings' })
  tcpAdminUpdateSettings(@Payload() d: DtoPayload) {
    const { actorId, scope, ...rest } = d ?? {};
    return this.admin.updateSettings(rest, actorId, scope);
  }

  // ── Flash-deal listing (seller + admin, with filters) ──────────────────────
  // `get_store_flash_deals` returns only ACTIVE deals for a single store; the
  // gateway used it for the filtered list too, so `?status=pending` silently
  // returned active deals and the approval queue was never populated.
  @MessagePattern({ cmd: 'list_flash_deals' })
  msgListFlashDeals(@Payload() d: FlashDealMsg) {
    return this.admin.listFlashDeals(d ?? {});
  }

  // ── Flash-deal listing (customer storefront) ──────────────────────────────
  // Separate from the moderation queue above, which has no region filter: the
  // homepage was using it and so showed a Doha shopper the newest deals from
  // every market, or nothing at all when none of them were local.
  @MessagePattern({ cmd: 'get_active_flash_deals' })
  msgActiveFlashDeals(@Payload() d: { regionCode?: string; limit?: number }) {
    return this.svc.getActiveFlashDeals(d?.regionCode, d?.limit);
  }

  // ── Seller store resolution ───────────────────────────────────────────────
  // The seller portal had no way to learn which store it manages and hardcoded
  // `storeId = 'current-store'`, so every seller screen queried a store that does
  // not exist.
  @MessagePattern({ cmd: 'get_grocery_store_by_owner' })
  msgStoreByOwner(@Payload() d: { ownerId?: string }) {
    return this.svc.getStoreByOwner(requireId(d.ownerId, 'owner'));
  }

  /**
   * Ownership lookup for the gateway's GroceryStoreOwnershipGuard. Deliberately
   * returns only the owner id — the guard runs on every seller request and has no
   * business pulling a whole store row through TCP to read one column.
   */
  @MessagePattern({ cmd: 'get_grocery_store_owner' })
  msgStoreOwner(@Payload() d: StoreMsg) {
    return this.svc.getStoreOwner(requireId(d.storeId, 'store'));
  }
}
