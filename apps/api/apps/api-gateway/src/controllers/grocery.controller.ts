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
  Req,
  Inject,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCatch, UserRole } from '@app/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard, ResourceOwnershipGuard, ResourceOwner } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { requestRegion, type RequestWithRegion } from '../services/request-region';
import { Public } from '../decorators/public.decorator';
import { GroceryStoreOwnershipGuard } from '../guards/grocery-store-ownership.guard';
import { refuseLockedAdmin, resolveScope } from '../guards/market-scope';

/**
 * Grocery Controller — API Gateway Proxy
 *
 * Forwards grocery requests to grocery-service over TCP.
 *
 * ── Authorisation ─────────────────────────────────────────────────────────────
 * Every route on this controller used to be anonymous. Only
 * `orders/customer/:customerId` carried a guard, which meant an unauthenticated
 * caller could create, edit and delete any store's products, bulk-import a
 * catalogue, export it as CSV, change any order's status, and approve or reject
 * flash deals — an admin action. The whole controller is now behind
 * `JwtAuthGuard`, with three tiers layered on top:
 *
 *   • `@Public()`         — the storefront: browsing stores, categories, products,
 *                           search and reviews. Readable without an account.
 *   • store-owner routes  — anything under `stores/:storeId/*` that writes, plus
 *                           the seller's own reads, gated by
 *                           `GroceryStoreOwnershipGuard` on `grocery_stores.ownerId`.
 *   • `@Roles(ADMIN…)`    — flash-deal approval and rejection.
 *
 * Customer-scoped routes (wishlist, orders, reorder) take the caller's id from the
 * token and refuse a mismatched path parameter, so one customer cannot read
 * another's basket by editing the URL.
 */
@ApiTags('🥬 Grocery')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('grocery')
export class GroceryController {
  private readonly logger = new Logger(GroceryController.name);

  constructor(@Inject('GROCERY_SERVICE') private readonly groceryClient: ClientProxy) {}

  /**
   * Forward to grocery-service, preserving the failure.
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
        this.groceryClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Grocery service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`grocery-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Grocery service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** The caller's own user id, from the verified token — never from the body. */
  /**
   * The caller, when there is one.
   *
   * `callerId` throws for an unidentified user, which is right on routes that
   * require one. `@Public()` routes are different: JwtAuthGuard does not run, so
   * `req.user` is unset even when the request carried a perfectly good token.
   * Using `callerId` there turned the public catalogue into a 403.
   */
  private optionalCaller(req: any): { id?: string; role?: string } {
    const id = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    return { id: id ? String(id) : undefined, role: req?.user?.role };
  }

