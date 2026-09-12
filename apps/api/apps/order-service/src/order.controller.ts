import { Controller, Get, Post, Put, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RpcAwareExceptionsFilter } from '@app/common';
import { OrderService, OrderStatus } from './order.service';

// Bound on the controller because that is the only binding that reaches TCP
// handlers — an APP_FILTER provider silently does not. Without it every
// exception thrown by a `@MessagePattern` method reached the gateway as a
// generic failure, so the IDOR guard's ForbiddenException surfaced as 503
// "service unavailable" rather than 403, and a missing order as 503 not 404.
@UseFilters(RpcAwareExceptionsFilter)
@Controller('orders')
export class OrderController {
  constructor(private readonly svc: OrderService) {}

  @Get('health')
  health() {
    return this.svc.healthCheck();
  }

  @Post()
  placeOrder(@Body() dto: any) {
    return this.svc.placeOrder(dto);
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.svc.getOrderById(id);
  }

  @Get(':id/tracking')
  getTracking(@Param('id') id: string) {
    return this.svc.getOrderTracking(id);
  }

  @Get()
  getOrders(
    @Query('customerId') customerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.getOrdersByCustomer(customerId, +page, +limit);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('updatedBy') updatedBy: string,
  ) {
    return this.svc.updateOrderStatus(id, status, updatedBy);
  }

  @Post(':id/cancel')
  cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('cancelledBy') cancelledBy: string,
  ) {
    return this.svc.cancelOrder(id, reason, cancelledBy);
  }

  // ─── Kafka/TCP message handlers ──────────────────────────────────────────
  @MessagePattern({ cmd: 'place_order' })
  msgPlaceOrder(@Payload() data: any) {
    return this.svc.placeOrder(data);
  }

  @MessagePattern({ cmd: 'get_order_by_id' })
  msgGetOrder(@Payload() data: any) {
    // Accepts either a bare id string (legacy internal callers) or an object
    // { orderId | id, userId, role } from the gateway for ownership enforcement.
    const orderId = typeof data === 'string' ? data : (data?.orderId ?? data?.id);
    const requester =
      data && typeof data === 'object' ? { userId: data.userId, role: data.role } : undefined;
    return this.svc.getOrderByIdForRequester(orderId, requester);
  }

  // The gateway's PUT /marketplace/orders/:id/cancel sends this; without a
  // handler the call had no responder and the request hung until it timed out.
  @MessagePattern({ cmd: 'cancel_order' })
  msgCancelOrder(@Payload() data: any) {
    return this.svc.cancelOrder(
      data?.orderId ?? data?.id,
      data?.reason ?? 'Cancelled by customer',
      data?.userId ?? 'customer',
    );
  }

  @MessagePattern({ cmd: 'get_customer_orders' })
  msgGetCustomerOrders(@Payload() data: any) {
    return this.svc.getOrdersByCustomer(
      data?.customerId ?? data?.userId,
      +(data?.page ?? 1),
      +(data?.limit ?? 20),
      // Forwarded by the gateway all along; this call dropped it on the floor.
      data?.status,
    );
  }

  @MessagePattern({ cmd: 'update_order_status' })
  msgUpdateStatus(@Payload() data: any) {
    return this.svc.updateOrderStatus(data.orderId, data.status, data.updatedBy);
  }

  /**
   * Revenue and order counts over a date range, per market.
   *
   * admin-service owns the `/admin/reports/revenue` route but not the orders;
   * `"order".orders` carries `region_code` and `currency` and lives here. This
   * is the query the platform's only revenue report was missing — it answered
   * 501 for every market (audit F-27).
   *
   * `market` is already resolved by the caller (the gateway's lock ahead of any
   * `?country=`), so this handler filters rather than authorises.
   */
  @MessagePattern({ cmd: 'orders.revenue_by_period' })
  msgRevenueByPeriod(
    @Payload()
    d: {
      startDate: string;
      endDate: string;
      groupBy?: 'day' | 'week' | 'month';
      market?: string;
    },
  ) {
    return this.svc.revenueByPeriod(d?.startDate, d?.endDate, d?.groupBy ?? 'day', d?.market);
  }
}
