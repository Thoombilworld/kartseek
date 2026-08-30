import { Controller, Get, Post, Put, Delete, Param, Body, Query, UsePipes, ValidationPipe, BadRequestException, UseFilters } from '@nestjs/common';
import { EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

// Keeps a handler's HttpException status intact across the TCP hop. Without it
// Nest flattens everything to `{ status: 'error' }` and the gateway reports 503,
// so a bad payload (e.g. a cart line with no price) read as a service outage.
@UseFilters(RpcAwareExceptionsFilter)
@Controller('cart')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }))
export class CartController {
  constructor(private readonly svc: CartService) {}

  @Get('health') health() { return this.svc.healthCheck(); }
  @Get('user/:userId') getCart(@Param('userId') userId: string) { return this.svc.getCart(userId); }
  @Post('user/:userId/items') addItem(@Param('userId') userId: string, @Body() dto: AddToCartDto) {
    return this.svc.addItem(userId, {
      productId: dto.productId,
      name: dto.productId, // name derived from product lookup in production
      price: 0, // price resolved server-side from catalog
      quantity: dto.quantity,
      variantId: dto.variantId,
      serviceType: dto.type,
    });
  }
  @Put('user/:userId/items/:productId') updateItem(
    @Param('userId') userId: string,
    @Param('productId') pid: string,
    @Body() dto: UpdateCartItemDto,
    @Query('variantId') vid?: string,
  ) {
    return this.svc.updateItemQuantity(userId, pid, dto.quantity, vid);
  }
  @Delete('user/:userId/items/:productId') removeItem(@Param('userId') userId: string, @Param('productId') pid: string, @Query('variantId') vid?: string) { return this.svc.removeItem(userId, pid, vid); }
  @Delete('user/:userId') clearCart(@Param('userId') userId: string) { return this.svc.clearCart(userId); }
  @Post('user/:userId/coupon') applyCoupon(@Param('userId') userId: string, @Body('couponCode') code: string) { return this.svc.applyCoupon(userId, code); }

  @MessagePattern({ cmd: 'add_to_cart' }) msgAdd(@Payload() d: EmptyMessage) { return this.svc.addItem(d.userId, d); }
  @MessagePattern({ cmd: 'get_cart' }) msgGet(@Payload() d: { userId: string }) { return this.svc.getCart(d.userId); }
  @MessagePattern({ cmd: 'clear_cart' }) msgClear(@Payload() d: { userId: string }) { return this.svc.clearCart(d.userId); }

  // The gateway has sent these two patterns since its cart routes were added, but
  // no handler existed for either — so every quantity change and every removal
  // rejected, and the web cart (which swallows the error) showed the change while
  // Redis kept the old cart. `itemId` is the product id: items are keyed by
  // productId + variantId here, there is no separate cart-item identifier.
  @MessagePattern({ cmd: 'update_cart_item' })
  msgUpdate(@Payload() d: { userId: string; itemId: string; quantity: number; variantId?: string }) {
    if (!d?.userId || !d?.itemId) throw new BadRequestException('userId and itemId are required');
    return this.svc.updateItemQuantity(d.userId, d.itemId, Number(d.quantity), d.variantId);
  }

  @MessagePattern({ cmd: 'remove_cart_item' })
  msgRemove(@Payload() d: { userId: string; itemId: string; variantId?: string }) {
    if (!d?.userId || !d?.itemId) throw new BadRequestException('userId and itemId are required');
    return this.svc.removeItem(d.userId, d.itemId, d.variantId);
  }
}
