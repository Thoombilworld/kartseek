import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './schemas/audit-log.schema';
import { RedisService } from '@app/redis';

/**
 * These tests used to assert the old behaviour: that `logEvent` wrote to Redis
 * under a 24-hour TTL, that `getRecentLogs` read back out of that cache, and
 * that `getLogsByUser` / `getLogsByResource` returned empty arrays. The last two
 * were passing against hardcoded stubs, so the suite was green while the audit
 * trail did not exist. They now assert the durable path.
 */
describe('AuditLogService', () => {
  let service: AuditLogService;
  let redis: jest.Mocked<RedisService>;
  let model: any;

  /** Chainable stand-in for `find().sort().skip().limit().lean()`. */
  const findChain = (rows: any[]) => {
    const chain: any = {};
    chain.sort = jest.fn().mockReturnValue(chain);
    chain.skip = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.lean = jest.fn().mockResolvedValue(rows);
    return chain;
  };

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    model = {
      create: jest.fn().mockImplementation(async (doc: any) => ({
        _id: 'a1b2c3',
        ...doc,
        get: (k: string) => (k === 'createdAt' ? '2026-08-30T00:00:00.000Z' : undefined),
      })),
      find: jest.fn().mockReturnValue(findChain([])),
      countDocuments: jest.fn().mockResolvedValue(0),
      db: { readyState: 1 },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getModelToken(AuditLog.name), useValue: model },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    redis = module.get(RedisService);
  });

  describe('healthCheck', () => {
    it('reports ok when the durable store is connected', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('audit-log-service');
      expect(result.status).toBe('ok');
      expect(result.store.status).toBe('up');
    });

    it('reports degraded when Mongo is not connected', async () => {
      model.db.readyState = 0;
      const result = await service.healthCheck();
      expect(result.status).toBe('degraded');
      expect(result.store.status).toBe('down');
    });
  });

  describe('logEvent', () => {
    it('writes the entry to the immutable collection', async () => {
      const result = await service.logEvent({
        userId: 'admin-1',
        action: 'SELLER_BANNED',
        resource: 'seller',
        resourceId: 's-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { reason: 'Fraud detected' },
      });

      expect(model.create).toHaveBeenCalledTimes(1);
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'SELLER_BANNED',
        actorId: 'admin-1',
        entityType: 'seller',
        entityId: 's-123',
        actorIp: '192.168.1.1',
      }));
      expect(result.success).toBe(true);
      expect(result.logId).toBe('a1b2c3');
    });

    it('accepts the richer gateway shape with before/after state', async () => {
      await service.logEvent({
        actionType: 'grocery.product.approved',
        actorId: 'admin-9',
        actorRole: 'super_admin',
        actorIp: '10.0.0.1',
        entityType: 'GroceryItem',
        entityId: 'p-1',
        oldValue: { approvalStatus: 'PENDING' },
        newValue: { approvalStatus: 'APPROVED' },
        country: 'QA',
        service: 'grocery-service',
      });

      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
        oldValue: { approvalStatus: 'PENDING' },
        newValue: { approvalStatus: 'APPROVED' },
        country: 'QA',
        service: 'grocery-service',
      }));
    });

    it('still records the entry when the recent-activity cache fails', async () => {
      redis.setJson.mockRejectedValueOnce(new Error('redis down'));
      const result = await service.logEvent({ userId: 'u1', action: 'TEST', resource: 'test', ipAddress: '0.0.0.0' });
      expect(result.success).toBe(true);
      expect(model.create).toHaveBeenCalled();
    });

    it('propagates a failed durable write instead of reporting success', async () => {
      model.create.mockRejectedValueOnce(new Error('mongo down'));
      await expect(
        service.logEvent({ userId: 'u1', action: 'TEST', resource: 'test', ipAddress: '0.0.0.0' }),
      ).rejects.toThrow('mongo down');
    });
  });

  describe('getRecentLogs', () => {
    it('reads from the durable store, not the 24-hour cache', async () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({ _id: `L-${i}` }));
      model.find.mockReturnValue(findChain(rows));
      model.countDocuments.mockResolvedValue(100);

      const result = await service.getRecentLogs(2, 20);

      expect(model.find).toHaveBeenCalled();
      expect(result.data).toHaveLength(20);
      expect(result.total).toBe(100);
      expect(result.page).toBe(2);
      expect(redis.getJson).not.toHaveBeenCalled();
    });

    it('returns an empty page when nothing has been recorded', async () => {
      const result = await service.getRecentLogs();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('clamps the page size', async () => {
      const chain = findChain([]);
      model.find.mockReturnValue(chain);
      await service.getRecentLogs(1, 5000);
      expect(chain.limit).toHaveBeenCalledWith(200);
    });
  });

  describe('getLogsByUser', () => {
    it('queries the collection for that actor', async () => {
      model.find.mockReturnValue(findChain([{ _id: 'L-1', actorId: 'admin-1' }]));
      model.countDocuments.mockResolvedValue(1);

      const result = await service.getLogsByUser('admin-1');

      expect(model.find).toHaveBeenCalledWith({ actorId: 'admin-1' });
      expect(result.userId).toBe('admin-1');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getLogsByResource', () => {
    it('queries the collection for that entity', async () => {
      model.find.mockReturnValue(findChain([{ _id: 'L-1' }, { _id: 'L-2' }]));

      const result = await service.getLogsByResource('seller', 's-123');

      expect(model.find).toHaveBeenCalledWith({ entityType: 'seller', entityId: 's-123' });
      expect(result.resource).toBe('seller');
      expect(result.resourceId).toBe('s-123');
      expect(result.total).toBe(2);
    });
  });
});
