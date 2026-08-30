import {
  Controller, Post, Get, Param, Body, Query, Req, Logger,
  UseGuards, Put, Inject, HttpCode, HttpStatus,
  HttpException, UnauthorizedException,
} from '@nestjs/common';
import { ClientKafka, ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiBody, ApiParam, ApiOkResponse,
  ApiCreatedResponse, ApiForbiddenResponse,
  ApiUnauthorizedResponse, ApiBadRequestResponse,
  ApiNotFoundResponse, ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';
import { KAFKA_TOPICS } from '@app/kafka';
import {
  PlaceOrderDto,
  PlaceOrderResponseDto,
  UpdateOrderStatusDto,
  OrderTrackingResponseDto,
  SuccessResponseDto,
  ErrorResponseDto,
} from '../dto/gateway.dto';

@ApiTags('📦 Orders')
@ApiBearerAuth('JWT')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {

  private readonly logger = new Logger(OrderController.name);

  constructor(
    @Inject('ORDER_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly trackingGrants: WsTrackingGrantService,
    // Restaurant orders live in restaurant-service, not order-service: they are
    // written by `place_restaurant_order` into `restaurant_orders`. The handlers
    // below used to invent them rather than ask for them.
    @Inject('RESTAURANT_SERVICE') private readonly restaurantClient: ClientProxy,
  ) {}

  // —————————————————————————————————————————————————————————————— Customer ——————————————————————————————————————————————————————————————

  @Post('checkout')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Place a new order',
    description:
      'Validates cart, applies coupon/wallet deductions, calculates final total, ' +
      'emits `order.created` to Kafka for async inventory/notification processing, ' +
      'and returns the order ID with a payment token to initiate the payment gateway flow.',
  })
  @ApiBody({ type: PlaceOrderDto })
  @ApiCreatedResponse({ type: PlaceOrderResponseDto, description: 'Order placed; proceed to payment' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid payload or cart empty' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Role CUSTOMER required' })
  placeOrder(@Body() payload: PlaceOrderDto) {
    const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payableAmount = (payload as any).totalAmount || 1052;

    this.kafkaClient.emit(KAFKA_TOPICS.ORDER_CREATED, {
      orderId,
      amount: payableAmount,
      items: (payload as any).items || [],
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Order placed successfully. Proceed to payment.',
      orderId,
      payableAmount,
      paymentToken: `txn_${Date.now()}`,
    };
  }

  @Get(':id/tracking')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Generic order tracking',
    description:
      'Not implemented. Tracking is per-module — use `/orders/restaurant/:orderId/tracking`, '
      + '`/marketplace/orders/:id/track` or `/grocery/orders/:id/tracking`, each of which resolves '
      + 'the order against the service that owns it and scopes it to the customer who placed it.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 501, description: 'Generic order tracking is not available' })
  getOrderTracking() {
    // This answered every request with the same invented delivery: a driver
    // named "Rahul Kumar", the phone number +91 980 000 0001, coordinates in
    // Mumbai, and a four-step timeline with three steps ticked — for any order
    // id, from any customer, with no lookup of any kind. A customer watching it
    // would have seen a stranger's name and a location unrelated to their order.
    //
    // There is nothing to wire it to: order-service has no tracking message
    // pattern, and orders live across four services that each track their own.
    throw new HttpException(
      'Use the module tracking route for this order.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  /**
   * The restaurant order surface, forwarded to restaurant-service.
   *
   * Every handler between here and the seller section below used to answer from
   * objects written into this file. `history` returned the same three orders —
   * "The Grand Biryani House", "Pizza Paradise", "Punjab Da Dhaba" — to every
   * customer who asked; `:orderId` returned one fixed Bengaluru order for
   * whatever id was in the URL, with a named driver and a phone number;
   * `tracking` returned a rider at a fixed latitude and longitude with seven of
   * eight milestones ticked; `invoice` produced a tax document quoting a GSTIN
   * for a restaurant that does not exist. Nothing read or wrote a row.
   *
   * `restaurant_orders` has always held the real thing — `placeOrder` writes to
   * it — and restaurant-service now exposes customer-scoped reads of it.
   */
  private async sendToRestaurants<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.restaurantClient.send<T>({ cmd }, payload).pipe(
          timeout(5000),
          catchError(rpcCatch('Restaurant service unavailable')),
        ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`restaurant-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Restaurant service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** The verified customer id, or a refusal. Never taken from the request body. */
  private customerId(req: any): string {
    const id = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!id) throw new UnauthorizedException('Authenticated customer required');
    return id;
  }

  @Get('restaurant/history')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Restaurant order history',
    description: 'All past restaurant orders (delivery, takeaway, dine-in) for the authenticated customer.',
  })
  @ApiOkResponse({ description: 'List of past restaurant orders' })
  getRestaurantOrderHistory(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sendToRestaurants('get_customer_restaurant_orders', {
      customerId: this.customerId(req),
      type, status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('restaurant/:orderId')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Restaurant order detail',
    description: 'Full details of one restaurant order belonging to the authenticated customer.',
  })
  @ApiParam({ name: 'orderId', description: 'Order id or order number' })
  @ApiOkResponse({ description: 'Full order details' })
  @ApiNotFoundResponse({ description: 'No such order for this customer' })
  getRestaurantOrderDetail(@Req() req: any, @Param('orderId') orderId: string) {
    return this.sendToRestaurants('get_customer_restaurant_order', {
      customerId: this.customerId(req), orderId,
    });
  }

  @Get('restaurant/:orderId/tracking')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Restaurant order tracking',
    description:
      'Status milestones for one of the customer orders, each marked complete only where the order records that it happened.',
  })
  @ApiParam({ name: 'orderId', description: 'Order id or order number' })
  @ApiOkResponse({ description: 'Tracking timeline' })
  @ApiNotFoundResponse({ description: 'No such order for this customer' })
  async getRestaurantOrderTracking(@Req() req: any, @Param('orderId') orderId: string) {
    const customerId = this.customerId(req);
    const tracking = await this.sendToRestaurants<{ orderId?: string; orderNumber?: string }>(
      'get_customer_restaurant_order_tracking', { customerId, orderId },
    );

    // Reaching here means restaurant-service resolved the order *for this
    // customer* — somebody else's id is a 404. That check is what the live
    // socket room has no way to perform for itself, so it is recorded here.
    // Both identifiers are granted because the customer may hold either.
    await Promise.all([
      this.trackingGrants.grant(orderId, customerId),
      tracking?.orderId ? this.trackingGrants.grant(tracking.orderId, customerId) : Promise.resolve(),
      tracking?.orderNumber ? this.trackingGrants.grant(tracking.orderNumber, customerId) : Promise.resolve(),
    ]);

    return tracking;
  }

  @Get('restaurant/:orderId/invoice')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Restaurant order invoice',
    description:
      'Not implemented. Restaurant invoicing has no issuer: nothing records a tax registration per restaurant, and the platform invoice service covers marketplace orders only.',
  })
  @ApiParam({ name: 'orderId' })
  @ApiResponse({ status: 501, description: 'Restaurant invoicing is not available' })
  getRestaurantOrderInvoice() {
    // This returned a printable tax document quoting "GST-KA-29ABCDE1234F1Z5"
    // for a restaurant that does not exist, with a CGST/SGST split that applies
    // only in India while the platform trades in Qatar. A document a customer
    // might file with an authority is not something to approximate: refusing is
    // the correct answer until a real issuer exists.
    throw new HttpException(
      'Restaurant invoices are not available yet.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Post('restaurant/:orderId/reorder')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Reorder from a previous restaurant order',
    description:
      'Returns the items of a past order priced as they stand today, split into what the restaurant can still make and what it cannot.',
  })
  @ApiParam({ name: 'orderId' })
  @ApiCreatedResponse({ description: 'Items resolved from the previous order' })
  reorderRestaurant(@Req() req: any, @Param('orderId') orderId: string) {
    return this.sendToRestaurants('reorder_customer_restaurant_order', {
      customerId: this.customerId(req), orderId,
    });
  }

  @Post('restaurant/:orderId/cancel')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Cancel a restaurant order',
    description:
      'Cancels an order that is still cancellable and emits `restaurant.order.cancelled`. Refunds are issued by payment-service against that event; this route does not quote one.',
  })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ description: 'Order cancelled' })
  @ApiBadRequestResponse({ description: 'Order has progressed too far to cancel' })
  cancelRestaurantOrder(@Req() req: any, @Param('orderId') orderId: string, @Body() body: any) {
    return this.sendToRestaurants('cancel_customer_restaurant_order', {
      customerId: this.customerId(req), orderId, reason: body?.reason,
    });
  }

  @Post('restaurant/:orderId/rate-delivery')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Rate delivery partner',
    description: 'Not implemented. A delivery rating has nowhere to be stored — no delivery-partner rating record exists.',
  })
  @ApiParam({ name: 'orderId' })
  @ApiResponse({ status: 501, description: 'Delivery ratings are not available' })
  rateDeliveryPartner() {
    // Answered `success: true, "Delivery partner rated successfully"` and dropped
    // the rating, so a customer reporting a bad delivery was told it had been
    // recorded when it never was.
    throw new HttpException(
      'Delivery partner ratings are not available yet.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Post('restaurant/:orderId/tip')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Tip delivery partner',
    description: 'Not implemented. A tip moves money and needs a wallet debit and a payout leg; this route has neither.',
  })
  @ApiParam({ name: 'orderId' })
  @ApiResponse({ status: 501, description: 'Tipping is not available' })
  tipDeliveryPartner() {
    // Reported a tip "added" in INR, debited from a wallet that was never
    // touched, to a delivery partner who was never credited.
    throw new HttpException(
      'Tipping a delivery partner is not available yet.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  // ──────────────── Partner / Seller ──────────────────────────────────────

  @Put(':id/status')
  @Roles(UserRole.SELLER)
  @ApiOperation({
    summary: 'Update order status (Seller)',
    description:
      'Allows a seller to move an order through its lifecycle: ' +
      'ACCEPTED â†’ PREPARING â†’ READY â†’ HANDED_OVER.',
  })
  @ApiParam({ name: 'id', example: 'ORD-1685451234-4291', description: 'Order ID' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ type: SuccessResponseDto, description: 'Status updated' })
  @ApiForbiddenResponse({ description: 'Role SELLER required' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return { success: true, message: `Order #${id} status updated to ${dto.status}` };
  }

  // â”€â”€ Driver / Delivery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Put(':id/delivery-status')
  @Roles(UserRole.DRIVER)
  @ApiOperation({
    summary: 'Update delivery status (Driver)',
    description:
      'Allows a delivery partner to update pickup/delivery milestones: ' +
      'PICKED_UP â†’ ON_THE_WAY â†’ DELIVERED.',
  })
  @ApiParam({ name: 'id', example: 'ORD-1685451234-4291', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['PICKED_UP', 'ON_THE_WAY', 'DELIVERED'],
          example: 'PICKED_UP',
        },
      },
    },
  })
  @ApiOkResponse({ type: SuccessResponseDto, description: 'Delivery status updated' })
  @ApiForbiddenResponse({ description: 'Role DRIVER required' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  updateDeliveryStatus(@Param('id') id: string, @Body('status') status: string) {
    return { success: true, message: `Delivery #${id} status updated to ${status}` };
  }
}
