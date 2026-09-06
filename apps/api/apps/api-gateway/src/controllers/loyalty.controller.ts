import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  UseGuards,
  Req,
  Query,
  Param,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCatch } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { lastValueFrom, timeout, catchError } from 'rxjs';

@ApiTags('🎁 Loyalty & Rewards')
@ApiBearerAuth('JWT')
// Two mounts. This was `api/loyalty` alone, which under the global `api`
// prefix answered at /api/v1/api/loyalty/* — a path the web client had to
// learn while the mobile customer app, calling /api/v1/loyalty/points, got
// 404 on every request. `loyalty` is canonical; `api/loyalty` is kept so
// nothing that learned the doubled path breaks.
@Controller(['loyalty', 'api/loyalty'])
export class LoyaltyGatewayController {
  private readonly logger = new Logger(LoyaltyGatewayController.name);

  constructor(@Inject('LOYALTY_SERVICE') private readonly loyaltyClient: ClientProxy) {}

  /**
   * Forward to loyalty-service, preserving the failure.
   *
   * Points are spendable value, so the previous fallbacks were the same class of
   * mistake as returning a zero wallet balance: with loyalty-service stopped,
   * `GET /api/loyalty/points` answered `200 { points: 0, tier: 'BRONZE' }` and a
   * customer's balance appeared to have been wiped. Worse, `award` and `reverse`
   * reported `success: false` inside a 200, which no caller treats as an error —
   * points for a completed order were silently never granted, and points for a
   * refunded one silently never reclaimed.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.loyaltyClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Loyalty service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`loyalty-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Loyalty service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('points')
  @ApiOperation({ summary: 'Get current loyalty points' })
  async getPoints(@Req() req: any) {
    const userId = req.user.id;
    return this.send('get_loyalty_points', { userId });
  }

  @UseGuards(JwtAuthGuard)
  @Post('award')
  @ApiOperation({ summary: 'Award loyalty points (Internal/Admin only)' })
  async awardPoints(
    @Body() dto: { points: number; reason: string; orderId?: string },
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.send('award_loyalty_points', {
      userId,
      points: dto.points,
      reason: dto.reason,
      orderId: dto.orderId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('reverse')
  @ApiOperation({ summary: 'Reverse loyalty points for a cancelled/refunded order' })
  async reversePoints(@Body() dto: { orderId: string; reason: string }, @Req() req: any) {
    const userId = req.user.id;
    return this.send('reverse_loyalty_points', {
      userId,
      orderId: dto.orderId,
      reason: dto.reason,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('preview')
  @ApiOperation({ summary: 'Preview points to be earned for a given order total' })
  @ApiQuery({ name: 'orderTotal', required: true, type: Number })
  async previewPoints(@Query('orderTotal') orderTotal: number, @Req() req: any) {
    const userId = req.user.id;
    return this.send('preview_loyalty_points', {
      orderTotal: +orderTotal,
      userId,
    });
  }

  /**
   * Spend points for a discount.
   *
   * This forwarded to `award_loyalty_points` with a negated amount, because
   * loyalty-service's `redeemPoints` had no message pattern to reach. Awarding
   * negative points skips the balance check that redemption exists to perform:
   * `POST /redeem {"points":50}` against a balance of 0 returned
   * `201 { success: true, pointsAwarded: -50, newTotal: -50 }` — spendable value
   * conjured out of an empty account.
   *
   * `redeem_loyalty_points` now exists and enforces the balance. A refusal from
   * it is surfaced as a 400 rather than a 201 carrying `success: false`, which no
   * caller treats as an error.
   */
  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  @ApiOperation({ summary: 'Redeem loyalty points for a discount' })
  async redeemPoints(@Body() dto: { points: number }, @Req() req: any) {
    const points = Number(dto?.points);
    if (!Number.isFinite(points) || points <= 0 || !Number.isInteger(points)) {
      throw new HttpException('points must be a positive whole number', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.id;
    const result = await this.send<{ success: boolean; reason?: string }>('redeem_loyalty_points', {
      userId,
      points,
    });
    if (result && result.success === false) {
      throw new HttpException(
        result.reason ?? 'Points could not be redeemed',
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get loyalty points awarded for a specific order' })
  @ApiParam({ name: 'orderId', example: 'ORD-1234' })
  async getPointsForOrder(@Param('orderId') orderId: string) {
    return this.send('get_loyalty_for_order', { orderId });
  }
}
