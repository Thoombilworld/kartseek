import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommissionService, type CommissionRecord, type CategoryRate, type CommissionRate, type SellerOverride } from './commission.service';
import { RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('commission')
export class CommissionController {
  constructor(private readonly svc: CommissionService) {}

  @Get('health')
  health() { return this.svc.healthCheck(); }

  // ── Commission Calculation ────────────────────────────────────────────────
  @Post('calculate')
  calculate(@Body() dto: {
    orderId: string; sellerId: string; orderTotal: number;
    serviceType: string; category?: string; subCategory?: string;
  }) {
    return this.svc.calculateCommission(
      dto.orderId, dto.sellerId, dto.orderTotal,
      dto.serviceType, dto.category, dto.subCategory,
    );
  }

  // ── Query Endpoints ───────────────────────────────────────────────────────
  @Get('orders/:orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.svc.getCommissionByOrder(orderId);
  }

  @Get('sellers/:sellerId')
  getBySeller(
    @Param('sellerId') sid: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.getSellerCommissions(sid, +page, +limit);
  }

  @Get('totals')
  getTotals(
    @Query('startDate') start: string,
    @Query('endDate') end: string,
    @Query('serviceType') serviceType?: string,
  ) {
    return this.svc.getTotalCommission(start, end, serviceType);
  }

  // ── Platform Revenue Summary (Admin Dashboard) ────────────────────────────
  @Get('revenue/summary')
  getRevenueSummary() {
    return this.svc.getPlatformRevenueSummary();
  }

  // ── Category Rate Card ────────────────────────────────────────────────────
  @Get('rates/categories')
  getCategoryRates() {
    return this.svc.getCategoryRateCard();
  }

  @Put('rates/categories')
  updateCategoryRate(@Body() dto: {
    category: string; subCategory?: string;
    referralRate?: number; closingFee?: number;
    closingFeeThreshold?: number; minCommission?: number;
  }) {
    return this.svc.updateCategoryRate(dto.category, dto.subCategory, dto);
  }

  // ── Module-Level Rates ────────────────────────────────────────────────────
  @Get('rates')
  getRates() { return this.svc.getCommissionRates(); }

  @Put('rates/:serviceType')
  updateRate(
    @Param('serviceType') svc: string,
    @Body() dto: { baseRate?: number; tierRates?: { minOrders: number; rate: number }[] },
  ) {
    return this.svc.updateCommissionRate(svc, dto);
  }

  // ── Seller-Specific Overrides ─────────────────────────────────────────────
  @Get('overrides/:sellerId/:serviceType')
  getOverride(
    @Param('sellerId') sid: string,
    @Param('serviceType') svc: string,
  ) {
    return this.svc.getSellerOverride(sid, svc);
  }

  @Post('overrides')
  setOverride(@Body() dto: {
    sellerId: string; serviceType: string;
    rate: number; reason: string; expiresAt?: string;
  }) {
    return this.svc.setSellerOverride(dto.sellerId, dto.serviceType, dto.rate, dto.reason, dto.expiresAt);
  }

  @Delete('overrides/:sellerId/:serviceType')
  removeOverride(
    @Param('sellerId') sid: string,
    @Param('serviceType') svc: string,
  ) {
    return this.svc.removeSellerOverride(sid, svc);
  }

  // ── TCP handlers (the gateway can only reach this service over TCP) ───────
  //
  // `calculate_commission` was the only one, and nothing in the monorepo called
  // even that — so this entire service was unreachable dead code: no commission
  // was ever calculated on any order, the platform never took its cut, and the
  // seller's Commissions page and the admin's commission report both had nothing
  // to read because neither was pointed here in the first place.
  @MessagePattern({ cmd: 'calculate_commission' })
  msgCalc(@Payload() d: any) {
    return this.svc.calculateCommission(
      d.orderId, d.sellerId, d.orderTotal,
      d.serviceType, d.category, d.subCategory,
    );
  }

  @MessagePattern({ cmd: 'get_commission_by_order' })
  msgByOrder(@Payload() d: { orderId: string }) { return this.svc.getCommissionByOrder(d.orderId); }

  @MessagePattern({ cmd: 'get_seller_commission_history' })
  msgSellerHistory(@Payload() d: { sellerId: string; page?: number; limit?: number }) {
    return this.svc.getSellerCommissions(d.sellerId, d.page ?? 1, d.limit ?? 20);
  }

  @MessagePattern({ cmd: 'get_commission_totals' })
  msgTotals(@Payload() d: { startDate: string; endDate: string; serviceType?: string }) {
    return this.svc.getTotalCommission(d.startDate, d.endDate, d.serviceType);
  }

  @MessagePattern({ cmd: 'get_platform_revenue_summary' })
  msgRevenueSummary() { return this.svc.getPlatformRevenueSummary(); }

  @MessagePattern({ cmd: 'get_category_rate_card' })
  msgRateCard() { return this.svc.getCategoryRateCard(); }

  @MessagePattern({ cmd: 'update_category_rate' })
  msgUpdateCategoryRate(@Payload() d: { category: string; subCategory?: string; updates: any }) {
    return this.svc.updateCategoryRate(d.category, d.subCategory, d.updates);
  }

  @MessagePattern({ cmd: 'set_seller_commission_override' })
  msgSetOverride(@Payload() d: { sellerId: string; serviceType: string; rate: number; reason: string; expiresAt?: string }) {
    return this.svc.setSellerOverride(d.sellerId, d.serviceType, d.rate, d.reason, d.expiresAt);
  }

  @MessagePattern({ cmd: 'remove_seller_commission_override' })
  msgRemoveOverride(@Payload() d: { sellerId: string; serviceType: string }) {
    return this.svc.removeSellerOverride(d.sellerId, d.serviceType);
  }
}
