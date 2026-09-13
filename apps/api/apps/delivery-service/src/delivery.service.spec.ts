import { Test, type TestingModule } from '@nestjs/testing';
import { DeliveryService, PartnerStatus, DeliveryStatus } from './delivery.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      scanKeys: jest.fn().mockResolvedValue([]),
      georadius: jest.fn().mockResolvedValue([]),
      geoadd: jest.fn().mockResolvedValue(1),
      geodel: jest.fn().mockResolvedValue(undefined),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('healthCheck', () => {
    it('should return service status ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('delivery-service');
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('assignDeliveryPartner', () => {
    it('should assign a fallback partner when no geo data available', async () => {
      const result = await service.assignDeliveryPartner('ORD-001', 'marketplace');
      expect(result.success).toBe(true);
      expect(result.assignment.orderId).toBe('ORD-001');
      expect(result.assignment.status).toBe(DeliveryStatus.ASSIGNED);
      expect(result.assignment.partnerId).toMatch(/^DP-/);
      expect(kafka.publish).toHaveBeenCalledWith('delivery.partner.assigned', expect.any(Object));
    });

    it('should try geo search when coordinates are provided', async () => {
      redis.georadius.mockResolvedValue([{ member: 'DP-100', dist: 2.5, lat: 0, lng: 0 }]);
      redis.get.mockResolvedValue(null); // Partner status IDLE (null = new)

      const result = await service.assignDeliveryPartner('ORD-002', 'grocery', -1.28, 36.82);
      expect(result.success).toBe(true);
      expect(result.assignment.partnerId).toBe('DP-100');
      expect(result.assignment.distanceKm).toBe(2.5);
    });

    it('should skip busy partners and find idle one', async () => {
      redis.georadius.mockResolvedValue([
        { member: 'DP-200', dist: 1.0, lat: 0, lng: 0 },
        { member: 'DP-201', dist: 2.0, lat: 0, lng: 0 },
      ]);
      redis.get
        .mockResolvedValueOnce(PartnerStatus.EN_ROUTE_PICKUP) // DP-200 busy
        .mockResolvedValueOnce(null); // DP-201 idle

      const result = await service.assignDeliveryPartner('ORD-003', 'restaurant', -1.28, 36.82);
      expect(result.success).toBe(true);
      expect(result.assignment.partnerId).toBe('DP-201');
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should reject invalid status transition', async () => {
      redis.getJson.mockResolvedValue({
        orderId: 'ORD-001',
        status: DeliveryStatus.ASSIGNED,
        statusHistory: [],
      });

      const result = await service.updateDeliveryStatus(
        'ORD-001',
        DeliveryStatus.DELIVERED,
        'DP-100',
      );
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Cannot transition');
    });

    it('should allow valid status transition ASSIGNED → PICKED_UP', async () => {
      redis.getJson.mockResolvedValue({
        orderId: 'ORD-001',
        partnerId: 'DP-100',
        status: DeliveryStatus.ASSIGNED,
        statusHistory: [{ status: DeliveryStatus.ASSIGNED, timestamp: new Date().toISOString() }],
      });

      const result = await service.updateDeliveryStatus(
        'ORD-001',
        DeliveryStatus.PICKED_UP,
        'DP-100',
      );
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalledWith('delivery.status.updated', expect.any(Object));
    });

    it('should return error when assignment not found', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.updateDeliveryStatus(
        'ORD-999',
        DeliveryStatus.PICKED_UP,
        'DP-100',
      );
      expect(result.success).toBe(false);
    });
  });

  describe('estimateDeliveryFee', () => {
    it('should calculate correct fee for marketplace', async () => {
      const result = await service.estimateDeliveryFee(5, undefined, 'marketplace');
      expect(result.fee).toBe(60 + 5 * 12); // base + distance
      expect(result.breakdown.base).toBe(60);
      expect(result.breakdown.weight).toBe(0);
    });

    it('should add weight surcharge for heavy items', async () => {
      const result = await service.estimateDeliveryFee(5, 8, 'marketplace');
      expect(result.breakdown.weight).toBe(60); // (8 - 5) * 20
    });

    it('should use restaurant rates for restaurant service', async () => {
      const result = await service.estimateDeliveryFee(3, undefined, 'restaurant');
      expect(result.breakdown.base).toBe(30);
      expect(result.fee).toBe(30 + 3 * 15);
    });
  });

  describe('getPartnerActiveDeliveries', () => {
    it('should return empty list when no active deliveries', async () => {
      redis.scanKeys.mockResolvedValue([]);
      const result = await service.getPartnerActiveDeliveries('DP-100');
      expect(result.activeCount).toBe(0);
      expect(result.deliveries).toEqual([]);
    });
  });

  describe('setPartnerStatus', () => {
    it('should set partner status and publish event', async () => {
      const result = await service.setPartnerStatus('DP-100', PartnerStatus.IDLE);
      expect(result.success).toBe(true);
      expect(redis.set).toHaveBeenCalled();
      expect(kafka.publish).toHaveBeenCalledWith(
        'delivery.partner.status_changed',
        expect.any(Object),
      );
    });

    it('should remove from geo index when going OFFLINE', async () => {
      await service.setPartnerStatus('DP-100', PartnerStatus.OFFLINE);
      expect(redis.geodel).toHaveBeenCalledWith('delivery:partners:locations', 'DP-100');
    });
  });
});
