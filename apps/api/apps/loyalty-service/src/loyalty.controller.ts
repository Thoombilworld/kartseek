import { Controller, Get, Post, Param, Body, UseFilters } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { LoyaltyService } from './loyalty.service';
import { type EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly svc: LoyaltyService) {}

  @Get('health') health() { return this.svc.healthCheck(); }
  @Get('user/:userId') getPoints(@Param('userId') uid: string) { return this.svc.getPoints(uid); }
  @Post('award') award(@Body() dto: { userId: string; points: number; reason: string; orderId?: string }) { return this.svc.awardPoints(dto.userId, dto.points, dto.reason, dto.orderId); }
  @Post('redeem') redeem(@Body() dto: { userId: string; points: number }) { return this.svc.redeemPoints(dto.userId, dto.points); }
  @Post('reverse') reverse(@Body() dto: { userId: string; orderId: string; reason: string }) { return this.svc.reversePoints(dto.userId, dto.orderId, dto.reason); }
  @Post('adjust') adjust(@Body() dto: { userId: string; points: number; reason: string; adminId: string }) { return this.svc.adjustPoints(dto.userId, dto.points, dto.reason, dto.adminId); }
  @Get('order/:orderId') getPointsForOrder(@Param('orderId') id: string) { return this.svc.getPointsForOrder(id); }

  // ── TCP Message Patterns (called by API Gateway via ClientProxy) ────────
  @MessagePattern({ cmd: 'get_loyalty_points' })
  msgGet(@Payload() d: { userId: string }) { return this.svc.getPoints(d.userId); }

  @MessagePattern({ cmd: 'award_loyalty_points' })
  msgAward(@Payload() d: EmptyMessage) { return this.svc.awardPoints(d.userId, d.points, d.reason, d.orderId); }

  /**
   * `redeemPoints` existed on the service but had no pattern, so the gateway
   * could not reach it and spent points through `award_loyalty_points` with a
   * negative amount instead — which skipped the balance check and let a customer
   * redeem more than they held.
   */
  @MessagePattern({ cmd: 'redeem_loyalty_points' })
  msgRedeem(@Payload() d: { userId: string; points: number }) {
    return this.svc.redeemPoints(d.userId, d.points);
  }

  @MessagePattern({ cmd: 'reverse_loyalty_points' })
  msgReverse(@Payload() d: { userId: string; orderId: string; reason: string }) {
    return this.svc.reversePoints(d.userId, d.orderId, d.reason);
  }

  @MessagePattern({ cmd: 'preview_loyalty_points' })
  msgPreview(@Payload() d: { orderTotal: number; userId?: string }) {
    return this.svc.calculatePointsPreview(d.orderTotal, d.userId);
  }

  @MessagePattern({ cmd: 'adjust_loyalty_points' })
  msgAdjust(@Payload() d: { userId: string; points: number; reason: string; adminId: string }) {
    return this.svc.adjustPoints(d.userId, d.points, d.reason, d.adminId);
  }

  @MessagePattern({ cmd: 'get_loyalty_for_order' })
  msgGetForOrder(@Payload() d: { orderId: string }) {
    return this.svc.getPointsForOrder(d.orderId);
  }

  // ── Kafka Event Consumers ──────────────────────────────────────────────
  // Auto-reverse points when an order is cancelled
  @EventPattern('order.cancelled')
  async onOrderCancelled(@Payload() data: { id: string; customerId?: string; userId?: string }) {
    const userId = data.customerId || data.userId;
    if (!userId) return;
    await this.svc.reversePoints(userId, data.id, 'Order Cancelled');
  }

  // Auto-reverse points when order status changes to CANCELLED
  @EventPattern('order.status_updated')
  async onOrderStatusUpdated(@Payload() data: { id: string; status: string; customerId?: string; userId?: string }) {
    if (data.status !== 'CANCELLED') return;
    const userId = data.customerId || data.userId;
    if (!userId) return;
    await this.svc.reversePoints(userId, data.id, 'Order Cancelled');
  }

  // Auto-reverse points when a refund is approved
  @EventPattern('refund.approved')
  async onRefundApproved(@Payload() data: { orderId: string; userId?: string }) {
    if (!data.userId || !data.orderId) return;
    await this.svc.reversePoints(data.userId, data.orderId, 'Refund Approved');
  }
}
