import { Test, type TestingModule } from '@nestjs/testing';
import { RefundService, RefundStatus, RefundReason } from './refund.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('RefundService', () => {
  let service: RefundService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('requestRefund', () => {
    it('should create a full refund request', async () => {
      redis.getJson.mockResolvedValue(null); // no existing refunds
      const result = await service.requestRefund({
        orderId: 'ORD-001', userId: 'USER-001', amount: 500, reason: RefundReason.DAMAGED,
      });
      expect(result.success).toBe(true);
      expect(result.refund).toBeDefined();
      expect(result.refund!.id).toMatch(/^RFD-/);
      expect(result.refund!.status).toBe(RefundStatus.PENDING);
      expect(result.refund!.isPartial).toBe(false);
      expect(kafka.publish).toHaveBeenCalledWith('refund.requested', expect.any(Object));
    });

    it('should create a partial refund for specific items', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.requestRefund({
        orderId: 'ORD-002', userId: 'USER-001', amount: 300,
        reason: RefundReason.MISSING_ITEMS,
        items: [{ itemId: 'ITEM-1', quantity: 1, amount: 200 }, { itemId: 'ITEM-2', quantity: 1, amount: 100 }],
      });
      expect(result.success).toBe(true);
      expect(result.refund).toBeDefined();
      expect(result.refund!.isPartial).toBe(true);
      expect(result.refund!.amount).toBe(300); // 200 + 100
    });

    it('should reject duplicate pending refund', async () => {
      redis.getJson.mockResolvedValue([]); // order refund index empty initially
      // First refund
      await service.requestRefund({
        orderId: 'ORD-003', userId: 'USER-001', amount: 100, reason: RefundReason.OTHER,
      });

      // Mock existing pending refund for second call
      redis.getJson.mockImplementation(async (key: string) => {
        if (key.includes('refund:index:order:ORD-003')) {
          return ['RFD-existing'];
        }
        if (key.includes('refund:RFD-existing')) {
          return { id: 'RFD-existing', status: RefundStatus.PENDING };
        }
        return null;
      });

      const result = await service.requestRefund({
        orderId: 'ORD-003', userId: 'USER-001', amount: 100, reason: RefundReason.OTHER,
      });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('pending refund');
    });
  });

  describe('processRefund', () => {
    it('should approve a pending refund', async () => {
      redis.getJson.mockResolvedValue({
        id: 'RFD-001', orderId: 'ORD-001', userId: 'USER-001', amount: 500,
        status: RefundStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        statusHistory: [],
      });

      const result = await service.processRefund('RFD-001', 'ADMIN-001', 'APPROVED', 'Verified');
      expect(result.success).toBe(true);
      expect(result.status).toBe('APPROVED');
      expect(kafka.publish).toHaveBeenCalledWith('refund.approved', expect.objectContaining({ amount: 500 }));
    });

    it('should reject processing of already processed refund', async () => {
      redis.getJson.mockResolvedValue({
        id: 'RFD-002', status: RefundStatus.APPROVED, statusHistory: [],
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await service.processRefund('RFD-002', 'ADMIN-001', 'APPROVED');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Cannot process');
    });

    it('should handle expired refunds', async () => {
      redis.getJson.mockResolvedValue({
        id: 'RFD-003', status: RefundStatus.PENDING,
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // already expired
        statusHistory: [],
      });

      const result = await service.processRefund('RFD-003', 'ADMIN-001', 'APPROVED');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('expired');
    });
  });

  describe('getRefundById', () => {
    it('should return refund when found', async () => {
      redis.getJson.mockResolvedValue({ id: 'RFD-001', amount: 500 });
      const result = await service.getRefundById('RFD-001');
      expect(result.success).toBe(true);
    });

    it('should return error when not found', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getRefundById('RFD-999');
      expect(result.success).toBe(false);
    });
  });

  describe('getRefundsByOrder', () => {
    it('should return all refunds for an order', async () => {
      redis.getJson.mockImplementation(async (key: string) => {
        if (key.includes('index:order')) return ['RFD-1', 'RFD-2'];
        if (key.includes('RFD-1')) return { id: 'RFD-1', amount: 100 };
        if (key.includes('RFD-2')) return { id: 'RFD-2', amount: 200 };
        return null;
      });

      const result = await service.getRefundsByOrder('ORD-001');
      expect(result.total).toBe(2);
      expect(result.refunds.length).toBe(2);
    });
  });

  describe('getRefundStats', () => {
    it('should aggregate refund statistics', async () => {
      redis.keys.mockResolvedValue(['refund:RFD-1', 'refund:RFD-2', 'refund:RFD-3']);
      redis.getJson
        .mockResolvedValueOnce({ id: 'RFD-1', status: RefundStatus.PENDING, amount: 100 })
        .mockResolvedValueOnce({ id: 'RFD-2', status: RefundStatus.APPROVED, amount: 200 })
        .mockResolvedValueOnce({ id: 'RFD-3', status: RefundStatus.REJECTED, amount: 150 });

      const stats = await service.getRefundStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });
});
