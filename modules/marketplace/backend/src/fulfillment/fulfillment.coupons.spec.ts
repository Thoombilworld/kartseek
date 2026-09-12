import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { MarketplaceFulfillmentService } from './fulfillment.service';
import { Product } from '../entities/product.entity';
import { Seller } from '../entities/seller.entity';
import { MarketplaceOrder } from '../entities/marketplace-order.entity';
import { ReturnRequest } from '../entities/return-request.entity';
import { Coupon, CouponUsage } from '../entities/coupon.entity';
import { ShipmentTrackingEvent } from '../entities/shipment-tracking-event.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from '../entities/product-qa.entity';
import { DeliveryAssignment } from '../entities/delivery-assignment.entity';
import { ProductReport } from '../entities/product-report.entity';
import { PriceAlert } from '../entities/price-alert.entity';
import { ProductListing } from '../entities/product-listing.entity';
import { ForbiddenException } from '@nestjs/common';

/**
 * Coupons per market.
 *
 * A flat-amount coupon is denominated in one currency: "QR 50 off orders over
 * QR 300" is a different offer from "₹50 off" and a meaningless one in India.
 * Coupons therefore carry a `region_code`; a code issued for one market must
 * neither be listed nor accepted in another, while a code with no region (the
 * welcome offer) runs everywhere.
 */
describe('MarketplaceFulfillmentService — coupons per market', () => {
  let service: MarketplaceFulfillmentService;
  let repos: Record<string, any>;

  const qb = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  });

  const repoMock = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((d) => d),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'new-id', ...e })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockImplementation(qb),
  });

  const DAY = 86_400_000;
  /** A live QR 50 flat coupon issued for Qatar. */
  const SAVE50QA = {
    id: 'c-qa',
    code: 'SAVE50QA',
    regionCode: 'QA',
    discountType: 'FLAT',
    discountValue: '50.00',
    maxDiscount: null,
    minOrderValue: 0,
    usageLimit: 0,
    usageLimitPerUser: 3,
    usedCount: 0,
    validFrom: new Date(Date.now() - DAY),
    validUntil: new Date(Date.now() + DAY),
    applicablePaymentMethods: null,
    isActive: true,
  };

  beforeEach(async () => {
    const entities = [
      Product,
      Seller,
      MarketplaceOrder,
      ReturnRequest,
      Coupon,
      CouponUsage,
      ShipmentTrackingEvent,
      ProductVariant,
      ProductQuestion,
      ProductAnswer,
      DeliveryAssignment,
      ProductReport,
      PriceAlert,
      ProductListing,
    ];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceFulfillmentService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getJson: jest.fn(),
            setJson: jest.fn(),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: { publish: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn() } },
        ...entities.map((e) => ({ provide: getRepositoryToken(e), useFactory: repoMock })),
      ],
    }).compile();
    service = module.get(MarketplaceFulfillmentService);
    repos = Object.fromEntries(entities.map((e) => [e.name, module.get(getRepositoryToken(e))]));
  });

  describe('validateCoupon', () => {
    it('refuses a coupon issued for another market', async () => {
      repos.Coupon.findOne.mockResolvedValue(SAVE50QA);
      const res: any = await service.validateCoupon({
        code: 'save50qa',
        customerId: 'u1',
        orderTotal: 500,
        region: 'IN',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/market/i);
      // Refused before any usage is looked up: the offer does not exist there.
      expect(repos.CouponUsage.count).not.toHaveBeenCalled();
    });

    it('accepts the same coupon in the market it was issued for', async () => {
      repos.Coupon.findOne.mockResolvedValue(SAVE50QA);
      const res: any = await service.validateCoupon({
        code: 'SAVE50QA',
        customerId: 'u1',
        orderTotal: 500,
        region: 'qa',
      });
      expect(res.valid).toBe(true);
      expect(res.discount).toBe(50);
      expect(res.code).toBe('SAVE50QA');
    });

    it('accepts a market-agnostic coupon anywhere', async () => {
      repos.Coupon.findOne.mockResolvedValue({
        ...SAVE50QA,
        id: 'c-all',
        code: 'WELCOME10',
        regionCode: null,
        discountType: 'PERCENTAGE',
        discountValue: '10.00',
      });
      for (const region of ['QA', 'IN', 'AE', 'SA', undefined]) {
        const res: any = await service.validateCoupon({
          code: 'WELCOME10',
          customerId: 'u1',
          orderTotal: 200,
          region,
        });
        expect(res.valid).toBe(true);
        expect(res.discount).toBe(20);
      }
    });
  });

  /**
   * An unreadable lock must not fall through to the global path.
   *
   * `couponMarketFor` opened with `const lock = normaliseMarket(scope); if
   * (lock) { … return lock; }`, so a lock such as `ZZ` skipped the branch and
   * reached `if (wanted) return wanted` — the coupon was then scoped to
   * whatever the CALLER asked for, chosen by an admin who was supposed to be
   * confined to one market (R2-1).
   */
  describe('an unreadable lock refuses instead of taking the global path', () => {
    const dto = () => ({ code: `C${Math.random().toString(36).slice(2, 7)}`, discountValue: 5 });

    it('refuses ZZ, QAT and NOT-A-COUNTRY when issuing a coupon', async () => {
      for (const bad of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
        await expect(service.createCoupon(dto(), undefined, bad)).rejects.toThrow(
          ForbiddenException,
        );
      }
    });

    it('issues into the lock for a readable one, whatever the body named', async () => {
      // Same market named in the body: accepted, and stamped from the lock.
      await service.createCoupon({ ...dto(), regionCode: 'QA' }, undefined, 'QA');
      const created = repos.Coupon.create.mock.calls.at(-1)![0];
      expect(created).toMatchObject({ regionCode: 'QA' });
    });

    it('refuses a locked admin naming another market', async () => {
      await expect(
        service.createCoupon({ ...dto(), regionCode: 'IN' }, undefined, 'QA'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCoupons', () => {
    it('lists the market’s own coupons and the market-agnostic ones', async () => {
      await service.getCoupons({ region: 'in', publicOnly: true });
      const built = repos.Coupon.createQueryBuilder.mock.results.at(-1)!.value;
      const scope = built.andWhere.mock.calls.find(
        ([, params]: [string, any]) => params?.region === 'IN',
      );
      expect(scope).toBeDefined();
      expect(scope![0]).toContain('c.regionCode IS NULL');
      expect(scope![0]).toContain('c.regionCode = :region');
    });

    it('lists everything when no market is given (the admin view)', async () => {
      await service.getCoupons({ publicOnly: false });
      const built = repos.Coupon.createQueryBuilder.mock.results.at(-1)!.value;
      const scope = built.andWhere.mock.calls.find(([sql]: [string]) => /regionCode/.test(sql));
      expect(scope).toBeUndefined();
    });
  });
});
