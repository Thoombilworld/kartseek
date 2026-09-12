import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { PayoutService, PayoutStatus, PayoutMethod } from './payout.service';
import { SellerWallet } from './entities/seller-wallet.entity';
import { Payout } from './entities/payout.entity';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

/**
 * Payouts carry a market, so the routes over them filter instead of refusing.
 *
 * `GET /admin/marketplace/payouts` and the five decisions beside it called
 * `refuseLockedAdmin` before any RPC, because `payout.payouts` carried no
 * market and forwarding `scope` to a service that ignored it would have been
 * enforcement in name only (2026-09-12 audit §3(b) / AUD2-089). The column
 * exists now, and this spec is the proof that:
 *
 *   • the market is stamped from the SELLER, never from the request — a market
 *     a caller supplies is a market a caller chose;
 *   • the list is a predicate, not a post-filter;
 *   • a decision on another market's payout is refused by the ROW, so the TCP
 *     pattern stands on its own without the gateway in front of it;
 *   • an unattributed payout stays refused, which is what the routes did before
 *     and is the direction that cannot leak.
 */
describe('payout market scope', () => {
  let service: PayoutService;
  let walletRepo: any;
  let payoutRepo: any;
  let dataSource: any;
  let qb: any;

  const wallet = (over: Partial<SellerWallet> = {}) => ({
    sellerId: 'S1',
    availableBalance: 5000,
    escrowBalance: 0,
    regionCode: 'QA',
    ...over,
  });

  const payout = (over: Record<string, unknown> = {}) => ({
    id: 'PAYOUT-1',
    sellerId: 'S1',
    amount: 500,
    method: PayoutMethod.BANK,
    bankAccount: null,
    ifscCode: null,
    upiId: null,
    status: PayoutStatus.PENDING,
    requestedAt: new Date('2026-09-01T00:00:00Z'),
    processedBy: null,
    processedAt: null,
    failureReason: null,
    transactionRef: null,
    regionCode: 'QA',
    ...over,
  });

  beforeEach(async () => {
    qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn(() => {
        throw new Error('where() replaces the clause — the predicate must be andWhere');
      }),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    // `getPendingPayouts` opens the query with `.where('p.status = …')`, which
    // is legitimate — it is the first clause. Only the MARKET must never use
    // it, so the status call is allowed through and every later one is an
    // `andWhere` the mock records.
    qb.where = jest.fn().mockReturnValue(qb);

    walletRepo = {
      findOne: jest.fn().mockResolvedValue(wallet()),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
    };
    payoutRepo = {
      findOne: jest.fn().mockResolvedValue(payout()),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    dataSource = { query: jest.fn().mockResolvedValue([{ region_code: 'QA' }]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        {
          provide: RedisService,
          useValue: { getJson: jest.fn(), setJson: jest.fn(), del: jest.fn(), keys: jest.fn() },
        },
        { provide: KafkaProducerService, useValue: { publish: jest.fn() } },
        { provide: getRepositoryToken(SellerWallet), useValue: walletRepo },
        { provide: getRepositoryToken(Payout), useValue: payoutRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();
    service = module.get(PayoutService);
  });

  describe('the market is stamped from the seller', () => {
    it('takes it from the wallet, not from anything the caller sent', async () => {
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: 'QA' }));
      await service.createPayoutRequest({
        sellerId: 'S1',
        amount: 500,
        method: PayoutMethod.BANK,
        // A caller-supplied market must be ignored outright.
        ...({ regionCode: 'IN' } as any),
      });
      expect(payoutRepo.create).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'QA' }));
    });

    it('falls back to the sellers table when the wallet has no market yet', async () => {
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: null }));
      dataSource.query.mockResolvedValue([{ region_code: 'in' }]);
      await service.createPayoutRequest({ sellerId: 'S1', amount: 500, method: PayoutMethod.BANK });
      expect(payoutRepo.create).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'IN' }));
    });

    it('leaves it null when the seller has no usable market, rather than guessing', async () => {
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: null }));
      // Dev data holds `NOT-A-COUNTRY`; truncating that to a varchar(2) would
      // invent `NO`, which is Norway.
      dataSource.query.mockResolvedValue([{ region_code: 'NOT-A-COUNTRY' }]);
      await service.createPayoutRequest({ sellerId: 'S1', amount: 500, method: PayoutMethod.BANK });
      expect(payoutRepo.create).toHaveBeenCalledWith(expect.objectContaining({ regionCode: null }));
    });

    it('still accepts a stored sub-region, normalised to its country', async () => {
      // Restaurant and friends store 'QA-DOH'; the guard above must reject
      // invented markets without rejecting this, which is a real spelling.
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: null }));
      dataSource.query.mockResolvedValue([{ region_code: 'QA-DOH' }]);
      await service.createPayoutRequest({ sellerId: 'S1', amount: 500, method: PayoutMethod.BANK });
      expect(payoutRepo.create).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'QA' }));
    });

    it('survives an unreachable sellers table with the row left unattributed', async () => {
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: null }));
      dataSource.query.mockRejectedValue(
        new Error('relation "marketplace.sellers" does not exist'),
      );
      const result = await service.createPayoutRequest({
        sellerId: 'S1',
        amount: 500,
        method: PayoutMethod.BANK,
      });
      expect(result.success).toBe(true);
      expect(payoutRepo.create).toHaveBeenCalledWith(expect.objectContaining({ regionCode: null }));
    });

    it('attributes a wallet that predates the column, so payouts and wallets agree', async () => {
      // AUD2-086: marketplace-service already answers seller-wallets predicated
      // on `sellers.regionCode`. A wallet row left null here would disagree with
      // it about which market a seller's money is in.
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: null }));
      dataSource.query.mockResolvedValue([{ region_code: 'QA' }]);
      const w = await service.getOrCreateWallet('S1');
      expect(w.regionCode).toBe('QA');
      expect(walletRepo.save).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'QA' }));
    });
  });

  describe('the queue is filtered by a predicate', () => {
    it('adds the lock as an andWhere on region_code', async () => {
      await service.getPendingPayouts(1, 20, 'QA');
      expect(qb.andWhere).toHaveBeenCalledWith('p.regionCode = :__market', { __market: 'QA' });
    });

    it('predicates the total as well as the rows, so they describe one market', async () => {
      await service.getPendingPayouts(1, 20, 'QA');
      // Two builders — the page and the SUM — and both carry the predicate.
      const marketCalls = qb.andWhere.mock.calls.filter(
        (c: any[]) => c[0] === 'p.regionCode = :__market',
      );
      expect(marketCalls).toHaveLength(2);
    });

    it('adds nothing for a global admin who asked for nothing', async () => {
      await service.getPendingPayouts(1, 20, undefined, undefined);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('lets a global admin filter, and the lock still wins over the request', async () => {
      await service.getPendingPayouts(1, 20, undefined, 'in');
      expect(qb.andWhere).toHaveBeenCalledWith('p.regionCode = :__market', { __market: 'IN' });

      qb.andWhere.mockClear();
      await service.getPendingPayouts(1, 20, 'QA', 'IN');
      expect(qb.andWhere).toHaveBeenCalledWith('p.regionCode = :__market', { __market: 'QA' });
    });

    it('filters the statistics the same way, so totals match the queue', async () => {
      await service.getPayoutStats('QA');
      expect(qb.andWhere).toHaveBeenCalledWith('p.regionCode = :__market', { __market: 'QA' });
    });
  });

  describe('a decision is refused by the payout, not by the route', () => {
    it('approves one in the caller’s market', async () => {
      payoutRepo.findOne.mockResolvedValue(payout({ regionCode: 'QA' }));
      await expect(service.approvePayout('PAYOUT-1', 'admin-1', 'QA')).resolves.toMatchObject({
        success: true,
      });
    });

    it('refuses one in another market with the platform wording', async () => {
      payoutRepo.findOne.mockResolvedValue(payout({ regionCode: 'IN' }));
      await expect(service.approvePayout('PAYOUT-1', 'admin-1', 'QA')).rejects.toThrow(
        'This payout belongs to IN, not to the QA market.',
      );
      expect(payoutRepo.save).not.toHaveBeenCalled();
    });

    it('refuses an unattributed payout — the behaviour the route had before', async () => {
      payoutRepo.findOne.mockResolvedValue(payout({ regionCode: null }));
      await expect(service.approvePayout('PAYOUT-1', 'admin-1', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets a global caller act on any of them', async () => {
      payoutRepo.findOne.mockResolvedValue(payout({ regionCode: 'IN' }));
      await expect(service.approvePayout('PAYOUT-1', 'admin-1', undefined)).resolves.toMatchObject({
        success: true,
      });
    });

    it('guards process, retry and read-by-id on the same row', async () => {
      payoutRepo.findOne.mockResolvedValue(
        payout({ regionCode: 'IN', status: PayoutStatus.APPROVED }),
      );
      await expect(service.processPayout('PAYOUT-1', 'admin-1', 'QA')).rejects.toThrow(
        ForbiddenException,
      );

      payoutRepo.findOne.mockResolvedValue(
        payout({ regionCode: 'IN', status: PayoutStatus.FAILED }),
      );
      await expect(service.retryPayout('PAYOUT-1', 'QA')).rejects.toThrow(ForbiddenException);

      payoutRepo.findOne.mockResolvedValue(payout({ regionCode: 'IN' }));
      await expect(service.getPayoutById('PAYOUT-1', 'QA')).rejects.toThrow(ForbiddenException);
    });

    it('reports a payout that does not exist as missing, not as a market denial', async () => {
      payoutRepo.findOne.mockResolvedValue(null);
      await expect(service.getPayoutById('nope', 'QA')).resolves.toMatchObject({
        success: false,
        reason: 'Payout not found',
      });
    });

    it('refuses a batch the same way it refuses one, one row at a time', async () => {
      payoutRepo.findOne.mockResolvedValue(payout({ regionCode: 'IN' }));
      await expect(service.approvePayoutBatch(['PAYOUT-1'], 'admin-1', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("a seller's history answers on the seller's own market", () => {
    it('refuses another market’s seller instead of returning an empty history', async () => {
      // An empty list would read as "this seller has never been paid", which is
      // a different and equally wrong answer.
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: 'IN' }));
      await expect(service.getSellerPayouts('S1', 1, 20, undefined, 'QA')).rejects.toThrow(
        'This seller wallet belongs to IN, not to the QA market.',
      );
      expect(payoutRepo.findAndCount).not.toHaveBeenCalled();
    });

    it('creates nothing when it refuses — a 403 must not be a write', async () => {
      // `getOrCreateWallet` INSERTs. Asserting after it left a wallet behind for
      // a seller the caller was never allowed to touch, which a locked admin
      // could use to enumerate another market's seller ids by watching the
      // table grow.
      walletRepo.findOne.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([{ region_code: 'IN' }]);
      await expect(service.getSellerPayouts('S9', 1, 20, undefined, 'QA')).rejects.toThrow(
        ForbiddenException,
      );
      expect(walletRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(walletRepo.save).not.toHaveBeenCalled();
      expect(payoutRepo.findAndCount).not.toHaveBeenCalled();
    });

    it('proceeds to the history when the caller is allowed the seller', async () => {
      // The contrast with the test above: the same seller with no wallet row
      // yet, authorised, reaches `getOrCreateWallet` and then the payout query.
      walletRepo.findOne
        .mockResolvedValueOnce(null) // the read-only authorisation probe
        .mockResolvedValue(wallet({ sellerId: 'S9', regionCode: 'QA' }));
      dataSource.query.mockResolvedValue([{ region_code: 'QA' }]);
      await expect(service.getSellerPayouts('S9', 1, 20, undefined, 'QA')).resolves.toMatchObject({
        sellerId: 'S9',
      });
      expect(payoutRepo.findAndCount).toHaveBeenCalled();
    });

    it('serves the caller’s own market', async () => {
      walletRepo.findOne.mockResolvedValue(wallet({ regionCode: 'QA' }));
      await expect(service.getSellerPayouts('S1', 1, 20, undefined, 'QA')).resolves.toMatchObject({
        sellerId: 'S1',
      });
    });
  });
});
