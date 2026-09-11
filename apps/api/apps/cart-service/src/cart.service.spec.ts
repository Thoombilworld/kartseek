import { Test, type TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('CartService', () => {
  let service: CartService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('cart-service');
      expect(result.status).toBe('ok');
    });
  });

  describe('getCart', () => {
    it('should return empty cart for new user', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getCart('USER-001');
      expect(result.userId).toBe('USER-001');
      expect(result.items).toEqual([]);
      expect(result.subtotal).toBe(0);
    });

    it('should return cached cart', async () => {
      const cached = {
        userId: 'U1',
        items: [{ productId: 'p1', price: 100, quantity: 2 }],
        subtotal: 200,
      };
      redis.getJson.mockResolvedValue(cached);
      const result = await service.getCart('U1');
      expect(result.items).toHaveLength(1);
      expect(result.subtotal).toBe(200);
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.addItem('U1', {
        productId: 'p1',
        name: 'Widget',
        price: 500,
        quantity: 1,
        serviceType: 'marketplace',
      });
      expect(result.success).toBe(true);
      expect(result.cart.items).toHaveLength(1);
      expect(result.cart.subtotal).toBe(500);
    });

    it('should increment quantity for existing item', async () => {
      redis.getJson.mockResolvedValue({
        userId: 'U1',
        items: [
          { productId: 'p1', name: 'Widget', price: 500, quantity: 1, serviceType: 'marketplace' },
        ],
        subtotal: 500,
      });
      const result = await service.addItem('U1', {
        productId: 'p1',
        name: 'Widget',
        price: 500,
        quantity: 2,
        serviceType: 'marketplace',
      });
      expect(result.cart.items[0].quantity).toBe(3);
      expect(result.cart.subtotal).toBe(1500);
    });

    it('should handle variant-based deduplication', async () => {
      redis.getJson.mockResolvedValue({
        userId: 'U1',
        items: [{ productId: 'p1', variantId: 'v1', price: 100, quantity: 1 }],
        subtotal: 100,
      });
      // Same product, different variant → new item
      const result = await service.addItem('U1', {
        productId: 'p1',
        name: 'Widget',
        price: 120,
        quantity: 1,
        variantId: 'v2',
        serviceType: 'marketplace',
      });
      expect(result.cart.items).toHaveLength(2);
    });

    // Regression: the same product carted in Qatar and then in India merged
    // into one riyal-priced line with quantity 2, leaving the Indian basket
    // empty. A line is one product, one SKU, in one market.
    it('keeps the same product distinct per market', async () => {
      redis.getJson.mockResolvedValue({
        userId: 'U1',
        items: [{ productId: 'p1', price: 255, quantity: 1, regionCode: 'QA' }],
        subtotal: 255,
      });
      const result = await service.addItem('U1', {
        productId: 'p1',
        name: 'Dash cam',
        price: 6621,
        quantity: 1,
        serviceType: 'marketplace',
        regionCode: 'IN',
      });
      expect(result.cart.items).toHaveLength(2);
      expect(result.cart.items.map((i: any) => `${i.regionCode}:${i.price}x${i.quantity}`)).toEqual(
        ['QA:255x1', 'IN:6621x1'],
      );
    });

    it('removes only the line in the market named', async () => {
      redis.getJson.mockResolvedValue({
        userId: 'U1',
        items: [
          { productId: 'p1', price: 255, quantity: 1, regionCode: 'QA' },
          { productId: 'p1', price: 6621, quantity: 1, regionCode: 'IN' },
        ],
        subtotal: 6876,
      });
      const result = await service.removeItem('U1', 'p1', undefined, 'IN');
      expect(result.cart.items.map((i: any) => i.regionCode)).toEqual(['QA']);
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      redis.getJson.mockResolvedValue({
        userId: 'U1',
        items: [{ productId: 'p1', price: 500, quantity: 1 }],
        subtotal: 500,
      });
      const result = await service.updateItemQuantity('U1', 'p1', 5);
      expect(result.cart.items[0].quantity).toBe(5);
      expect(result.cart.subtotal).toBe(2500);
    });

    it('should remove item when quantity is 0', async () => {
      redis.getJson.mockResolvedValue({
        userId: 'U1',
        items: [{ productId: 'p1', price: 500, quantity: 1 }],
        subtotal: 500,
      });
      const result = await service.updateItemQuantity('U1', 'p1', 0);
      expect(result.cart.items).toHaveLength(0);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      redis.getJson.mockResolvedValue({
        userId: 'U1',
        items: [
          { productId: 'p1', price: 500, quantity: 1 },
          { productId: 'p2', price: 300, quantity: 2 },
        ],
        subtotal: 1100,
      });
      const result = await service.removeItem('U1', 'p1');
      expect(result.cart.items).toHaveLength(1);
      expect(result.cart.subtotal).toBe(600);
    });
  });

  describe('clearCart', () => {
    it('should clear entire cart', async () => {
      const result = await service.clearCart('U1');
      expect(result.success).toBe(true);
      expect(redis.del).toHaveBeenCalledWith('cart:U1');
    });
  });
});
