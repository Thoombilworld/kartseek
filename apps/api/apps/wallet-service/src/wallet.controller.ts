import { Controller, Get, Post, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { WalletService } from './wallet.service';
import { RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('wallet')
export class WalletController {
  constructor(private readonly svc: WalletService) {}

  @Get('health') health() { return this.svc.healthCheck(); }
  @Get('user/:userId') getWallet(@Param('userId') userId: string) { return this.svc.getWallet(userId); }
  @Post('credit') credit(@Body() dto: { userId: string; amount: number; reason: string; referenceId?: string; module?: string }) { return this.svc.credit(dto.userId, dto.amount, dto.reason, dto.referenceId, dto.module); }
  @Post('debit') debit(@Body() dto: { userId: string; amount: number; reason: string; referenceId?: string; module?: string }) { return this.svc.debit(dto.userId, dto.amount, dto.reason, dto.referenceId, dto.module); }
  @Get('user/:userId/transactions') getTxns(@Param('userId') userId: string, @Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.getTransactions(userId, +page, +limit); }

  // ── Admin endpoints ─────────────────────────────────────────────────────
  @Post('freeze') freeze(@Body() dto: { userId: string; reason: string; adminId: string }) { return this.svc.freezeWallet(dto.userId, dto.reason, dto.adminId); }
  @Post('unfreeze') unfreeze(@Body() dto: { userId: string; reason: string; adminId: string }) { return this.svc.unfreezeWallet(dto.userId, dto.reason, dto.adminId); }
  @Post('search') searchTxns(@Body() filters: any) { return this.svc.searchTransactions(filters); }

  // ── TCP Message Patterns (called by API Gateway via ClientProxy) ────────
  @MessagePattern({ cmd: 'get_wallet' })
  msgGet(@Payload() data: { userId: string; regionCurrency?: string }) {
    // `regionCurrency` denominates a wallet that has no transactions yet; one
    // with a ledger is denominated by its own last transaction.
    return this.svc.getWallet(data.userId, data.regionCurrency);
  }

  @MessagePattern({ cmd: 'wallet_debit' })
  msgDebit(@Payload() data: any) { return this.svc.debit(data.userId, data.amount, data.reason, data.referenceId, data.module); }

  @MessagePattern({ cmd: 'wallet_credit' })
  msgCredit(@Payload() data: any) { return this.svc.credit(data.userId, data.amount, data.reason, data.referenceId, data.module, data.regionCurrency); }

  @MessagePattern({ cmd: 'wallet_freeze' })
  msgFreeze(@Payload() data: any) { return this.svc.freezeWallet(data.userId, data.reason, data.adminId); }

  @MessagePattern({ cmd: 'wallet_unfreeze' })
  msgUnfreeze(@Payload() data: any) { return this.svc.unfreezeWallet(data.userId, data.reason, data.adminId); }

  @MessagePattern({ cmd: 'wallet_get_transactions' })
  msgGetTxns(@Payload() data: any) { return this.svc.getTransactions(data.userId, data.page, data.limit); }

  @MessagePattern({ cmd: 'wallet_search_transactions' })
  msgSearch(@Payload() data: any) { return this.svc.searchTransactions(data); }

  // ── Kafka Event Consumers ──────────────────────────────────────────────
  @EventPattern('refund.approved')
  async onRefundApproved(@Payload() data: { orderId: string; userId: string; amount: number }) {
    await this.svc.handleRefundApproved(data);
  }
}
