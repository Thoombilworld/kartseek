import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderService, OrderStatus } from './order.service';
import { Order } from './entities/order.entity';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';

describe('OrderService', () => {
  let service: OrderService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  const MOCK_ORDER = {
    id: 'ORD-123',
    customerId: 'cust-1',
    items: [{ productId: 'p1', quantity: 2, price: 100 }],
    subtotal: 200,
    deliveryFee: 50,
    discount: 0,
    walletDeduction: 0,
    totalAmount: 250,
    status: OrderStatus.PENDING,
    serviceType: 'marketplace',
    paymentMethod: 'card',
    placedAt: new Date().toISOString(),
    estimatedDeliveryAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    // `OrderService` takes the Order repository as its first argument — Redis is
    // only a read cache in front of it. The spec never provided one, so this
    // whole suite failed to compile its module and all 11 tests errored out
    // before running.
    const orderRepoMock = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((dto: unknown) => dto),
      save: jest.fn().mockImplementation(async (entity: unknown) => entity),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepoMock },
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  // ── placeOrder ──────────────────────────────────────────────────────────────

  describe('placeOrder', () => {
    it('should place an order, cache it in Redis, and publish Kafka event', async () => {
      const payload = {
        customerId: 'cust-1',
        items: [{ productId: 'p1', quantity: 2, price: 100 }],
        deliveryAddress: '123 Main St',
        serviceType: 'marketplace' as const,
        paymentMethod: 'card',
      };

      const result = await service.placeOrder(payload);

      expect(result.success).toBe(true);
      expect(result.order.customerId).toBe('cust-1');
      expect(result.order.totalAmount).toBe(260); // 200 + 60 marketplace delivery - 0 discount
      expect(result.order.status).toBe(OrderStatus.PENDING);
      expect(redis.setJson).toHaveBeenCalledWith(
        expect.stringContaining('order:'),
        expect.objectContaining({ customerId: 'cust-1' }),
        86400,
      );
      expect(kafka.publish).toHaveBeenCalledWith(
        KAFKA_TOPICS.ORDER_CREATED,
        expect.objectContaining({ customerId: 'cust-1' }),
      );
    });

    /**
     * This used to assert `discount === 20` for the coupon code `SAVE10` —
     * encoding the old behaviour where the order service applied a flat 10% off
     * for *any* non-empty coupon string, without checking that the coupon
     * existed, applied to these items, or had uses left. That was removed: the
     * discount is now resolved against the real coupon record before the order
     * is placed and passed in, and `placeOrder` only clamps it to the basket.
     *
     * Kept as a test that a bare code buys nothing, which is the property that
     * matters.
     */
    it('ignores a coupon code on its own — the discount must be resolved by the caller', async () => {
      const result = await service.placeOrder({
        customerId: 'cust-2',
        items: [{ productId: 'p2', quantity: 1, price: 200 }],
        subtotal: 200,
        deliveryAddress: 'Addr',
        serviceType: 'grocery',
        paymentMethod: 'cash',
        couponCode: 'SAVE10',
      });

      expect(result.order.discount).toBe(0);
      expect(result.order.totalAmount).toBe(240); // 200 + 40 grocery delivery
    });

    it('applies a discount the caller resolved, clamped to the basket', async () => {
      const result = await service.placeOrder({
        customerId: 'cust-2b',
        items: [{ productId: 'p2', quantity: 1, price: 200 }],
        subtotal: 200,
        discount: 20,
        deliveryAddress: 'Addr',
        serviceType: 'grocery',
        paymentMethod: 'cash',
        couponCode: 'SAVE10',
      });

      expect(result.order.discount).toBe(20);
      expect(result.order.totalAmount).toBe(220); // 200 + 40 delivery - 20 discount
    });

    it('never lets a discount exceed the basket', async () => {
      const result = await service.placeOrder({
        customerId: 'cust-2c',
        items: [{ productId: 'p2', quantity: 1, price: 200 }],
        subtotal: 200,
        discount: 10_000,
        deliveryAddress: 'Addr',
        serviceType: 'grocery',
        paymentMethod: 'cash',
      });

      expect(result.order.discount).toBe(200);
      expect(result.order.totalAmount).toBe(40); // delivery only, never negative
    });

    it('should deduct wallet amount up to (subtotal - discount)', async () => {
      const result = await service.placeOrder({
        customerId: 'cust-3',
        items: [{ productId: 'p3', quantity: 1, price: 100 }],
        deliveryAddress: 'Addr',
        serviceType: 'restaurant',
        paymentMethod: 'wallet',
        walletAmount: 50,
      });

      expect(result.order.walletDeduction).toBe(50);
      expect(result.order.totalAmount).toBe(80); // 100 + 30 restaurant delivery - 0 discount - 50 wallet
    });
  });

  // ── getOrderById ────────────────────────────────────────────────────────────

  describe('getOrderById', () => {
    it('should return cached order from Redis', async () => {
      redis.getJson.mockResolvedValue(MOCK_ORDER);

      const result = await service.getOrderById('ORD-123');

      expect(result).toEqual(MOCK_ORDER);
    });

    it('should throw NotFoundException when order is not in cache or DB', async () => {
      redis.getJson.mockResolvedValue(null);

      await expect(service.getOrderById('UNKNOWN')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateOrderStatus ───────────────────────────────────────────────────────

  describe('updateOrderStatus', () => {
    it('should update status and publish Kafka event', async () => {
      redis.getJson.mockResolvedValue(MOCK_ORDER);

      const result = await service.updateOrderStatus('ORD-123', OrderStatus.CONFIRMED, 'seller-1');

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(kafka.publish).toHaveBeenCalledWith(
        KAFKA_TOPICS.ORDER_STATUS_UPDATED,
        expect.objectContaining({ id: 'ORD-123', status: OrderStatus.CONFIRMED }),
      );
    });
  });

  // ── cancelOrder ─────────────────────────────────────────────────────────────

  describe('cancelOrder', () => {
    it('should cancel a PENDING order', async () => {
      redis.getJson.mockResolvedValue({ ...MOCK_ORDER, status: OrderStatus.PENDING });

      const result = await service.cancelOrder('ORD-123', 'Changed my mind', 'cust-1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw when cancelling an OUT_FOR_DELIVERY order', async () => {
      redis.getJson.mockResolvedValue({ ...MOCK_ORDER, status: OrderStatus.OUT_FOR_DELIVERY });

      await expect(service.cancelOrder('ORD-123', 'Too late', 'cust-1')).rejects.toThrow(
        /Cannot cancel/,
      );
    });

    it('should throw when cancelling a DELIVERED order', async () => {
      redis.getJson.mockResolvedValue({ ...MOCK_ORDER, status: OrderStatus.DELIVERED });

      await expect(service.cancelOrder('ORD-123', 'Regret', 'cust-1')).rejects.toThrow(
        /Cannot cancel/,
      );
    });
  });

  // ── getOrderTracking ────────────────────────────────────────────────────────

  describe('getOrderTracking', () => {
    it('should return tracking data with timeline', async () => {
      redis.getJson
        .mockResolvedValueOnce(MOCK_ORDER)   // order:ORD-123
        .mockResolvedValueOnce(null);          // tracking:ORD-123 (no GPS yet)

      const result = await service.getOrderTracking('ORD-123');

      expect(result.orderId).toBe('ORD-123');
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.timeline).toHaveLength(4);
      expect(result.driver).toBeNull();
    });
  });

  // ── healthCheck ─────────────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('should return service status ok', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('order-service');
    });
  });
});
