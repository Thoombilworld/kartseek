import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

/**
 * Cross-seller authorisation.
 *
 * Every route exercised here is reached through a gateway handler gated by
 * `@Roles(SELLER)` — a role every seller on the platform holds. Before these
 * checks existed, that was the only gate: one seller could rewrite another's
 * variant prices and stock, edit or deactivate their coupons, read the customer
 * ids in their coupon redemptions, mark their returns REFUNDED, and post a
 * DELIVERED tracking event against their orders (which is when commission is
 * charged).
 *
 * The tests are written from the attacker's side: OWNER holds the row, INTRUDER
 * is a different, legitimately-signed-in seller.
 */
describe('MarketplaceFulfillmentService — cross-seller authorisation', () => {
  let service: MarketplaceFulfillmentService;
  let repos: Record<string, any>;

  const OWNER = { ownerId: 'user-owner', role: 'SELLER' };
  const INTRUDER = { ownerId: 'user-intruder', role: 'SELLER' };
  const ADMIN = { ownerId: 'user-admin', role: 'SUPER_ADMIN' };

  const SELLER_A = 'seller-aaa';
  const SELLER_B = 'seller-bbb';

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
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  });

  beforeEach(async () => {
    const entities = [
      Product, Seller, MarketplaceOrder, ReturnRequest, Coupon, CouponUsage,
      ShipmentTrackingEvent, ProductVariant, ProductQuestion, ProductAnswer, DeliveryAssignment,
      // Newly injected: shopper-filed reports and price-drop watches.
      ProductReport, PriceAlert, ProductListing,
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceFulfillmentService,
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), getJson: jest.fn(), setJson: jest.fn() } },
        { provide: KafkaProducerService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn() } },
        ...entities.map((e) => ({ provide: getRepositoryToken(e), useFactory: repoMock })),
      ],
    }).compile();

    service = module.get(MarketplaceFulfillmentService);
    repos = Object.fromEntries(entities.map((e) => [e.name, module.get(getRepositoryToken(e))]));

    // The two sellers, resolved from their owning users.
    repos.Seller.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.ownerId === OWNER.ownerId) return { id: SELLER_A };
      if (where?.ownerId === INTRUDER.ownerId) return { id: SELLER_B };
      return null;
    });
  });

  /** A variant belonging to SELLER_A. */
  const ownedVariant = () => {
    repos.ProductVariant.findOne.mockResolvedValue({
      id: 'v-1', productId: 'p-1', sellerId: SELLER_A, stockQuantity: 10, lowStockThreshold: 2, sku: 'SKU-1',
    });
  };

  describe('product variants', () => {
    it('lets the owning seller change a variant', async () => {
      ownedVariant();
      await expect(service.updateVariant('v-1', { sellingPrice: 999 }, OWNER)).resolves.toEqual({ success: true, id: 'v-1' });
      expect(repos.ProductVariant.update).toHaveBeenCalledWith('v-1', { sellingPrice: 999 });
    });

    it('refuses another seller', async () => {
      ownedVariant();
      await expect(service.updateVariant('v-1', { sellingPrice: 1 }, INTRUDER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(repos.ProductVariant.update).not.toHaveBeenCalled();
    });

    it('refuses an anonymous caller', async () => {
      ownedVariant();
      await expect(service.updateVariant('v-1', { sellingPrice: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    });

    // A row whose seller_id was never populated is owned by nobody, not everybody.
    it('refuses a variant with no owner recorded', async () => {
      repos.ProductVariant.findOne.mockResolvedValue({ id: 'v-2', productId: 'p-9', sellerId: null });
      repos.Product.findOne.mockResolvedValue({ id: 'p-9', seller_id: null });
      await expect(service.updateVariant('v-2', { sellingPrice: 1 }, OWNER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('falls back to the product owner when the variant carries no seller_id', async () => {
      repos.ProductVariant.findOne.mockResolvedValue({ id: 'v-3', productId: 'p-1', sellerId: null });
      repos.Product.findOne.mockResolvedValue({ id: 'p-1', seller_id: SELLER_A });
      await expect(service.updateVariant('v-3', { stockQuantity: 5 }, OWNER)).resolves.toBeTruthy();
    });

    // The body used to go straight into repo.update(), so the caller chose the
    // column list — including productId and seller_id.
    it('ignores attempts to reparent a variant onto another product or seller', async () => {
      ownedVariant();
      await service.updateVariant('v-1', { sellingPrice: 500, productId: 'p-stolen', sellerId: SELLER_B }, OWNER);
      expect(repos.ProductVariant.update).toHaveBeenCalledWith('v-1', { sellingPrice: 500 });
    });

    it('refuses stock changes from another seller', async () => {
      ownedVariant();
      await expect(
        service.updateVariantStock('v-1', { quantity: 0, operation: 'SET' }, INTRUDER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a variant created against another seller\'s product', async () => {
      repos.Product.findOne.mockResolvedValue({ id: 'p-1', seller_id: SELLER_A });
      await expect(service.createVariant('p-1', { sku: 'X' }, INTRUDER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('stamps a new variant with the product\'s seller, not the payload\'s', async () => {
      repos.Product.findOne.mockResolvedValue({ id: 'p-1', seller_id: SELLER_A });
      await service.createVariant('p-1', { sku: 'X', sellerId: SELLER_B }, OWNER);
      expect(repos.ProductVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({ sellerId: SELLER_A, productId: 'p-1' }),
      );
    });
  });

  describe('coupons', () => {
    beforeEach(() => {
      repos.Coupon.findOne.mockResolvedValue({ id: 'c-1', sellerId: SELLER_A, code: 'SAVE20' });
    });

    it('refuses another seller editing a coupon', async () => {
      await expect(service.updateCoupon('c-1', { discountValue: 100 }, INTRUDER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(repos.Coupon.update).not.toHaveBeenCalled();
    });

    it('refuses another seller deactivating a coupon', async () => {
      await expect(service.deleteCoupon('c-1', INTRUDER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses another seller reading redemptions', async () => {
      await expect(service.getCouponUsageStats('c-1', INTRUDER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(repos.CouponUsage.find).not.toHaveBeenCalled();
    });

    it('will not let the code, owner or redemption count be rewritten', async () => {
      await service.updateCoupon(
        'c-1',
        { discountValue: 15, code: 'HIJACK', sellerId: SELLER_B, usedCount: 0 },
        OWNER,
      );
      expect(repos.Coupon.update).toHaveBeenCalledWith('c-1', { discountValue: 15 });
    });

    // NULL seller_id means a platform-wide campaign — nobody's to edit but an admin's.
    it('treats a platform-wide coupon as admin-only', async () => {
      repos.Coupon.findOne.mockResolvedValue({ id: 'c-2', sellerId: null, code: 'PLATFORM10' });
      await expect(service.updateCoupon('c-2', { discountValue: 90 }, OWNER)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.updateCoupon('c-2', { discountValue: 12 }, ADMIN)).resolves.toBeTruthy();
    });
  });

  describe('returns', () => {
    it('refuses another seller settling a return', async () => {
      repos.ReturnRequest.findOne.mockResolvedValue({ id: 'r-1', sellerId: SELLER_A, status: 'REQUESTED' });
      await expect(
        service.updateReturnStatus('r-1', { status: 'REFUNDED' }, INTRUDER),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repos.ReturnRequest.update).not.toHaveBeenCalled();
    });

    it('lets the owning seller settle it', async () => {
      repos.ReturnRequest.findOne.mockResolvedValue({ id: 'r-1', sellerId: SELLER_A, status: 'REQUESTED' });
      await expect(service.updateReturnStatus('r-1', { status: 'APPROVED' }, OWNER)).resolves.toMatchObject({ success: true });
    });
  });

  /**
   * Customer-side withdrawal.
   *
   * Separate from the seller path above on purpose: `updateReturnStatus` is
   * scoped by `sellerId` and its gateway route is SELLER/ADMIN-only, so it can
   * never serve the customer's own "Cancel Return Request". These cases pin the
   * two things that make the new path safe — it is scoped to the requester, and
   * it cannot rewrite a return the seller has already acted on.
   */
  /**
   * Price-drop alerts.
   *
   * The two cases that matter are the ones a naive implementation gets wrong:
   * an alert must not fire when the price has not actually fallen, and it must
   * stop firing once it has. The first would notify every shopper on the first
   * sweep; the second would notify them on every sweep thereafter.
   */
  describe('price alerts', () => {
    const CUSTOMER = 'cust-1';
    const PRODUCT = 'prod-1';

    const listingAt = (price: number) => ({ id: 'l-1', sellingPrice: price, isBuyBoxWinner: true });

    it('records the buy-box price as the reference, not the list price', async () => {
      repos.Product.findOne.mockResolvedValue({ id: PRODUCT, is_active: true });
      repos.ProductListing.findOne.mockResolvedValue(listingAt(500));
      repos.PriceAlert.findOne.mockResolvedValue(null);
      repos.PriceAlert.create.mockImplementation((v: any) => v);
      repos.PriceAlert.save.mockImplementation(async (v: any) => ({ ...v, id: 'a-1' }));

      await expect(service.createPriceAlert({ customerId: CUSTOMER, productId: PRODUCT }))
        .resolves.toMatchObject({ success: true, watchingFrom: 500 });
    });

    it('refuses a product with no live listing to price against', async () => {
      repos.Product.findOne.mockResolvedValue({ id: PRODUCT, is_active: true });
      repos.ProductListing.findOne.mockResolvedValue(null);
      await expect(service.createPriceAlert({ customerId: CUSTOMER, productId: PRODUCT }))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(repos.PriceAlert.save).not.toHaveBeenCalled();
    });

    it('refuses a target that the current price already meets', async () => {
      repos.Product.findOne.mockResolvedValue({ id: PRODUCT, is_active: true });
      repos.ProductListing.findOne.mockResolvedValue(listingAt(400));
      await expect(service.createPriceAlert({ customerId: CUSTOMER, productId: PRODUCT, targetPrice: 500 }))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not fire when the price has not fallen', async () => {
      repos.PriceAlert.find.mockResolvedValue([
        { id: 'a-1', customerId: CUSTOMER, productId: PRODUCT, priceWhenSet: 500, targetPrice: null },
      ]);
      repos.ProductListing.findOne.mockResolvedValue(listingAt(500));
      await expect(service.sweepPriceAlerts(PRODUCT)).resolves.toMatchObject({ checked: 1, notified: 0 });
      expect(repos.PriceAlert.update).not.toHaveBeenCalled();
    });

    it('fires once and deactivates, so a sustained low price does not re-notify', async () => {
      repos.PriceAlert.find.mockResolvedValue([
        { id: 'a-1', customerId: CUSTOMER, productId: PRODUCT, priceWhenSet: 500, targetPrice: null },
      ]);
      repos.ProductListing.findOne.mockResolvedValue(listingAt(420));
      await expect(service.sweepPriceAlerts(PRODUCT)).resolves.toMatchObject({ checked: 1, notified: 1 });
      expect(repos.PriceAlert.update).toHaveBeenCalledWith('a-1', expect.objectContaining({
        isActive: false, notifiedPrice: 420,
      }));
    });

    it('honours a target instead of any decrease', async () => {
      repos.PriceAlert.find.mockResolvedValue([
        { id: 'a-1', customerId: CUSTOMER, productId: PRODUCT, priceWhenSet: 500, targetPrice: 300 },
      ]);
      // Cheaper than the reference, but still above the target the shopper set.
      repos.ProductListing.findOne.mockResolvedValue(listingAt(420));
      await expect(service.sweepPriceAlerts(PRODUCT)).resolves.toMatchObject({ notified: 0 });
    });

    it('refuses to delete an alert belonging to another customer', async () => {
      repos.PriceAlert.findOne.mockResolvedValue({ id: 'a-1', customerId: CUSTOMER });
      await expect(service.deletePriceAlert('a-1', 'someone-else')).rejects.toBeInstanceOf(ForbiddenException);
      expect(repos.PriceAlert.delete).not.toHaveBeenCalled();
    });
  });

  describe('customer cancelling their own return', () => {
    const CUSTOMER = 'cust-1';
    // REQUESTED, not PENDING: these fixtures originally used a status the
    // `return_requests_status_enum` does not define, so they exercised a state
    // no row could ever be in and the service's own guard never matched.


    it('cancels a pending return for its own requester', async () => {
      repos.ReturnRequest.findOne.mockResolvedValue({
        id: 'r-9', sellerId: SELLER_A, customerId: CUSTOMER, status: 'REQUESTED',
      });
      await expect(service.cancelReturn('r-9', CUSTOMER)).resolves.toMatchObject({
        success: true, status: 'CANCELLED',
      });
      expect(repos.ReturnRequest.update).toHaveBeenCalledWith('r-9', { status: 'CANCELLED' });
    });

    it('refuses a different customer', async () => {
      repos.ReturnRequest.findOne.mockResolvedValue({
        id: 'r-9', sellerId: SELLER_A, customerId: CUSTOMER, status: 'REQUESTED',
      });
      await expect(service.cancelReturn('r-9', 'someone-else')).rejects.toBeInstanceOf(ForbiddenException);
      expect(repos.ReturnRequest.update).not.toHaveBeenCalled();
    });

    it('refuses once the return has moved past PENDING', async () => {
      repos.ReturnRequest.findOne.mockResolvedValue({
        id: 'r-9', sellerId: SELLER_A, customerId: CUSTOMER, status: 'PICKED_UP',
      });
      await expect(service.cancelReturn('r-9', CUSTOMER)).rejects.toBeInstanceOf(BadRequestException);
      expect(repos.ReturnRequest.update).not.toHaveBeenCalled();
    });

    it('rejects a message with no customer id rather than matching on null', async () => {
      await expect(service.cancelReturn('r-9', '')).rejects.toBeInstanceOf(BadRequestException);
      expect(repos.ReturnRequest.findOne).not.toHaveBeenCalled();
    });

    it('404s an unknown return', async () => {
      repos.ReturnRequest.findOne.mockResolvedValue(null);
      await expect(service.cancelReturn('nope', CUSTOMER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('shipment tracking', () => {
    beforeEach(() => {
      repos.MarketplaceOrder.findOne.mockResolvedValue({ id: 'o-1', sellerId: SELLER_A });
    });

    // Commission is charged at delivery, so this is a write into someone's ledger.
    it('refuses another seller marking an order delivered', async () => {
      await expect(
        service.addTrackingEvent({ orderId: 'o-1', status: 'DELIVERED' }, INTRUDER),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repos.MarketplaceOrder.update).not.toHaveBeenCalled();
    });

    it('lets the order\'s own seller record an event', async () => {
      await expect(service.addTrackingEvent({ orderId: 'o-1', status: 'IN_TRANSIT' }, OWNER)).resolves.toBeTruthy();
    });

    // A courier is not the seller of the goods it carries — its authority comes
    // from the delivery assignment, not from owning the listing.
    it('allows a driver', async () => {
      await expect(
        service.addTrackingEvent({ orderId: 'o-1', status: 'OUT_FOR_DELIVERY' }, { ownerId: 'user-driver', role: 'DRIVER' }),
      ).resolves.toBeTruthy();
    });

    it('refuses an anonymous caller', async () => {
      await expect(service.addTrackingEvent({ orderId: 'o-1', status: 'DELIVERED' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('inventory reads', () => {
    it('refuses another seller reading a low-stock report', async () => {
      await expect(service.getLowStockVariants(SELLER_A, INTRUDER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows the seller their own', async () => {
      await expect(service.getLowStockVariants(SELLER_A, OWNER)).resolves.toEqual({ data: [], total: 0 });
    });

    it('allows an admin any seller\'s', async () => {
      await expect(service.getLowStockVariants(SELLER_A, ADMIN)).resolves.toEqual({ data: [], total: 0 });
    });
  });
});
