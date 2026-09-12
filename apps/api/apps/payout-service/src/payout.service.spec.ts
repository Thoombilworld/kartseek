import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { PayoutService, PayoutStatus, PayoutMethod } from './payout.service';
import { SellerWallet } from './entities/seller-wallet.entity';
import { Payout } from './entities/payout.entity';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('PayoutService', () => {
  let service: PayoutService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let walletRepo: any;
  let payoutRepo: any;
  let dataSource: any;

  const mockWallet = { sellerId: 'S1', availableBalance: 5000, escrowBalance: 1000 };

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
    const repoMock = {
      findOne: jest.fn().mockResolvedValue({ ...mockWallet }),
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    dataSource = { query: jest.fn().mockResolvedValue([{ region_code: 'QA' }]) };

    // Payout records moved from Redis (90-day TTL) to `payout.payouts`.
    payoutRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        // The market predicate is always an `andWhere`: `where` replaces the
        // clause, which is how a hand-written predicate came to be discarded.
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(SellerWallet), useValue: repoMock },
        { provide: getRepositoryToken(Payout), useValue: payoutRepo },
        // `sellerMarket()` reads `marketplace.sellers` through the connection:
        // the sellers table is another service's and this one owns no entity
        // for it. A market the seller row cannot supply stays null, which keeps
        // the payout refused for a locked admin.
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<PayoutService>(PayoutService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    walletRepo = module.get(getRepositoryToken(SellerWallet));
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
    });
  });

  describe('createPayoutRequest', () => {
    it('should create payout request with sufficient balance', async () => {
      const result = await service.createPayoutRequest({
        sellerId: 'S1',
        amount: 2000,
        method: PayoutMethod.BANK,
        bankAccount: '123456789',
      });
      expect(result.success).toBe(true);
      expect(result.payout).toBeDefined();
      expect(result.payout!.id).toMatch(/^PAYOUT-/);
      expect(result.payout!.status).toBe(PayoutStatus.PENDING);
      expect(kafka.publish).toHaveBeenCalledWith('payout.requested', expect.any(Object));
    });

    it('should reject when insufficient balance', async () => {
      walletRepo.findOne.mockResolvedValue({
        sellerId: 'S1',
        availableBalance: 500,
        escrowBalance: 0,
      });
      const result = await service.createPayoutRequest({
        sellerId: 'S1',
        amount: 2000,
        method: PayoutMethod.BANK,
        bankAccount: '123',
      });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    it('should reject below minimum payout amount', async () => {
      const result = await service.createPayoutRequest({
        sellerId: 'S1',
        amount: 50,
        method: PayoutMethod.UPI,
        upiId: '254700000000',
      });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Minimum');
    });
  });

  // These used to drive the service by mocking Redis keys, because payouts were
  // stored there under a 90-day TTL. They are rows in `payout.payouts` now, so
  // the repository is what the tests set up.
  const row = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'PAYOUT-001',
    sellerId: 'S1',
    amount: 1000,
    method: 'bank',
    bankAccount: null as string | null,
    ifscCode: null as string | null,
    upiId: null as string | null,
    status: PayoutStatus.PENDING,
    requestedAt: new Date(),
    processedBy: null as string | null,
    processedAt: null as Date | null,
    failureReason: null as string | null,
    transactionRef: null as string | null,
    ...over,
  });

  describe('approvePayout', () => {
    it('should approve a pending payout', async () => {
      payoutRepo.findOne.mockResolvedValue(row());

      const result = await service.approvePayout('PAYOUT-001', 'ADMIN-001');
      expect(result.success).toBe(true);
      expect(result.status).toBe(PayoutStatus.APPROVED);
      // The decision has to be written, not just returned.
      expect(payoutRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PayoutStatus.APPROVED, processedBy: 'ADMIN-001' }),
      );
    });

    it('should reject approving non-pending payout', async () => {
      payoutRepo.findOne.mockResolvedValue(
        row({ id: 'PAYOUT-002', status: PayoutStatus.PROCESSED }),
      );
      const result = await service.approvePayout('PAYOUT-002', 'ADMIN-001');
      expect(result.success).toBe(false);
    });

    it('should reject approving a payout that does not exist', async () => {
      payoutRepo.findOne.mockResolvedValue(null);
      const result = await service.approvePayout('PAYOUT-missing', 'ADMIN-001');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('getSellerPayouts', () => {
    it('should return seller payouts with wallet balance', async () => {
      payoutRepo.findAndCount.mockResolvedValue([
        [
          row({ id: 'PAYOUT-1', amount: 1000, status: PayoutStatus.PROCESSED }),
          row({ id: 'PAYOUT-2', amount: 2000, status: PayoutStatus.PENDING }),
        ],
        2,
      ]);

      const result = await service.getSellerPayouts('S1');
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.wallet).toBeDefined();
      expect(result.wallet.availableBalance).toBe(5000);
      // Scoped to this seller by the query, not by filtering in memory.
      expect(payoutRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sellerId: 'S1' }) }),
      );
    });
  });

  describe('getPendingPayouts', () => {
    it('should return pending payouts oldest first', async () => {
      // A query builder rather than `findAndCount`, because the market has to
      // be a predicate the page is built from, not a filter applied after
      // `take(limit)` — see `getPendingPayouts`.
      const qb = payoutRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[row({ id: 'PAYOUT-1', amount: 3000 })], 1]);
      qb.getRawOne.mockResolvedValue({ sum: '3000' });

      const result = await service.getPendingPayouts();
      expect(result.total).toBe(1);
      expect(result.totalAmount).toBe(3000);
      expect(qb.orderBy).toHaveBeenCalledWith('p.requestedAt', 'ASC');
    });
  });

  describe('escrow management', () => {
    it('should hold escrow in seller wallet', async () => {
      const result = await service.holdEscrowInSellerWallet('S1', 500);
      expect(result.escrowBalance).toBe(1500); // 1000 + 500
    });

    it('releases escrow in full — commission is not charged twice', async () => {
      // This asserted a 5% cut taken *here* (1000 → 950), on top of whatever
      // commission-service had already charged for the same order. A seller was
      // billed twice: once at the real category rate, and again at a flat 5%
      // from `DEFAULT_COMMISSION_RATE` that appeared on no statement.
      // Commission belongs to commission-service; this only moves money.
      const result = await service.releaseEscrowToSellerWallet('S1', 1000);
      expect(result.escrowBalance).toBe(0); // 1000 − 1000
      expect(result.availableBalance).toBe(6000); // 5000 + 1000, no second cut
    });

    it('credits a seller wallet for a settled order', async () => {
      const result = await service.creditSellerWallet('S1', 250.5, 'Order settled', 'ORD-1');
      expect(result.success).toBe(true);
      expect(result.availableBalance).toBe(5250.5);
    });

    it('refuses a non-positive credit', async () => {
      const result = await service.creditSellerWallet('S1', 0, 'nothing', 'ORD-2');
      expect(result.success).toBe(false);
    });
  });
});
