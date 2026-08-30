import { Controller, Get, Post, Put, Delete, Param, Body, Query, Headers, ParseUUIDPipe, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@app/security';
import { SellerService } from './seller.service';
import { SellerOwnershipGuard } from './seller-ownership.guard';
import { Public } from './public.decorator';
import { RequestPayoutDto, ChangePasswordDto, RegisterSellerDto } from '../dto/seller.dto';

/**
 * Seller-facing HTTP API for the Marketplace module.
 *
 * SECURITY: every route here takes the seller id from the URL path, so both guards
 * are mandatory and are applied at the class level:
 *   • JwtAuthGuard         — authenticates the caller
 *   • SellerOwnershipGuard — authorises the caller against `sellers.owner_id`
 *
 * Only routes explicitly marked @Public() bypass them. Do not add a route here that
 * takes `:id` without leaving both guards in place.
 *
 * TCP message handlers live in seller.messages.controller.ts — they are a separate
 * class precisely so that HTTP guards cannot be silently skipped by an RPC caller,
 * and so that adding an HTTP route can never accidentally inherit RPC semantics.
 */
@Controller('sellers')
@UseGuards(JwtAuthGuard, SellerOwnershipGuard)
export class SellerController {
  constructor(private readonly svc: SellerService) {}

  // ── Public (pre-authentication) ──────────────────────────────────
  @Public() @Get('health') health() { return this.svc.healthCheck(); }

  /** Registration is pre-auth by nature, but the caller must still be a logged-in
   *  user so the new seller can be bound to them via `ownerId`.
   *
   *  `whitelist` is off here on purpose — see RegisterSellerDto. The app's global
   *  pipe sets it, and it would strip the onboarding wizard's alternate field
   *  spellings before SellerService could normalise them. */
  @Post('register')
  @UsePipes(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
  register(@Req() req: any, @Body() dto: RegisterSellerDto) {
    return this.svc.registerSeller(dto as Record<string, any>, req.user?.id ?? req.user?.userId ?? req.user?.sub);
  }

  @Get(':id/profile') getProfile(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN') { return this.svc.getSellerProfile(id, region); }
  @Put(':id/profile') updateProfile(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Body() dto: any) { return this.svc.updateSellerProfile(id, region, dto); }

  // ── Dashboard ────────────────────────────────────────────────────
  @Get(':id/dashboard') getDashboard(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Query('period') period?: 'today' | 'week' | 'month') { return this.svc.getSellerDashboard(id, region, period ?? 'today'); }

  // ── Products / Catalog ───────────────────────────────────────────
  @Get(':id/products') getProducts(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Query('status') status?: string, @Query('search') search?: string, @Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.getSellerProducts(id, region, status, search, +page, +limit); }
  @Get(':id/products/:productId') getProduct(@Param('id', ParseUUIDPipe) id: string, @Param('productId') pid: string) { return this.svc.getProductById(id, pid); }
  @Post(':id/products') addProduct(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Body() dto: any) { return this.svc.addProduct(id, region, dto); }
  @Post(':id/products/draft') saveDraft(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Body() dto: any) { return this.svc.saveDraft(id, region, dto); }
  @Put(':id/products/:productId') updateProduct(@Param('id', ParseUUIDPipe) id: string, @Param('productId') pid: string, @Body() dto: any) { return this.svc.updateProduct(id, pid, dto); }
  @Delete(':id/products/:productId') deleteProduct(@Param('id', ParseUUIDPipe) id: string, @Param('productId') pid: string) { return this.svc.deleteProduct(id, pid); }
  @Post(':id/products/bulk') bulkUpload(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Body() dto: any) { return this.svc.bulkUpload(id, region, dto.products); }

  // ── Inventory ────────────────────────────────────────────────────
  @Get(':id/inventory') getInventory(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Query('page') page = 1, @Query('limit') limit = 30) { return this.svc.getSellerInventory(id, region, +page, +limit); }
  @Put(':id/inventory/:productId') updateStock(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Param('productId') pid: string, @Body('stock') stock: number) { return this.svc.updateInventory(id, region, pid, +stock); }
  @Get(':id/inventory/low-stock') getLowStock(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN') { return this.svc.getLowStock(id, region); }
  @Put(':id/inventory/:productId/threshold') setThreshold(@Param('id', ParseUUIDPipe) id: string, @Param('productId') pid: string, @Body('threshold') threshold: number) { return this.svc.setLowStockThreshold(id, pid, +threshold); }

  // ── Orders ───────────────────────────────────────────────────────
  @Get(':id/orders') getOrders(@Param('id', ParseUUIDPipe) id: string, @Headers('x-region-code') region = 'IN', @Query('status') status?: string, @Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.getSellerOrders(id, region, status, +page, +limit); }
  @Get(':id/orders/:orderId') getOrder(@Param('id', ParseUUIDPipe) id: string, @Param('orderId') oid: string) { return this.svc.getOrderById(id, oid); }
  @Post(':id/orders/:orderId/accept') acceptOrder(@Param('id', ParseUUIDPipe) id: string, @Param('orderId') oid: string) { return this.svc.acceptOrder(id, oid); }
  @Post(':id/orders/:orderId/reject') rejectOrder(@Param('id', ParseUUIDPipe) id: string, @Param('orderId') oid: string, @Body('reason') reason: string) { return this.svc.rejectOrder(id, oid, reason); }
  @Post(':id/orders/:orderId/pack') markPacked(@Param('id', ParseUUIDPipe) id: string, @Param('orderId') oid: string) { return this.svc.markPacked(id, oid); }
  @Post(':id/orders/:orderId/ship') shipOrder(@Param('id', ParseUUIDPipe) id: string, @Param('orderId') oid: string, @Body() dto: any) { return this.svc.shipOrder(id, oid, dto); }

  // ── Returns & Refunds ────────────────────────────────────────────
  @Get(':id/returns') getReturns(@Param('id', ParseUUIDPipe) id: string, @Query('status') status?: string, @Query('page') page = 1) { return this.svc.getReturns(id, status, +page); }
  @Post(':id/returns/:returnId/accept') acceptReturn(@Param('id', ParseUUIDPipe) id: string, @Param('returnId') rid: string) { return this.svc.acceptReturn(id, rid); }
  @Post(':id/returns/:returnId/reject') rejectReturn(@Param('id', ParseUUIDPipe) id: string, @Param('returnId') rid: string, @Body('reason') reason: string) { return this.svc.rejectReturn(id, rid, reason); }
  @Get(':id/refunds') getRefunds(@Param('id', ParseUUIDPipe) id: string, @Query('status') status?: string, @Query('page') page = 1) { return this.svc.getRefunds(id, status, +page); }

  // ── Finance: Wallet ──────────────────────────────────────────────
  @Get(':id/wallet') getWallet(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getWallet(id); }
  @Get(':id/wallet/transactions') getWalletTransactions(@Param('id', ParseUUIDPipe) id: string, @Query('type') type?: string, @Query('page') page = 1) { return this.svc.getWalletTransactions(id, type, +page); }
  @Get(':id/payouts') getPayouts(@Param('id', ParseUUIDPipe) id: string, @Query('status') status?: string, @Query('page') page = 1) { return this.svc.getPayouts(id, status, +page); }
  @Post(':id/payouts') requestPayout(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RequestPayoutDto) { return this.svc.requestPayout(id, dto.amount, dto.bankAccountId); }
  @Get(':id/transactions') getTransactions(@Param('id', ParseUUIDPipe) id: string, @Query('type') type?: string, @Query('page') page = 1) { return this.svc.getWalletTransactions(id, type, +page); }
  @Get(':id/commissions') getCommissions(@Param('id', ParseUUIDPipe) id: string, @Query('page') page = 1) { return this.svc.getCommissionRate(id); }

  // ── Marketing ────────────────────────────────────────────────────
  @Get(':id/campaigns') getCampaigns(@Param('id', ParseUUIDPipe) id: string, @Query('status') status?: string, @Query('page') page = 1) { return this.svc.getCampaigns(id, status, +page); }
  @Post(':id/campaigns') createCampaign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.createCampaign(id, dto); }
  @Put(':id/campaigns/:cid') updateCampaign(@Param('id', ParseUUIDPipe) id: string, @Param('cid') cid: string, @Body() dto: any) { return this.svc.updateCampaign(id, cid, dto); }
  @Post(':id/campaigns/:cid/pause') pauseCampaign(@Param('id', ParseUUIDPipe) id: string, @Param('cid') cid: string) { return this.svc.pauseCampaign(id, cid); }
  @Post(':id/campaigns/:cid/resume') resumeCampaign(@Param('id', ParseUUIDPipe) id: string, @Param('cid') cid: string) { return this.svc.resumeCampaign(id, cid); }
  @Delete(':id/campaigns/:cid') deleteCampaign(@Param('id', ParseUUIDPipe) id: string, @Param('cid') cid: string) { return this.svc.deleteCampaign(id, cid); }
  @Get(':id/promotions') getPromotions(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getPromotions(id); }
  @Post(':id/promotions') createPromotion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.createPromotion(id, dto); }
  @Put(':id/promotions/:promoId') updatePromotion(@Param('id', ParseUUIDPipe) id: string, @Param('promoId') pid: string, @Body() dto: any) { return this.svc.updatePromotion(id, pid, dto); }
  @Delete(':id/promotions/:promoId') deletePromotion(@Param('id', ParseUUIDPipe) id: string, @Param('promoId') pid: string) { return this.svc.deletePromotion(id, pid); }
  @Get(':id/sponsored') getSponsored(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getSponsored(id); }
  @Post(':id/sponsored') sponsorProduct(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.sponsorProduct(id, dto); }
  @Post(':id/sponsored/:sid/pause') pauseSponsored(@Param('id', ParseUUIDPipe) id: string, @Param('sid') sid: string) { return this.svc.pauseSponsored(id, sid); }
  @Post(':id/sponsored/:sid/resume') resumeSponsored(@Param('id', ParseUUIDPipe) id: string, @Param('sid') sid: string) { return this.svc.resumeSponsored(id, sid); }
  @Get(':id/brand') getBrand(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getBrand(id); }
  @Put(':id/brand') updateBrand(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.updateBrand(id, dto); }

  // ── Store ────────────────────────────────────────────────────────
  @Get(':id/storefront') getStorefront(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getStorefront(id); }
  @Put(':id/storefront') updateStorefront(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.updateStorefront(id, dto); }
  @Get(':id/reviews') getReviews(@Param('id', ParseUUIDPipe) id: string, @Query('page') page = 1) { return this.svc.getReviews(id, +page); }
  @Post(':id/reviews/:rid/reply') replyReview(@Param('id', ParseUUIDPipe) id: string, @Param('rid') rid: string, @Body('reply') reply: string) { return this.svc.replyReview(id, rid, reply); }

  // ── Analytics & Account ──────────────────────────────────────────
  @Get(':id/reports') getReports(@Param('id', ParseUUIDPipe) id: string, @Query('type') type?: string) { return this.svc.getReports(id, type); }
  @Get(':id/reports/export') exportReport(@Param('id', ParseUUIDPipe) id: string, @Query('type') type?: string) { return this.svc.exportReport(id, type); }
  @Get(':id/notifications') getNotifications(@Param('id', ParseUUIDPipe) id: string, @Query('type') type?: string, @Query('page') page = 1) { return this.svc.getNotifications(id, type, +page); }
  @Post(':id/notifications/:nid/read') markNotifRead(@Param('id', ParseUUIDPipe) id: string, @Param('nid') nid: string) { return this.svc.markNotifRead(id, nid); }
  @Post(':id/notifications/read-all') markAllRead(@Param('id', ParseUUIDPipe) id: string) { return this.svc.markAllNotifRead(id); }
  @Get(':id/staff') getStaff(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getStaff(id); }
  @Post(':id/staff') addStaff(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.addStaff(id, dto); }
  @Put(':id/staff/:sid') updateStaff(@Param('id', ParseUUIDPipe) id: string, @Param('sid') sid: string, @Body() dto: any) { return this.svc.updateStaff(id, sid, dto); }
  @Delete(':id/staff/:sid') removeStaff(@Param('id', ParseUUIDPipe) id: string, @Param('sid') sid: string) { return this.svc.removeStaff(id, sid); }
  @Get(':id/settings') getSettings(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getSettings(id); }
  @Put(':id/settings') updateSettings(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.updateSettings(id, dto); }
  @Post(':id/settings/change-password') changePassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangePasswordDto) { return this.svc.changePassword(id, dto); }
  @Get(':id/support') getSupport(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getSupport(id); }
  @Post(':id/support') createTicket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.svc.createTicket(id, dto); }
  @Post(':id/support/:tid/reply') replyTicket(@Param('id', ParseUUIDPipe) id: string, @Param('tid') tid: string, @Body('message') message: string) { return this.svc.replyTicket(id, tid, message); }
}