  /** The administrator performing a moderation decision, for the audit trail. */
  private actor(req: any): { actorId: string; actorRole?: string; actorIp?: string } {
    return {
      actorId: this.callerId(req),
      actorRole: req?.user?.role,
      actorIp:
        (req?.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim() ||
        req?.ip ||
        req?.socket?.remoteAddress,
    };
  }

  private callerId(req: any): string {
    const id = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!id) throw new ForbiddenException('Could not identify the signed-in user.');
    return String(id);
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  /**
   * Confirms a customer-scoped path parameter belongs to the caller.
   *
   * Wishlist and reorder took `customerId` from the URL and forwarded it, so any
   * signed-in user could read or empty anyone else's wishlist by changing one path
   * segment. Admins are allowed through for support work.
   */
  private assertSelf(req: any, customerId: string): string {
    const role = String(req?.user?.role ?? '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return customerId;
    const id = this.callerId(req);
    if (id !== customerId)
      throw new ForbiddenException('You can only access your own grocery data.');
    return id;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC STOREFRONT
  // ══════════════════════════════════════════════════════════════════════════

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Grocery service health check' })
  getHealth() {
    return { status: 'ok', service: 'grocery', timestamp: new Date().toISOString() };
  }

  // ── Categories ───────────────────────────────────────────────────────────

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List all active grocery categories' })
  @ApiQuery({
    name: 'stockedOnly',
    required: false,
    description: 'Return only categories some open shop in this market stocks',
  })
  getCategories(@Req() req: RequestWithRegion, @Query('stockedOnly') stockedOnly?: string) {
    // Storefronts pass stockedOnly=true so every category tile leads somewhere;
    // admin tooling omits it and gets the full list.
    return this.send('get_grocery_categories', {
      regionCode: requestRegion(req),
      stockedOnly: stockedOnly === 'true',
    });
  }

  /**
   * Declared before `categories/:id` on purpose — Nest matches in declaration
   * order, so the parameterised route would otherwise capture the literal
   * `tree` and look up a category by that id (which returned null).
   */
  @Get('categories/tree')
  @Public()
  @ApiOperation({ summary: 'Catalogue as department → category → sub-category' })
  categoryTree(@Req() req: any) {
    // Scoped to the caller's market, so a UK seller is never offered a category
    // that is only listed in the Gulf or India.
    return this.send('get_grocery_category_tree', { regionCode: requestRegion(req) });
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Get a single category with subcategories' })
  @ApiParam({ name: 'id', example: 'fruits-vegetables' })
  getCategoryById(@Param('id') id: string) {
    return this.send('get_grocery_category', { id });
  }

  /**
   * The grocery category tree is one taxonomy for the whole platform — the same
   * rule marketplace's taxonomy follows. A region-locked admin is refused
   * rather than silently editing every market's catalogue, which is what these
   * three routes did: they took no market and sent no `scope` (audit X-12).
   */
  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: create a new grocery category' })
  createCategory(@Req() req: any, @Body() data: any) {
    refuseLockedAdmin(req, 'grocery taxonomy', 'The grocery category tree is managed globally.');
    return this.send('create_grocery_category', data);
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: update a grocery category' })
  @ApiParam({ name: 'id', example: 'fruits-vegetables' })
  updateCategory(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    refuseLockedAdmin(req, 'grocery taxonomy', 'The grocery category tree is managed globally.');
    return this.send('update_grocery_category', { id, ...data });
  }

  @Delete('categories/cache')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: invalidate the category cache' })
  invalidateCategoryCache(@Req() req: any) {
    refuseLockedAdmin(req, 'grocery taxonomy', 'The grocery category tree is managed globally.');
    return this.send('invalidate_grocery_cache', {});
  }

  // ── Stores ────────────────────────────────────────────────────────────────

  @Get('stores')
  @Public()
  @ApiOperation({ summary: 'List nearby grocery stores' })
  // The examples were Nairobi's coordinates, left over from an earlier market.
  @ApiQuery({ name: 'lat', required: false, example: 25.2854 })
  @ApiQuery({ name: 'lng', required: false, example: 51.531 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Only stores stocking this category or subcategory',
  })
  getStores(
    @Req() req: RequestWithRegion,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('category') category?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_grocery_stores', {
      lat: lat ? +lat : undefined,
      lng: lng ? +lng : undefined,
      // Sent unconditionally. The service can only apply its radius filter when
      // coordinates arrive, so without this a shopper who declines the location
      // prompt is offered every store on the platform regardless of country.
      regionCode: requestRegion(req),
      category: category || undefined,
      page,
      limit,
    });
  }

  /**
   * The signed-in seller's own store.
   *
   * Declared before `stores/:storeId` — Nest matches in declaration order, so a
   * literal segment placed after a parameterised one is captured by it and never
   * reached. `/grocery/stores/mine` would otherwise be a store lookup for the id
   * "mine".
   */
  /**
   * Brands with something on sale, for the storefront's "Shop by Brand" row.
   *
   * Derived from the catalogue rather than a curated list: the homepage row was
   * a hardcoded regional set that shared no entries with `grocery_items.brand`,
   * so every brand avatar led to an empty result.
   */
  @Get('brands')
  @Public()
  @ApiOperation({ summary: 'Brands that have products, with counts' })
  @ApiQuery({ name: 'limit', required: false })
  getBrands(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(40), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_grocery_brands', { regionCode: requestRegion(req), limit });
  }

  /**
   * A brand's catalogue. Declared before `brands/:slug`-shaped params would be
   * captured — and before any `:param` route on this controller.
   */
  @Get('brands/:slug/products')
  @Public()
  @ApiOperation({ summary: 'Every product sold under one brand' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getProductsByBrand(
    @Param('slug') slug: string,
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_grocery_products_by_brand', {
      brand: slug,
      regionCode: requestRegion(req),
      page,
      limit,
    });
  }

  /** Platform-wide catalogue maintenance: it rewrites every market's tree. */
  @Post('admin/catalog/rebuild-tree')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: rebuild the catalogue tree (idempotent)' })
  rebuildCatalogTree(@Req() req: any) {
    refuseLockedAdmin(req, 'grocery catalogue maintenance');
    return this.send('rebuild_grocery_catalog_tree', {});
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BRANDS — sellers request, moderators approve
  //
  // `brand` was a free-text column: 11 spellings across 224 listings, 70 of
  // them empty, and nothing stopping a seller listing under any name at all.
  // ══════════════════════════════════════════════════════════════════════════

  @Get('brands/catalog')
  @ApiOperation({ summary: 'Brands a seller may list under' })
  listBrands(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.send('list_grocery_brands', { status, page, limit });
  }

  @Post('brands/request')
  @ApiOperation({ summary: 'Seller: request a brand for approval' })
  requestBrand(@Req() req: any, @Body() dto: any) {
    // The requester is the caller, never the body — the same rule the review
    // author follows.
    return this.send('request_grocery_brand', { ...dto, sellerId: this.callerId(req) });
  }

  @Patch('admin/brands/:brandId/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: approve a brand request' })
  approveBrand(@Req() req: any, @Param('brandId', ParseUUIDPipe) brandId: string) {
    const { scope } = this.scopeOf(req, undefined, 'that brand request');
    return this.send('set_grocery_brand_approval', { brandId, status: 'APPROVED', scope });
  }

  @Patch('admin/brands/:brandId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: reject a brand request, with a reason' })
  rejectBrand(
    @Req() req: any,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: { reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that brand request');
    return this.send('set_grocery_brand_approval', {
      brandId,
      status: 'REJECTED',
      reason: dto?.reason,
      scope,
    });
  }

  /** Platform-wide catalogue maintenance: it walks every market's listings. */
  @Post('admin/catalog/backfill-entities')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({
    summary: 'Admin: promote brand strings and weight variants into rows (idempotent)',
  })
  backfillCatalogEntities(@Req() req: any) {
    refuseLockedAdmin(req, 'grocery catalogue maintenance');
    return this.send('backfill_grocery_catalog_entities', {});
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTORY — stock as a ledger, not a number in a blob
  //
  // Every route here is behind `GroceryStoreOwnershipGuard`: stock is the
  // seller's own operational data, and moving it is a write.
  // ══════════════════════════════════════════════════════════════════════════

  @Get('stores/:storeId/inventory/low-stock')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Variants at or below their low-stock threshold' })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Overrides each variant’s own threshold',
  })
  lowStockVariants(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('threshold') threshold?: number,
  ) {
    return this.send('get_grocery_low_stock_variants', {
      storeId,
      threshold: threshold === undefined ? undefined : Number(threshold),
    });
  }

  @Post('stores/:storeId/inventory/movements')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Receive, adjust or return stock against a variant' })
  recordStockMovement(
    @Req() req: any,
    @Param('storeId', ParseUUIDPipe) _storeId: string,
    @Body() dto: any,
  ) {
    // The actor is the caller, never the body — this is an audit trail.
    return this.send('record_grocery_stock_movement', { ...dto, actorId: this.callerId(req) });
  }

  @Post('stores/:storeId/inventory/write-off')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Write off damaged or expired stock' })
  writeOffStock(
    @Req() req: any,
    @Param('storeId', ParseUUIDPipe) _storeId: string,
    @Body() dto: any,
  ) {
    return this.send('write_off_grocery_stock', { ...dto, actorId: this.callerId(req) });
  }

  @Get('stores/:storeId/inventory/variants/:variantId/history')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Movement history for one variant — the batch trail' })
  stockHistory(
    @Param('storeId', ParseUUIDPipe) _storeId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.send('get_grocery_stock_history', { variantId, page, limit });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WAREHOUSES — multiple stock locations per store
  // ══════════════════════════════════════════════════════════════════════════

  @Get('stores/:storeId/warehouses')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Locations this store holds stock in' })
  listWarehouses(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.send('list_grocery_warehouses', {
      storeId,
      includeInactive: includeInactive === 'true',
    });
  }

  @Post('stores/:storeId/warehouses')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Add a warehouse or dark store' })
  createWarehouse(@Param('storeId', ParseUUIDPipe) storeId: string, @Body() dto: any) {
    return this.send('create_grocery_warehouse', { ...dto, storeId });
  }

  @Post('stores/:storeId/warehouses/transfer')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Move stock between two of this store’s locations' })
  transferStock(
    @Req() req: any,
    @Param('storeId', ParseUUIDPipe) _storeId: string,
    @Body() dto: any,
  ) {
    return this.send('transfer_grocery_stock', { ...dto, actorId: this.callerId(req) });
  }

  @Get('stores/:storeId/inventory/variants/:variantId/locations')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Where a variant’s stock actually is' })
  variantStockLocations(
    @Param('storeId', ParseUUIDPipe) _storeId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.send('get_grocery_variant_stock_locations', { variantId });
  }

  @Post('stores/:storeId/warehouses/:warehouseId/audit')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Reconcile a location against a physical count' })
  auditWarehouse(
    @Req() req: any,
    @Param('storeId', ParseUUIDPipe) _storeId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: any,
  ) {
    return this.send('audit_grocery_warehouse_stock', {
      ...dto,
      warehouseId,
      actorId: this.callerId(req),
    });
  }

  /** Platform-wide catalogue maintenance: it seats every market's stores. */
  @Post('admin/catalog/backfill-warehouses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({
    summary: 'Admin: give every store a default location and seat existing balances',
  })
  backfillWarehouses(@Req() req: any) {
    refuseLockedAdmin(req, 'grocery catalogue maintenance');
    return this.send('backfill_grocery_warehouses', {});
  }

  @Get('stores/mine')
  @ApiOperation({ summary: 'Seller: resolve the store owned by the signed-in account' })
  getMyStore(@Req() req: any) {
    return this.send('get_grocery_store_by_owner', { ownerId: this.callerId(req) });
  }

  @Get('stores/:storeId')
  @Public()
  @ApiOperation({ summary: 'Get a single grocery store' })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  getStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.send('get_grocery_store', { id: storeId });
  }

  @Get('stores/:storeId/categories')
  @Public()
  @ApiOperation({ summary: 'List categories for a store' })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  getStoreCategories(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.send('get_store_categories', { storeId });
  }

  // ── Products ──────────────────────────────────────────────────────────────

  @Get('stores/:storeId/products')
  @Public()
  @ApiOperation({ summary: 'List products for a store' })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  @ApiQuery({ name: 'category', required: false, example: 'fruits-vegetables' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  getProducts(
    @Req() req: any,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('category') category?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    // Public route, so there may be no caller at all. When there is one, the
    // service uses it to decide whether this is the store's owner looking at
    // their own moderation queue or a shopper browsing the catalogue.
    const actor = this.optionalCaller(req);
    return this.send('get_grocery_products', {
      storeId,
      category,
      page,
      limit,
      actorId: actor.id,
      actorRole: actor.role,
    });
  }

  /**
   * CSV export.
   *
   * MUST stay above `stores/:storeId/products/:productId`. It used to be declared
   * 170 lines below it, so `/products/export` bound `productId = 'export'` and
   * returned a 404 product lookup — the export button never once produced a file.
   */
  @Get('stores/:storeId/products/export')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: export products as CSV' })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  exportProducts(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.send('export_grocery_products', { storeId });
  }

  @Get('stores/:storeId/products/:productId')
  @Public()
  @ApiOperation({ summary: 'Get a single product with weight variants' })
  @ApiParam({ name: 'storeId', example: 'store-uuid' })
  @ApiParam({ name: 'productId', example: 'product-uuid' })
  getProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.send('get_grocery_product', { storeId, productId });
  }

  @Get('stores/:storeId/products/:productId/translated')
  @Public()
  @ApiOperation({ summary: 'Get product with translations applied' })
  @ApiQuery({ name: 'locale', required: true, example: 'hi' })
  getTranslatedProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('locale') locale: string,
  ) {
    return this.send('get_product_translated', { storeId, productId, locale });
  }

