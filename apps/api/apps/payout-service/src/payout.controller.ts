import { Controller, Get, Post, Put, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { PayoutService, PayoutRecord } from './payout.service';
import { EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('payouts')
export class PayoutController {
  constructor(private readonly svc: PayoutService) {}
  @Get('health') health() { return this.svc.healthCheck(); }
  @Post() request(@Body() dto: any) { return this.svc.createPayoutRequest(dto); }
  @Get('pending') getPending() { return this.svc.getPendingPayouts(); }
  @Get(':id') getById(@Param('id') id: string) { return this.svc.getPayoutById(id); }
  @Put(':id/process') process(@Param('id') id: string, @Body('adminId') adminId: string) { return this.svc.processPayout(id, adminId); }
  @Get('seller/:sellerId') getBySeller(@Param('sellerId') sid: string, @Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.getSellerPayouts(sid, +page, +limit); }
  
  @Get('wallet/:sellerId')
  getWalletHttp(@Param('sellerId') sellerId: string) {
    return this.svc.getOrCreateWallet(sellerId);
  }

  @MessagePattern({ cmd: 'get_wallet' })
  msgGetWallet(@Payload() data: { sellerId: string }) {
    return this.svc.getOrCreateWallet(data.sellerId);
  }

  @MessagePattern({ cmd: 'request_payout' }) msgRequest(@Payload() d: EmptyMessage) { return this.svc.createPayoutRequest(d); }

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
  msgSellerPayouts(@Payload() d: { sellerId: string; page?: number; limit?: number; status?: any }) {
    return this.svc.getSellerPayouts(d.sellerId, d.page ?? 1, d.limit ?? 20, d.status);
  }

  @MessagePattern({ cmd: 'get_payout_by_id' })
  msgPayoutById(@Payload() d: { payoutId: string }) { return this.svc.getPayoutById(d.payoutId); }

  // The admin payout queue. `GET /admin/marketplace/payouts` used to be a
  // hardcoded empty list, so no seller withdrawal could be seen or approved.
  @MessagePattern({ cmd: 'get_pending_payouts' })
  msgPendingPayouts(@Payload() d: { page?: number; limit?: number }) {
    return this.svc.getPendingPayouts(d?.page ?? 1, d?.limit ?? 20);
  }

  @MessagePattern({ cmd: 'retry_payout' })
  msgRetryPayout(@Payload() d: { payoutId: string }) { return this.svc.retryPayout(d.payoutId); }

  /** Settle a delivered order into the seller's withdrawable balance. */
  @MessagePattern({ cmd: 'credit_seller_wallet' })
  msgCreditSeller(@Payload() d: { sellerId: string; amount: number; reason: string; referenceId?: string }) {
    return this.svc.creditSellerWallet(d.sellerId, d.amount, d.reason, d.referenceId);
  }

  @MessagePattern({ cmd: 'get_payout_stats' })
  msgPayoutStats() { return this.svc.getPayoutStats(); }

  @MessagePattern({ cmd: 'approve_payout' })
  msgApprovePayout(@Payload() d: { payoutId: string; adminId: string }) {
    return this.svc.approvePayout(d.payoutId, d.adminId);
  }

  @MessagePattern({ cmd: 'process_payout' })
  msgProcessPayout(@Payload() d: { payoutId: string; adminId?: string }) {
    return this.svc.processPayout(d.payoutId, d.adminId);
  }

  @EventPattern('escrow.hold.wallet')
  async handleHoldEscrow(@Payload() data: { orderId: string, sellerId: string, amount: number }) {
    await this.svc.holdEscrowInSellerWallet(data.sellerId, data.amount);
  }

  @EventPattern('escrow.release.wallet')
  async handleReleaseEscrow(@Payload() data: { orderId: string, sellerId: string, amount: number }) {
    await this.svc.releaseEscrowToSellerWallet(data.sellerId, data.amount);
  }
}
