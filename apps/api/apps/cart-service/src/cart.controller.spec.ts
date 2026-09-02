import { Test, type TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

/**
 * The gateway's cart routes have always sent `update_cart_item` and
 * `remove_cart_item` over TCP, but neither pattern had a handler here. Every
 * quantity change and every removal therefore rejected; the web cart swallows
 * the error, so the row updated on screen while Redis kept the original cart
 * and the change vanished on the next load.
 *
 * These assert the patterns are wired and that `itemId` is passed through as the
 * product id — cart lines are keyed by productId + variantId, there is no
 * separate cart-item identifier.
 */
describe('CartController — RPC surface', () => {
  let controller: CartController;
  let svc: jest.Mocked<CartService>;

  beforeEach(async () => {
    const svcMock: Partial<jest.Mocked<CartService>> = {
      addItem: jest.fn().mockResolvedValue({ success: true }),
      getCart: jest.fn().mockResolvedValue({ items: [] }),
      clearCart: jest.fn().mockResolvedValue({ success: true }),
      updateItemQuantity: jest.fn().mockResolvedValue({ success: true }),
      removeItem: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: svcMock }],
    }).compile();

    controller = module.get(CartController);
    svc = module.get(CartService);
  });

  it('update_cart_item forwards the product id and a numeric quantity', async () => {
    await controller.msgUpdate({ userId: 'u1', itemId: 'p1', quantity: 3 as any });

    expect(svc.updateItemQuantity).toHaveBeenCalledWith('u1', 'p1', 3, undefined);
  });

  it('update_cart_item coerces a string quantity', async () => {
    // The gateway spreads the request body through untouched, so JSON "2" arrives
    // as a string and would silently fail the >0 check in the service.
    await controller.msgUpdate({ userId: 'u1', itemId: 'p1', quantity: '2' as any });

    expect(svc.updateItemQuantity).toHaveBeenCalledWith('u1', 'p1', 2, undefined);
  });

  it('update_cart_item keeps variants distinct', async () => {
    await controller.msgUpdate({ userId: 'u1', itemId: 'p1', quantity: 1, variantId: 'v9' });

    expect(svc.updateItemQuantity).toHaveBeenCalledWith('u1', 'p1', 1, 'v9');
  });

  it('remove_cart_item forwards the product id', async () => {
    await controller.msgRemove({ userId: 'u1', itemId: 'p1' });

    expect(svc.removeItem).toHaveBeenCalledWith('u1', 'p1', undefined);
  });

  it('rejects a payload with no user or item rather than mutating the wrong cart', () => {
    expect(() => controller.msgUpdate({ userId: '', itemId: 'p1', quantity: 1 })).toThrow();
    expect(() => controller.msgRemove({ userId: 'u1', itemId: '' })).toThrow();
    expect(svc.updateItemQuantity).not.toHaveBeenCalled();
    expect(svc.removeItem).not.toHaveBeenCalled();
  });
});
