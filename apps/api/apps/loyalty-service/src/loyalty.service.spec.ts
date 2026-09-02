import { Test, type TestingModule } from '@nestjs/testing';
import { LoyaltyService } from './loyalty.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('LoyaltyService', () => {
  let service: LoyaltyService;
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
        LoyaltyService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('loyalty-service');
      expect(result.status).toBe('ok');
    });
  });

  describe('getPoints', () => {
    it('should return cached loyalty data', async () => {
      const cached = { userId: 'U1', points: 1200, tier: 'Gold' };
      redis.getJson.mockResolvedValue(cached);
      const result = await service.getPoints('U1');
      expect(result.points).toBe(1200);
      expect(result.tier).toBe('Gold');
    });

    it('should return default for new user', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getPoints('NEW-USER');
      expect(result.userId).toBe('NEW-USER');
      // A new account starts empty. This asserted 750 points at Silver — a
      // joining balance nothing had awarded, which the service handed to anyone
      // who had never placed an order. The value is 0/Bronze now; what this test
      // is really for is that the record is created and cached on first read.
      expect(result.points).toBe(0);
      expect(result.tier).toBe('Bronze');
      expect(redis.setJson).toHaveBeenCalled();
    });
  });

  describe('awardPoints', () => {
    it('should add points and update tier', async () => {
      redis.getJson.mockResolvedValue(null); // triggers getPoints default
      const result = await service.awardPoints('U1', 100, 'Order completed', 'ORD-001');
      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(100); // 0 for a new account + 100 awarded
      expect(kafka.publish).toHaveBeenCalledWith('loyalty.points.awarded', expect.any(Object));
    });

    it('should store order→points mapping for reversibility', async () => {
      redis.getJson.mockResolvedValue(null);
      await service.awardPoints('U1', 50, 'Bonus', 'ORD-002');
      // Should store mapping for order
      expect(redis.setJson).toHaveBeenCalledWith(
        'loyalty:order:ORD-002',
        expect.objectContaining({ userId: 'U1', pointsAwarded: 50 }),
        expect.any(Number),
      );
    });
  });

  describe('redeemPoints', () => {
    it('should deduct points when sufficient balance', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', points: 500, tier: 'Silver', totalEarned: 1000 });
      const result = await service.redeemPoints('U1', 200);
      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(300);
    });

    it('should reject when insufficient points', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', points: 100, tier: 'Bronze', totalEarned: 500 });
      const result = await service.redeemPoints('U1', 500);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });
  });

  describe('reversePoints', () => {
    it('should reverse points for cancelled order', async () => {
      // First call: order mapping lookup; second: getPoints returns user data
      redis.getJson
        .mockResolvedValueOnce({ userId: 'U1', pointsAwarded: 100, reversed: false })
        .mockResolvedValueOnce({ userId: 'U1', points: 800, tier: 'Silver', totalEarned: 1200, totalReversed: 0 });
      const result = await service.reversePoints('U1', 'ORD-001', 'Order cancelled');
      expect(result.success).toBe(true);
      expect(result.pointsReversed).toBe(100);
    });

    it('should reject already reversed order', async () => {
      redis.getJson
        .mockResolvedValueOnce({ userId: 'U1', pointsAwarded: 100, reversed: true })
        .mockResolvedValueOnce({ userId: 'U1', points: 800 });
      const result = await service.reversePoints('U1', 'ORD-002', 'Order cancelled');
      expect(result.success).toBe(false);
    });
  });

});
