import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('CommissionService', () => {
  let service: CommissionService;
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
        CommissionService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
    });
  });

  describe('calculateCommission', () => {
    it('should calculate commission with default rate for new sellers', async () => {
      // Mock seller stats as new seller (0 orders)
      redis.getJson.mockResolvedValueOnce(null) // rate config override
        .mockResolvedValueOnce({ totalOrders: 0, totalCommission: 0, totalEarnings: 0 }) // seller stats (called inside getSellerStats)
        .mockResolvedValueOnce(null); // rate config override

      const result = await service.calculateCommission('ORD-001', 'SELLER-001', 1000, 'marketplace');
      expect(result.commissionAmount).toBeGreaterThan(0);
      expect(result.sellerEarning).toBeLessThan(1000);
      expect(result.commissionAmount + result.sellerEarning).toBeLessThanOrEqual(1000);
      expect(kafka.publish).toHaveBeenCalledWith('commission.calculated', expect.any(Object));
    });

    it('should apply lower rate for established sellers', async () => {
      redis.getJson.mockResolvedValueOnce(null) // rate config
        .mockResolvedValueOnce({ totalOrders: 500, totalCommission: 0, totalEarnings: 0 }); // established seller

      const result = await service.calculateCommission('ORD-002', 'SELLER-002', 1000, 'marketplace');
      // 500+ orders should get 10% rate
      expect(result.rate).toBeLessThanOrEqual(0.12);
    });

    it('should store commission in Redis', async () => {
      redis.getJson.mockResolvedValue(null);
      await service.calculateCommission('ORD-003', 'SELLER-003', 500, 'grocery');
      expect(redis.setJson).toHaveBeenCalledWith(
        expect.stringContaining('commission:ORD-003'),
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  describe('getCommissionByOrder', () => {
    it('should return commission when found', async () => {
      redis.getJson.mockResolvedValue({ orderId: 'ORD-001', commissionAmount: 120 });
      const result = await service.getCommissionByOrder('ORD-001');
      expect(result.success).toBe(true);
    });

    it('should return error when not found', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getCommissionByOrder('ORD-999');
      expect(result.success).toBe(false);
    });
  });

  describe('getSellerCommissions', () => {
    it('should paginate seller commission history', async () => {
      const history = Array.from({ length: 30 }, (_, i) => ({ id: `COM-${i}`, amount: 100 }));
      redis.getJson.mockResolvedValue(history);

      const result = await service.getSellerCommissions('SELLER-001', 1, 10);
      expect(result.data.length).toBe(10);
      expect(result.total).toBe(30);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getCommissionRates', () => {
    it('should return default rates when no overrides exist', async () => {
      redis.getJson.mockResolvedValue(null);
      const rates = await service.getCommissionRates();
      expect(rates.marketplace).toBeDefined();
      expect(rates.grocery).toBeDefined();
      expect(rates.restaurant).toBeDefined();
      expect(rates.marketplace.tierRates.length).toBeGreaterThan(0);
    });
  });
});
