import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('WalletService', () => {
  let service: WalletService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let txnRepo: any;

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const repoMock = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      // The balance is read from the latest ledger row now, not a cached default.
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-uuid', ...entity })),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(WalletTransaction), useValue: repoMock },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    txnRepo = module.get(getRepositoryToken(WalletTransaction));
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
    });
  });

  describe('getWallet', () => {
    it('should return cached wallet', async () => {
      const wallet = { userId: 'U1', balance: 1000, currency: 'INR', status: 'ACTIVE', frozen: false };
      redis.getJson.mockResolvedValue(wallet);
      const result = await service.getWallet('U1');
      expect(result.balance).toBe(1000);
    });

    it('gives a brand-new user a zero balance, not an invented one', async () => {
      // This asserted `balance === 500`, matching a `// TODO: … for now seed a
      // default` that handed every wallet in the platform ₹500 it did not have.
      // The balance now comes from the transaction ledger, and a user with no
      // transactions has nothing.
      redis.getJson.mockResolvedValue(null);
      txnRepo.findOne.mockResolvedValue(null);

      const result = await service.getWallet('NEW-USER');
      expect(result.balance).toBe(0);
      expect(result.currency).toBe('INR');
      expect(redis.setJson).toHaveBeenCalled();
    });

    it('derives the balance from the most recent transaction', async () => {
      redis.getJson.mockResolvedValue(null);
      txnRepo.findOne.mockResolvedValue({
        balanceAfter: '2450.75', currency: 'INR', createdAt: new Date(),
      });

      const result = await service.getWallet('U-LEDGER');
      expect(result.balance).toBe(2450.75);
    });

    it('reports a frozen wallet as frozen', async () => {
      // The freeze flag used to live inside the 300-second cached wallet object,
      // so a wallet an admin froze silently thawed five minutes later.
      redis.getJson.mockImplementation(async (key: string) =>
        key === 'wallet:frozen:U-FROZEN' ? true : null);
      txnRepo.findOne.mockResolvedValue(null);

      const result = await service.getWallet('U-FROZEN');
      expect(result.frozen).toBe(true);
      expect(result.status).toBe('FROZEN');
    });
  });

  describe('credit', () => {
    it('should credit wallet and persist transaction', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 1000, currency: 'INR', frozen: false });

      const result = await service.credit('U1', 500, 'Top-up', 'REF-001');
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1500);
      expect(txnRepo.create).toHaveBeenCalled();
      expect(kafka.publish).toHaveBeenCalledWith('wallet.credited', expect.any(Object));
    });

    it('should block credit to frozen wallet (non-refund)', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 1000, frozen: true });

      const result = await service.credit('U1', 200, 'Promo');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('frozen');
    });

    it('should allow refund credit to frozen wallet', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 1000, currency: 'INR', frozen: true });

      const result = await service.credit('U1', 200, 'Refund', 'ORD-001');
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1200);
    });
  });

  describe('debit', () => {
    it('should debit wallet successfully', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 1000, currency: 'INR', frozen: false });

      const result = await service.debit('U1', 300, 'Order Payment', 'ORD-001');
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(700);
    });

    it('should reject debit on insufficient balance', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 100, frozen: false });

      const result = await service.debit('U1', 500, 'Order Payment');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    it('should block debit on frozen wallet', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 1000, frozen: true });

      const result = await service.debit('U1', 200, 'Order');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('frozen');
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transaction history', async () => {
      txnRepo.findAndCount.mockResolvedValue([
        [{ id: 'TXN-1', amount: 100 }], 1,
      ]);
      const result = await service.getTransactions('U1', 1, 20);
      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
    });
  });

  describe('freezeWallet / unfreezeWallet', () => {
    it('should freeze wallet', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 1000, frozen: false });
      const result = await service.freezeWallet('U1', 'Suspicious activity', 'ADMIN-001');
      expect(result.success).toBe(true);
      expect(result.frozen).toBe(true);
      expect(kafka.publish).toHaveBeenCalledWith('wallet.frozen', expect.any(Object));
    });

    it('should unfreeze wallet', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 1000, frozen: true });
      const result = await service.unfreezeWallet('U1', 'Verified', 'ADMIN-001');
      expect(result.success).toBe(true);
      expect(result.frozen).toBe(false);
    });
  });

  describe('handleRefundApproved', () => {
    it('should auto-credit wallet on refund approval', async () => {
      redis.getJson.mockResolvedValue({ userId: 'U1', balance: 500, currency: 'INR', frozen: false });

      const result = await service.handleRefundApproved({
        orderId: 'ORD-001', userId: 'U1', amount: 200,
      });
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(700);
    });
  });
});
