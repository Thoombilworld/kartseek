import { Controller, Get, Post, Param, Body, Query, Inject, UseGuards, Req, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCatch } from '@app/common';
import { REGION_CONFIGS } from '@app/region';
import { requestRegion } from '../services/request-region';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard, ResourceOwnershipGuard, ResourceOwner } from '@app/security';
import { lastValueFrom, timeout, catchError } from 'rxjs';

/**
 * Wallet Controller — Digital Wallet & Balance
 *
 * All wallet operations route through the wallet-service via TCP ClientProxy,
 * consolidating the data access pattern and ensuring transactions are persisted.
 *
 * **This controller never substitutes a value for a failed call.** Every route
 * used to pass a fallback into `send()` and return it as a 200: an unreachable
 * wallet-service answered `GET /wallet/:id/balance` with
 * `{ balance: 0, currency: 'INR' }`, which a client cannot tell apart from a
 * genuinely empty wallet. A customer with money in the app saw zero and was
 * blocked from paying with it, and the transaction list came back empty rather
 * than unavailable. Money is the one thing that must never be guessed, so a
 * failure here is a 503 and the UI can say "we can't reach your wallet".
 */
@ApiTags('💰 Wallet')
@ApiBearerAuth('JWT')
@Controller('wallet')
export class WalletController {
  constructor(
    @Inject('WALLET_SERVICE') private readonly walletClient: ClientProxy,
  ) {}

  private readonly logger = new Logger(WalletController.name);

  /**
   * Forward to wallet-service, preserving the failure. No fallback parameter by
   * design — see the class note above.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.walletClient.send<T>({ cmd }, payload).pipe(
          timeout(5000),
          catchError(rpcCatch('Wallet service unavailable')),
        ),
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`wallet-service [${cmd}] failed: ${(error as Error)?.message}`);
      throw new HttpException('Wallet service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * The currency of the market this request came from.
   *
   * `requestRegion` re-validates the header against the active markets rather
   * than trusting it, so a client cannot denominate a wallet into a market the
   * platform has closed.
   */
  private regionCurrency(req: unknown): string {
    return REGION_CONFIGS[requestRegion(req)].currencyCode;
  }

  @Get(':userId/balance')
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiParam({ name: 'userId', example: 'USR-001' })
  async getBalance(@Param('userId') userId: string, @Req() req: any) {
    // A wallet with no transactions has no currency of its own. Passing the
    // request's market stops it defaulting to rupees on a platform trading in
    // Qatar — which is what "INR 0.00" on every new account came from.
    return this.send('get_wallet', { userId, regionCurrency: this.regionCurrency(req) });
  }

  @Post(':userId/topup')
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Top up wallet balance' })
  @ApiBody({
    schema: {
      properties: {
        amount: { type: 'number', example: 1000 },
        method: { type: 'string', example: 'UPI' },
      },
    },
  })
  async topUp(@Param('userId') userId: string, @Body() body: { amount: number; method: string }, @Req() req: any) {
    return this.send('wallet_credit', {
      userId,
      amount: body.amount,
      reason: `Wallet Top-Up (${body.method})`,
      module: 'topup',
      // Denominates the very first transaction, which then denominates the wallet.
      regionCurrency: this.regionCurrency(req),
    });
  }

  @Get(':userId/transactions')
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransactions(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.send('wallet_get_transactions', { userId, page: +page, limit: +limit });
  }

  @Post(':userId/debit')
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Debit wallet balance (for checkout)' })
  @ApiBody({
    schema: {
      properties: {
        amount: { type: 'number', example: 500 },
        reason: { type: 'string', example: 'Order Payment' },
        referenceId: { type: 'string', example: 'ORD-1234' },
        module: { type: 'string', example: 'marketplace' },
      },
    },
  })
  async debitWallet(@Param('userId') userId: string, @Body() body: any) {
    return this.send('wallet_debit', { userId, ...body });
  }
}
