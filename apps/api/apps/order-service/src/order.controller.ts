import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RpcAwareExceptionsFilter } from '@app/common';
import { OrderService, OrderStatus } from './order.service';
import { AdminGetOrderDto, AdminListOrdersDto } from './dto/admin-order.dto';

// Bound on the controller because that is the only binding that reaches TCP
// handlers — an APP_FILTER provider silently does not. Without it every
// exception thrown by a `@MessagePattern` method reached the gateway as a
// generic failure, so the IDOR guard's ForbiddenException surfaced as 503
// "service unavailable" rather than 403, and a missing order as 503 not 404.
@UseFilters(RpcAwareExceptionsFilter)
// The admin payloads below are class-validator DTOs, and a TCP handler gets no
// pipe from the gateway's global one — that lives in another process. Bound
// here so `page`, `limit` and `status` are validated and transformed on the
// wire rather than coerced by hand inside the service.
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
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
    // `scope` is the gateway's market claim. It was forwarded and dropped here;
    // the service asserts the order's own `region_code` against it now, which
    // matters because the ownership check above is bypassed for an admin role.
    const scope = data && typeof data === 'object' ? data.scope : undefined;
    return this.svc.getOrderByIdForRequester(orderId, requester, scope);
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

  // ─── Admin reads ─────────────────────────────────────────────────────────
  // Added because the gateway had no order pattern to call at all: its admin
  // list returned a literal empty page and its detail route read through the
  // customer cache. `scope` is the caller's market, written by the gateway from
  // the signed token and never from a request body.
  @MessagePattern({ cmd: 'admin_list_orders' })
  msgAdminListOrders(@Payload() d: AdminListOrdersDto) {
    return this.svc.listOrdersForAdmin(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_get_order' })
  msgAdminGetOrder(@Payload() d: AdminGetOrderDto) {
    return this.svc.getOrderForAdmin(d?.orderNumber, d?.scope);
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
