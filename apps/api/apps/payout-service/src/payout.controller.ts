import { Controller, Get, Post, Put, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { PayoutService, type PayoutRecord } from './payout.service';
import { type EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('payouts')
export class PayoutController {
  constructor(private readonly svc: PayoutService) {}
  @Get('health') health() {
    return this.svc.healthCheck();
  }
  @Post() request(@Body() dto: any) {
    return this.svc.createPayoutRequest(dto);
  }
  @Get('pending') getPending() {
    return this.svc.getPendingPayouts();
  }
  @Get(':id') getById(@Param('id') id: string) {
    return this.svc.getPayoutById(id);
  }
  @Put(':id/process') process(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.svc.processPayout(id, adminId);
  }
  @Get('seller/:sellerId') getBySeller(
    @Param('sellerId') sid: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.getSellerPayouts(sid, +page, +limit);
  }

  @Get('wallet/:sellerId')
  getWalletHttp(@Param('sellerId') sellerId: string) {
    return this.svc.getOrCreateWallet(sellerId);
  }

  @MessagePattern({ cmd: 'get_wallet' })
  msgGetWallet(@Payload() data: { sellerId: string }) {
    return this.svc.getOrCreateWallet(data.sellerId);
  }

  @MessagePattern({ cmd: 'request_payout' }) msgRequest(@Payload() d: EmptyMessage) {
    return this.svc.createPayoutRequest(d);
  }

  /**
   * The seller's own payout history.
   *
   * `getSellerPayouts` has always existed and is exposed over HTTP as
   * `GET /payouts/seller/:sellerId`, but the gateway can only reach this service
   * over TCP and there was no handler for it — so the seller portal's Payouts
   * page hit the gateway's catch-all and rendered an empty list no matter how
   * many payouts had been requested.
   */
  @MessagePattern({ cmd: 'get_seller_payouts' })
  msgSellerPayouts(
    @Payload()
    d: {
      sellerId: string;
      page?: number;
      limit?: number;
      status?: any;
      scope?: string;
    },
  ) {
    return this.svc.getSellerPayouts(d.sellerId, d.page ?? 1, d.limit ?? 20, d.status, d.scope);
  }

  @MessagePattern({ cmd: 'get_payout_by_id' })
  msgPayoutById(@Payload() d: { payoutId: string; scope?: string }) {
    return this.svc.getPayoutById(d.payoutId, d.scope);
  }

  // The admin payout queue. `GET /admin/marketplace/payouts` used to be a
  // hardcoded empty list, so no seller withdrawal could be seen or approved.
  // `scope` is the gateway's lock and `region` the filter a global admin asked
  // for; the service predicates on `region_code` with the lock winning. This
  // pattern used to ignore both, which is why the route in front of it refused
  // every region-locked admin rather than filtering (AUD2-089).
  @MessagePattern({ cmd: 'get_pending_payouts' })
  msgPendingPayouts(
    @Payload() d: { page?: number; limit?: number; scope?: string; region?: string },
  ) {
    return this.svc.getPendingPayouts(d?.page ?? 1, d?.limit ?? 20, d?.scope, d?.region);
  }

  @MessagePattern({ cmd: 'retry_payout' })
  msgRetryPayout(@Payload() d: { payoutId: string; scope?: string }) {
    return this.svc.retryPayout(d.payoutId, d.scope);
  }

  /** Settle a delivered order into the seller's withdrawable balance. */
  @MessagePattern({ cmd: 'credit_seller_wallet' })
  msgCreditSeller(
    @Payload() d: { sellerId: string; amount: number; reason: string; referenceId?: string },
  ) {
    return this.svc.creditSellerWallet(d.sellerId, d.amount, d.reason, d.referenceId);
  }

  @MessagePattern({ cmd: 'get_payout_stats' })
  msgPayoutStats(@Payload() d?: { scope?: string; region?: string }) {
    return this.svc.getPayoutStats(d?.scope, d?.region);
  }

  @MessagePattern({ cmd: 'approve_payout' })
  msgApprovePayout(@Payload() d: { payoutId: string; adminId: string; scope?: string }) {
    return this.svc.approvePayout(d.payoutId, d.adminId, d.scope);
  }

  @MessagePattern({ cmd: 'process_payout' })
  msgProcessPayout(@Payload() d: { payoutId: string; adminId?: string; scope?: string }) {
    return this.svc.processPayout(d.payoutId, d.adminId, d.scope);
  }

  @EventPattern('escrow.hold.wallet')
  async handleHoldEscrow(@Payload() data: { orderId: string; sellerId: string; amount: number }) {
    await this.svc.holdEscrowInSellerWallet(data.sellerId, data.amount);
  }

  @EventPattern('escrow.release.wallet')
  async handleReleaseEscrow(
    @Payload() data: { orderId: string; sellerId: string; amount: number },
  ) {
    await this.svc.releaseEscrowToSellerWallet(data.sellerId, data.amount);
  }
}
