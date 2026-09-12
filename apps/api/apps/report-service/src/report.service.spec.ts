import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ReportService, ReportType } from './report.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('ReportService', () => {
  let service: ReportService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('0'),
      keys: jest.fn().mockResolvedValue([]),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
    });
  });

  describe('generateRevenueReport', () => {
    it('should return cached report if available', async () => {
      const cached = { reportType: 'revenue', totalRevenue: 50000 };
      redis.getJson.mockResolvedValueOnce(cached);
      const result = await service.generateRevenueReport('2026-07-01', '2026-07-07');
      expect(result.cached).toBe(true);
    });

    it('should generate daily revenue report', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      const result = await service.generateRevenueReport('2026-07-01', '2026-07-03');
      expect(result.reportType).toBe(ReportType.REVENUE);
      expect(result.data.length).toBe(3); // 3 days
      expect(result.cached).toBe(false);
    });

    it('should include module breakdown', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      const result = await service.generateRevenueReport('2026-07-01', '2026-07-01');
      expect(result.moduleBreakdown).toBeDefined();
      expect(result.moduleBreakdown.marketplace).toBeDefined();
    });

    /**
     * The counters this report sums have a GLOBAL bucket and no per-market one,
     * so a scoped caller cannot be answered from them at all (audit AUD2-096).
     * Nothing forwards a scope here today; the guard is what makes wiring one
     * later safe, and reading Redis at all before refusing would already be a
     * platform aggregate computed on a regional admin's behalf.
     */
    it('refuses a scoped caller before reading a single counter', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      await expect(
        service.generateRevenueReport('2026-07-01', '2026-07-03', 'day', 'QA'),
      ).rejects.toThrow(ForbiddenException);
      expect(redis.getJson).not.toHaveBeenCalled();
      expect(redis.get).not.toHaveBeenCalled();
    });
  });

  describe('generateOrderReport', () => {
    it('should generate order report with status distribution', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      const result = await service.generateOrderReport('2026-07-01', '2026-07-02');
      expect(result.reportType).toBe(ReportType.ORDERS);
      expect(result.statusDistribution).toBeDefined();
    });

    it('should filter by service type', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      const result = await service.generateOrderReport('2026-07-01', '2026-07-01', 'grocery');
      expect(result.serviceType).toBe('grocery');
    });
  });

  describe('generateSellerReport', () => {
    it('should return seller performance metrics', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.keys.mockResolvedValue([]);
      const result = await service.generateSellerReport('SELLER-001', 'month');
      expect(result.reportType).toBe(ReportType.SELLER);
      expect(result.sellerId).toBe('SELLER-001');
      expect(result.lifetime).toBeDefined();
      expect(result.periodMetrics).toBeDefined();
    });
  });

  describe('generateDriverReport', () => {
    it('should return driver performance metrics', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.keys.mockResolvedValue([]);
      const result = await service.generateDriverReport('DRIVER-001', 'week');
      expect(result.reportType).toBe(ReportType.DRIVER);
      expect(result.trips).toBeDefined();
      expect(result.earnings).toBeDefined();
    });
  });

  describe('generateUserAcquisitionReport', () => {
    it('should return user acquisition data', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      const result = await service.generateUserAcquisitionReport('2026-07-01', '2026-07-03');
      expect(result.reportType).toBe(ReportType.USER_ACQUISITION);
      expect(result.data.length).toBe(3);
    });
  });

  describe('generateModulePerformanceReport', () => {
    it('should compare all modules', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      const result = await service.generateModulePerformanceReport('month');
      expect(result.modules.length).toBe(7);
      expect(result.modules[0]).toHaveProperty('revenueShare');
    });
  });

  describe('scheduleReport', () => {
    it('should create a report schedule', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.scheduleReport({
        reportType: 'revenue',
        schedule: 'weekly',
        recipients: ['admin@kartseek.com'],
        parameters: { groupBy: 'day' },
      });
      expect(result.success).toBe(true);
      expect(result.scheduleId).toMatch(/^SCHED-/);
      expect(result.nextRun).toBeDefined();
    });
  });

  describe('cancelScheduledReport', () => {
    it('should cancel an active schedule', async () => {
      redis.getJson
        .mockResolvedValueOnce({ id: 'SCHED-001', active: true }) // schedule
        .mockResolvedValueOnce(['SCHED-001']); // active list
      const result = await service.cancelScheduledReport('SCHED-001');
      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
    });

    it('should return error for non-existent schedule', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.cancelScheduledReport('SCHED-999');
      expect(result.success).toBe(false);
    });
  });
});
