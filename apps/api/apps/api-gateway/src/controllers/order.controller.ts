import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  Logger,
  UseGuards,
  Put,
  Inject,
  HttpCode,
  HttpStatus,
  HttpException,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';
import { MarketplaceOrderService } from '../services/marketplace-order.service';
import { ForwardingValidationPipe } from '../pipes/forwarding-validation.pipe';
import { ParseLimitPipe, ParsePagePipe, DEFAULT_PAGE_SIZE } from '../pipes/pagination.pipe';
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
    private readonly orders: MarketplaceOrderService,
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
      'Places the order for the signed-in customer. Marketplace baskets are priced ' +
      "server-side from each product's buy-box listing, coupons and gift cards are " +
      'verified, stock is reserved, and the order is written by order-service and ' +
      'projected to the sellers who fulfil it — the same path as `POST /marketplace/orders`. ' +
      'A payload carrying `restaurantId` is a restaurant order and goes to restaurant-service.',
  })
  @ApiBody({ type: PlaceOrderDto })
  @ApiCreatedResponse({ type: PlaceOrderResponseDto, description: 'Order placed' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid payload or cart empty' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Role CUSTOMER required' })
  @UsePipes(ForwardingValidationPipe)
  async placeOrder(@Req() req: any, @Body() payload: PlaceOrderDto) {
    // This handler used to generate `ORD-<timestamp>-<random>`, emit an
    // `order.created` event for it, and answer "Order placed successfully" —
    // without calling any service or writing a row. The mobile customer app
    // posts its checkouts here, so every order it "placed" never existed: no
    // payment, no seller, no delivery, and an id that no other route could find.
    const customerId = this.orders.userId(req);
    if (!customerId) throw new UnauthorizedException('Not authenticated');

    if (payload?.restaurantId) {
      // Restaurant orders are owned by restaurant-service. The customer is the
      // token subject, never a body field.
      const placed: any = await this.sendToRestaurants('place_restaurant_order', {
        ...payload,
        customerId,
        orderType: (payload as any).orderType ?? (payload as any).type,
      });
      const order = placed?.order ?? placed;
      return {
        success: true,
        message: 'Order placed successfully.',
        orderId: order?.id ?? null,
        orderNumber: order?.orderNumber ?? null,
        payableAmount: order?.totalAmount ?? order?.grandTotal ?? order?.total ?? null,
        order,
      };
    }

    const result: any = await this.orders.place(req, {
      ...payload,
      // The mobile client's name for the coupon field.
      couponCode: payload.couponCode ?? payload.promoCode,
    });
    const order = result?.order ?? result;
    return {
      success: true,
      message: 'Order placed successfully.',
      orderId: order?.id ?? null,
      orderNumber: order?.orderNumber ?? null,
      payableAmount: order?.totalAmount ?? order?.grandTotal ?? order?.total ?? null,
      order,
    };
  }

  @Get('history')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: "The caller's order history",
    description:
      'Marketplace orders placed by the signed-in customer, newest first, from order-service.',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getOrderHistory(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    // Declared before `:id` on purpose: a literal segment registered after a
    // parameter route is captured by it, and "history" would have been looked
    // up as an order id.
    return this.orders.listForCustomer(req, { status, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'One of my orders, by order number or uuid' })
  @ApiParam({
    name: 'id',
    description: 'Order number or order UUID, as listed by GET /orders/history',
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async getOrder(@Req() req: any, @Param('id') id: string) {
    return this.orders.getById(req, id);
  }

  @Get(':id/tracking')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Track one of my orders',
    description:
      'Courier events for a marketplace order the caller placed, resolved by order number or uuid, ' +
      'plus the order status so an order with no scans yet still renders a timeline. ' +
      'Restaurant orders track at `/orders/restaurant/:orderId/tracking`.',
  })
  @ApiParam({ name: 'id', description: 'Order number or order UUID' })
  @ApiOkResponse({ type: OrderTrackingResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  getOrderTracking(@Req() req: any, @Param('id') id: string) {
    // Before this answered 501, it answered every request with the same
    // invented delivery: a driver named "Rahul Kumar", a Mumbai location and a
    // four-step timeline with three steps ticked — for any id, from anyone.
    return this.orders.track(req, id);
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
        this.restaurantClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Restaurant service unavailable'))),
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
    description:
      'All past restaurant orders (delivery, takeaway, dine-in) for the authenticated customer.',
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
      type,
      status,
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
      customerId: this.customerId(req),
      orderId,
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
      'get_customer_restaurant_order_tracking',
      { customerId, orderId },
    );

    // Reaching here means restaurant-service resolved the order *for this
    // customer* — somebody else's id is a 404. That check is what the live
    // socket room has no way to perform for itself, so it is recorded here.
    // Both identifiers are granted because the customer may hold either.
    await Promise.all([
      this.trackingGrants.grant(orderId, customerId),
      tracking?.orderId
        ? this.trackingGrants.grant(tracking.orderId, customerId)
        : Promise.resolve(),
      tracking?.orderNumber
        ? this.trackingGrants.grant(tracking.orderNumber, customerId)
        : Promise.resolve(),
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
      customerId: this.customerId(req),
      orderId,
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
      customerId: this.customerId(req),
      orderId,
      reason: body?.reason,
    });
  }

  @Post('restaurant/:orderId/rate-delivery')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Rate delivery partner',
    description:
      'Not implemented. A delivery rating has nowhere to be stored — no delivery-partner rating record exists.',
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
    description:
      'Not implemented. A tip moves money and needs a wallet debit and a payout leg; this route has neither.',
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
      'ACCEPTED → PREPARING → READY → HANDED_OVER.',
  })
  @ApiParam({ name: 'id', example: 'ORD-1685451234-4291', description: 'Order ID' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ type: SuccessResponseDto, description: 'Status updated' })
  @ApiForbiddenResponse({ description: 'Role SELLER required' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    void id;
    void dto;
    // This answered `{ success: true }` for any order id from any seller without
    // looking anything up or changing anything: a status update that never
    // happened, reported as done. There is no generic order store to update —
    // marketplace orders change status through the seller routes, which check
    // that the seller owns the order, and deliveries through delivery-service.
    throw new HttpException(
      {
        success: false,
        message:
          'Not available on the generic orders surface. Use `/marketplace/seller/orders/:id/status`, which verifies the seller owns the order.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  // ── Driver / Delivery ────────────────────────────────────────────────────────

  @Put(':id/delivery-status')
  @Roles(UserRole.DRIVER)
  @ApiOperation({
    summary: 'Update delivery status (Driver)',
    description:
      'Allows a delivery partner to update pickup/delivery milestones: ' +
      'PICKED_UP → ON_THE_WAY → DELIVERED.',
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
    void id;
    void status;
    // This answered `{ success: true }` for any order id from any driver without
    // looking anything up or changing anything: a status update that never
    // happened, reported as done. There is no generic order store to update —
    // marketplace orders change status through the seller routes, which check
    // that the seller owns the order, and deliveries through delivery-service.
    throw new HttpException(
      {
        success: false,
        message:
          'Not available on the generic orders surface. Use `/delivery/tasks/:id/status`, which verifies the assignment.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
