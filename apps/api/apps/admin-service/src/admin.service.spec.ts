import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AdminService } from './admin.service';
import { PageLayout } from './entities/page-layout.entity';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('AdminService', () => {
  let service: AdminService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  beforeEach(async () => {
    process.env.SKIP_DB = 'true';
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
    const layoutRepoMock = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(PageLayout), useValue: layoutRepoMock },
        { provide: EntityManager, useValue: null },
        // The revenue report is an RPC to order-service now, so the client is a
        // required dependency of this service.
        { provide: 'ORDER_SERVICE', useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  afterEach(() => {
    delete process.env.SKIP_DB;
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
    });
  });

  describe('getDashboardStats', () => {
    it('should return cached stats if available', async () => {
      const cached = { totalUsers: 100, totalOrders: 200 };
      redis.getJson.mockResolvedValueOnce(cached);
      const result = await service.getDashboardStats();
      expect(result).toEqual(cached);
    });

    // Removed 2026-09-01: `getDashboardStats` no longer aggregates Redis
    // counters — it queries Postgres directly. The test mocked `redis.get` to
    // return '42' and asserted that reached `totalUsers`, which stopped being
    // true when the counters were replaced by a real query, and no adjustment of
    // the number can fix it. Covering the current path needs a database double
    // this suite does not have; it belongs in an integration test rather than
    // here, and leaving a green assertion against a dead code path is worse than
    // leaving the gap visible.
  });

  describe('banUser / unbanUser', () => {
    // `suspended` / `active`, not `BANNED` / `ACTIVE`: the uppercase pair was
    // in no vocabulary the platform reads (`AppStatus` is lowercase), so an
    // unbanned account came back as 'ACTIVE' and was counted by nothing —
    // including the dashboard's own `status = 'active'` filter.
    it('should ban user and publish event', async () => {
      const result = await service.banUser('USER-001', 'Fraud', 'ADMIN-001');
      expect(result.success).toBe(true);
      expect(result.status).toBe('suspended');
      expect(kafka.publish).toHaveBeenCalledWith('admin.user.banned', expect.any(Object));
    });

    it('should unban user', async () => {
      const result = await service.unbanUser('USER-001', 'ADMIN-001');
      expect(result.success).toBe(true);
      expect(result.status).toBe('active');
    });

    // The cases above run with SKIP_DB, where a Redis-only ban is the designed
    // behaviour. With a live DB the write must actually land: it used to be
    // wrapped in a catch that logged a warning and returned success anyway, so a
    // failed or no-op ban was indistinguishable from a completed one.
    describe('with a live database', () => {
      let dbService: AdminService;
      let query: jest.Mock;

      beforeEach(async () => {
        delete process.env.SKIP_DB;
        query = jest.fn().mockResolvedValue([{ id: 'USER-001' }]);
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            AdminService,
            {
              provide: RedisService,
              useValue: {
                setJson: jest.fn().mockResolvedValue('OK'),
                getJson: jest.fn().mockResolvedValue(null),
                del: jest.fn().mockResolvedValue(1),
                set: jest.fn().mockResolvedValue('OK'),
                get: jest.fn().mockResolvedValue('0'),
                keys: jest.fn().mockResolvedValue([]),
              },
            },
            {
              provide: KafkaProducerService,
              useValue: { publish: jest.fn().mockResolvedValue(undefined) },
            },
            {
              provide: getRepositoryToken(PageLayout),
              useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
            },
            { provide: EntityManager, useValue: { query } },
            { provide: 'ORDER_SERVICE', useValue: { send: jest.fn() } },
          ],
        }).compile();
        dbService = module.get<AdminService>(AdminService);
      });

      it('persists the ban and reports success when the row is updated', async () => {
        const result = await dbService.banUser('USER-001', 'Fraud', 'ADMIN-001');

        expect(result.success).toBe(true);
        // RETURNING is what makes a no-op update detectable — `query` discards
        // pg's rowCount, so without it there is nothing to check.
        expect(query.mock.calls[0][0]).toMatch(/RETURNING id/);
      });

      it('fails loudly when the update matches no user', async () => {
        query.mockResolvedValue([]);
        await expect(dbService.banUser('GHOST', 'Fraud', 'ADMIN-001')).rejects.toThrow(
          /not found/i,
        );
      });

      it('fails loudly when the update throws', async () => {
        query.mockRejectedValue(new Error('relation "users" does not exist'));
        await expect(dbService.banUser('USER-001', 'Fraud', 'ADMIN-001')).rejects.toThrow();
      });

      it('applies the same guarantees to unban', async () => {
        query.mockResolvedValue([]);
        await expect(dbService.unbanUser('GHOST', 'ADMIN-001')).rejects.toThrow(/not found/i);
      });
    });
  });

  describe('approveKyc / rejectKyc', () => {
    it('should approve KYC and decrement pending counter', async () => {
      redis.get.mockResolvedValue('5');
      // approveKyc now looks up the pending record before mutating it — a
      // decision with no matching entry must not report success (see
      // admin.scope.spec.ts for the market-scope check this same lookup
      // enables); this test's entity id needs a record to find.
      redis.getJson.mockResolvedValue({ id: 'SELLER-001', submittedAt: new Date().toISOString() });
      const result = await service.approveKyc('SELLER-001', 'seller', 'ADMIN-001');
      expect(result.success).toBe(true);
      expect(result.status).toBe('APPROVED');
      expect(redis.del).toHaveBeenCalled();
    });

    it('should reject KYC with reason', async () => {
      redis.get.mockResolvedValue('3');
      redis.getJson.mockResolvedValue({ id: 'SELLER-002', submittedAt: new Date().toISOString() });
      const result = await service.rejectKyc(
        'SELLER-002',
        'seller',
        'ADMIN-001',
        'Invalid documents',
      );
      expect(result.success).toBe(true);
      expect(result.status).toBe('REJECTED');
    });

    it('reports not found rather than a fabricated success when nothing is pending', async () => {
      redis.getJson.mockResolvedValue(null);
      await expect(service.approveKyc('GHOST', 'seller', 'ADMIN-001')).rejects.toThrow(
        /not found|no pending/i,
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should return empty logs for fresh system', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getAuditLogs();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by action', async () => {
      redis.getJson.mockResolvedValue([
        { id: 'A1', action: 'BAN', timestamp: new Date().toISOString() },
        { id: 'A2', action: 'KYC_APPROVE', timestamp: new Date().toISOString() },
      ]);
      const result = await service.getAuditLogs(1, 50, { action: 'BAN' });
      expect(result.data.length).toBe(1);
    });
  });

  describe('addAuditLog', () => {
    it('should create audit log entry', async () => {
      redis.getJson.mockResolvedValue([]);
      const result = await service.addAuditLog({
        action: 'BAN_USER',
        adminId: 'ADMIN-001',
        entityType: 'user',
        entityId: 'USER-001',
      });
      expect(result.success).toBe(true);
      expect(result.logId).toMatch(/^AUDIT-/);
    });
  });

  describe('getUsersList', () => {
    it('should return empty list with Redis fallback', async () => {
      redis.getJson.mockResolvedValue([]);
      const result = await service.getUsersList(1, 20);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by role', async () => {
      redis.getJson.mockResolvedValue([
        { name: 'John', role: 'seller' },
        { name: 'Jane', role: 'customer' },
      ]);
      const result = await service.getUsersList(1, 20, 'seller');
      expect(result.data.length).toBe(1);
    });
  });

  describe('getLayout / saveLayout', () => {
    it('should return default empty layout', async () => {
      const result = await service.getLayout('marketplace', 'home');
      expect(result.sections).toEqual([]);
    });
  });
});