  /**
   * Catalogue-wide product listing, optionally filtered by category.
   *
   * `/grocery/category/[slug]` had no endpoint to call: the only product listing
   * was scoped to one store, so the page ran a full-text search for the category
   * slug with the hyphens replaced by spaces ("fruits vegetables") and read the
   * result off `res.data`, a key that response does not have. It matched by
   * accident where a product name happened to contain the words, and returned
   * nothing otherwise.
   */
  @Get('products')
  @Public()
  @ApiOperation({ summary: 'List products across all stores, optionally by category' })
  @ApiQuery({ name: 'category', required: false, example: 'fruits-vegetables' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  listProducts(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('storeId') storeId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    // Without the region this answered with the whole platform's catalogue, so a
    // Doha shopper browsing a category saw products from shops in four countries.
    return this.send('get_grocery_products', {
      storeId,
      category,
      page,
      limit,
      regionCode: requestRegion(req),
    });
  }

  /**
   * Store-agnostic product lookup, for `/grocery/product/[id]`.
   *
   * That page is reached from search, the wishlist, order history and shared
   * links, none of which carry a store id.
   */
  @Get('products/:productId')
  @Public()
  @ApiOperation({ summary: 'Get a product by id, without knowing its store' })
  @ApiParam({ name: 'productId', example: 'product-uuid' })
  getProductAnyStore(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.send('get_grocery_product_any_store', { productId });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search grocery products across stores' })
  @ApiQuery({ name: 'q', required: true, example: 'avocado' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  search(
    @Query('q') q: string,
    @Query('storeId') storeId?: string,
    // `categoryId` was accepted by the service and never forwarded, so the
    // category-filtered search on the storefront searched the whole catalogue.
    @Query('categoryId') categoryId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.send('search_grocery_products', { query: q, storeId, categoryId, page, limit });
  }

  // ── Product Reviews ────────────────────────────────────────────────────────

  @Get('stores/:storeId/products/:productId/reviews')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a product' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getProductReviews(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    // Pagination was dropped here, so the reviews list was permanently pinned to
    // the first 20 and its "load more" did nothing.
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_product_reviews', { storeId, productId, page, limit });
  }

  @Post('stores/:storeId/products/:productId/reviews')
  @ApiOperation({ summary: 'Submit a product review' })
  submitReview(
    @Req() req: any,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: any,
  ) {
    // The reviewer is the caller. Taking `customerId` from the body let anyone post
    // a review under someone else's identity — including a "verified purchase" one.
    return this.send('submit_grocery_review', {
      ...dto,
      storeId,
      productId,
      customerId: this.callerId(req),
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SELLER — requires ownership of :storeId
  // ══════════════════════════════════════════════════════════════════════════

  @Post('stores/:storeId/products')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: create a new product' })
  createProduct(@Param('storeId', ParseUUIDPipe) storeId: string, @Body() data: any) {
    return this.send('create_grocery_product', { ...data, storeId });
  }

  @Post('stores/:storeId/products/bulk')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: bulk import products' })
  bulkImportProducts(@Param('storeId', ParseUUIDPipe) storeId: string, @Body() body: any) {
    return this.send('bulk_import_grocery_products', { storeId, products: body?.products ?? [] });
  }

  @Put('stores/:storeId/products/:productId')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: update a product' })
  updateProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() data: any,
  ) {
    return this.send('update_grocery_product', { ...data, storeId, productId });
  }

  @Delete('stores/:storeId/products/:productId')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: delete a product' })
  deleteProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.send('delete_grocery_product', { storeId, productId });
  }

  @Patch('stores/:storeId/products/:productId/translations')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Update product translation for a locale' })
  updateTranslation(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: any,
  ) {
    return this.send('update_product_translation', { ...dto, storeId, productId });
  }

  @Patch('stores/:storeId/products/:productId/promote')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: toggle product promotion' })
  togglePromotion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: any,
  ) {
    return this.send('toggle_grocery_promotion', {
      storeId,
      productId,
      promoted: !!body?.promoted,
    });
  }

  @Get('stores/:storeId/analytics')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: get store analytics' })
  @ApiQuery({ name: 'period', required: false, example: '7d' })
  getStoreAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('period') period?: string,
  ) {
    return this.send('get_grocery_store_analytics', { storeId, period });
  }

  @Patch('stores/:storeId/settings')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: update store settings' })
  updateStoreSettings(@Param('storeId', ParseUUIDPipe) storeId: string, @Body() settings: any) {
    return this.send('update_grocery_store_settings', { ...settings, storeId });
  }

  @Get('stores/:storeId/promotions')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: list promoted products' })
  getStorePromotions(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.send('get_grocery_store_promotions', { storeId });
  }

  @Get('stores/:storeId/low-stock')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Seller: get low-stock items' })
  @ApiQuery({ name: 'threshold', required: false, example: 10 })
  getLowStock(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.send('get_grocery_low_stock', { storeId, threshold: threshold ? +threshold : 10 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ORDERS
  // ══════════════════════════════════════════════════════════════════════════

  @Post('orders')
  @ApiOperation({ summary: 'Place a new grocery order' })
  createOrder(@Req() req: any, @Body() dto: any) {
    // The order belongs to the caller. `customerId` used to come from the request
    // body, so an order could be placed — and charged — against another account.
    return this.send('create_grocery_order', { ...dto, customerId: this.callerId(req) });
  }

  @Get('orders/customer/:customerId')
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'customerId' })
  @ApiOperation({ summary: 'Get order history for a customer' })
  getCustomerOrders(
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_customer_grocery_orders', { customerId, page, limit });
  }

  @Get('orders/store/:storeId')
  @UseGuards(GroceryStoreOwnershipGuard)
  @ApiOperation({ summary: 'Get orders for a store (seller view)' })
  getStoreOrders(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_store_grocery_orders', { storeId, status, page, limit });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiParam({ name: 'id', example: 'order-uuid' })
  /* `ParseUUIDPipe` so a malformed id is refused as a 400 here rather than
     reaching Postgres and coming back as a 500 quoting
     `invalid input syntax for type uuid`. A 500 tells a caller the server broke
     when in fact their input was wrong, and it leaks the column type. */
  getOrder(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.send('get_grocery_order', {
      orderId: id,
      requesterId: this.callerId(req),
      requesterRole: req?.user?.role,
    });
  }

  @Get('orders/:id/tracking')
  @ApiOperation({ summary: 'Get order tracking status' })
  getOrderTracking(@Req() req: any, @Param('id') id: string) {
    return this.send('get_grocery_order_tracking', {
      orderId: id,
      requesterId: this.callerId(req),
      requesterRole: req?.user?.role,
    });
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update order status (seller/admin)' })
  updateOrderStatus(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.send('update_grocery_order_status', {
      ...dto,
      orderId: id,
      actorId: this.callerId(req),
      actorRole: req?.user?.role,
    });
  }

  @Post('orders/:id/reorder')
  @ApiOperation({ summary: 'Reorder: clone items from a past order' })
  reorder(@Req() req: any, @Param('id') id: string) {
    return this.send('reorder_grocery', { orderId: id, customerId: this.callerId(req) });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LISTING MODERATION — super-admin only
  //
  // Grocery had no approval step: a seller's new product was returned by the
  // store listing and by public search the moment it was created. Marketplace
  // already gated its catalogue this way; this is the grocery equivalent.
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/products/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: listings awaiting approval' })
  @ApiQuery({
    name: 'regionCode',
    required: false,
    description: 'Market to review (global admins)',
  })
  pendingProducts(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
    @Query('storeId') storeId?: string,
    @Query('regionCode') regionCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, regionCode, 'those listings');
    return this.send('get_grocery_pending_products', {
      page,
      limit,
      storeId,
      regionCode: market,
      scope,
    });
  }

  @Patch('admin/products/:productId/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: approve a listing so customers can see it' })
  approveProduct(@Req() req: any, @Param('productId', ParseUUIDPipe) productId: string) {
    // The acting admin travels with the decision. Without it the service could
    // record that a listing was approved but not by whom, which is the one fact
    // an approval audit exists to answer.
    const { scope } = this.scopeOf(req, undefined, 'that listing');
    return this.send('set_grocery_product_approval', {
      productId,
      status: 'APPROVED',
      ...this.actor(req),
      scope,
    });
  }

  @Patch('admin/products/:productId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: reject a listing, with a reason for the seller' })
  rejectProduct(
    @Req() req: any,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: { reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that listing');
    return this.send('set_grocery_product_approval', {
      productId,
      status: 'REJECTED',
      reason: dto?.reason,
      ...this.actor(req),
      scope,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WISHLIST — always scoped to the caller
  // ══════════════════════════════════════════════════════════════════════════

  @Post('wishlist')
  @ApiOperation({ summary: 'Add product to wishlist' })
  addToWishlist(@Req() req: any, @Body() dto: any) {
    return this.send('add_to_grocery_wishlist', { ...dto, customerId: this.callerId(req) });
  }

  @Get('wishlist/:customerId')
  @ApiOperation({ summary: 'Get customer wishlist' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getWishlist(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_grocery_wishlist', {
      customerId: this.assertSelf(req, customerId),
      page,
      limit,
    });
  }

  @Delete('wishlist/:customerId/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  removeFromWishlist(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.send('remove_from_grocery_wishlist', {
      customerId: this.assertSelf(req, customerId),
      productId,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FLASH DEALS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Filtered list for the seller portal and the admin moderation queue.
   *
   * This used to forward to `get_store_flash_deals`, which returns only ACTIVE
   * deals for a single store and ignores `status` entirely — so `?status=pending`
   * returned running deals, the admin approval queue was permanently empty, and no
   * deal submitted by a seller could ever be approved.
   */
  @Get('flash-deals')
  @ApiOperation({ summary: 'List flash deals (admin/seller)' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  getFlashDeals(
    @Query('storeId') storeId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.send('list_flash_deals', { storeId, status, page, limit });
  }

  /**
   * The storefront's Flash Deals rail: live deals across this market's shops.
   *
   * Declared before `flash-deals/store/:storeId` so the literal segment is not
   * captured as a `:storeId`. Distinct from `GET flash-deals` above, which is the
   * moderation queue — that one has no region filter, and pointing the homepage
   * at it meant a Doha shopper got page one of the platform's deals, then an
   * empty section whenever none of them belonged to a Qatari store.
   */
  @Get('flash-deals/active')
  @Public()
  @ApiOperation({ summary: 'Live flash deals in the caller’s market' })
  @ApiQuery({ name: 'limit', required: false })
  getActiveFlashDeals(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(40), ParseIntPipe) limit?: number,
  ) {
    return this.send('get_active_flash_deals', { regionCode: requestRegion(req), limit });
  }

  @Get('flash-deals/store/:storeId')
  @Public()
  @ApiOperation({ summary: 'Get active flash deals for a store (customer-facing)' })
  getStoreFlashDeals(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.send('get_store_flash_deals', { storeId });
  }

  @Post('flash-deals')
  @ApiOperation({ summary: 'Seller: create a flash deal' })
  createFlashDeal(@Req() req: any, @Body() dto: any) {
    // The caller travels with the payload: `storeId` comes from the body, so
    // the service has to be able to check who is asking.
    return this.send('create_flash_deal', {
      ...dto,
      actorId: this.callerId(req),
      actorRole: req?.user?.role,
    });
  }

  @Patch('flash-deals/:id/submit')
  @ApiOperation({ summary: 'Seller: submit flash deal for approval' })
  submitFlashDeal(@Req() req: any, @Param('id') id: string) {
    return this.send('submit_flash_deal', {
      dealId: id,
      actorId: this.callerId(req),
      actorRole: req?.user?.role,
    });
  }

  @Patch('flash-deals/:id/pause')
  @ApiOperation({ summary: 'Pause an active flash deal' })
  pauseFlashDeal(@Req() req: any, @Param('id') id: string) {
    return this.send('pause_flash_deal', {
      dealId: id,
      actorId: this.callerId(req),
      actorRole: req?.user?.role,
    });
  }

  @Patch('flash-deals/:id/resume')
  @ApiOperation({ summary: 'Resume a paused flash deal' })
  resumeFlashDeal(@Req() req: any, @Param('id') id: string) {
    return this.send('resume_flash_deal', {
      dealId: id,
      actorId: this.callerId(req),
      actorRole: req?.user?.role,
    });
  }

  // Approval and rejection are moderation decisions, not seller actions — these two
  // were reachable by anyone at all.
  @Patch('flash-deals/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: approve a flash deal' })
  approveFlashDeal(@Req() req: any, @Param('id') id: string) {
    // grocery-service has asserted the deal's own market since R2; it was never
    // sent one, so the assertion was a no-op on every call.
    const { scope } = this.scopeOf(req, undefined, 'that flash deal');
    return this.send('approve_flash_deal', {
      dealId: id,
      approvedBy: this.callerId(req),
      scope,
    });
  }

  @Patch('flash-deals/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')
  @ApiOperation({ summary: 'Admin: reject a flash deal' })
  rejectFlashDeal(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'that flash deal');
    return this.send('reject_flash_deal', { dealId: id, ...dto, scope });
  }
}
