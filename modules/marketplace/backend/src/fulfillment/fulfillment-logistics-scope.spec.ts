import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MarketplaceFulfillmentService } from './fulfillment.service';

/**
 * Logistics market scope: delivery assignments, product reports, tracking
 * events, low-stock reads and return pickups.
 *
 * `delivery_assignments.region_code` has been on the table since it was created
 * and nothing ever read or wrote it (audit V12) — so a regional admin listed,
 * read, created and progressed shipments in every market, including the OTP
 * check that closes a delivery. A product report carries no market column at
 * all: it is attributed through the reported listing to the seller who owns it
 * (audit V10), the same join every admin product list uses.
 *
 * A sibling of `fulfillment-scope.spec.ts`, which covers the variant, coupon
 * and return-decision writes. Separate file, separate doubles: these methods
 * need the assignment, order, report and tracking repositories, and the variant
 * fixture there should not grow a delivery fleet to keep passing.
 */

let lastReportQuery: any;

function logistics(
  opts: {
    assignmentRegion?: string | null;
    orderRegion?: string | null;
    sellerRegion?: string | null;
  } = {},
) {
  const assignmentRegion = opts.assignmentRegion === undefined ? 'IN' : opts.assignmentRegion;
  const orderRegion = opts.orderRegion === undefined ? 'IN' : opts.orderRegion;
  const sellerRegion = opts.sellerRegion === undefined ? 'IN' : opts.sellerRegion;

  const assignment = {
    id: 'da-1',
    orderId: 'o-1',
    partnerId: 'p-1',
    regionCode: assignmentRegion,
    status: 'ACCEPTED',
    otpVerified: false,
    deliveryOtp: '1234',
  };
  const deliveryAssignmentRepo = {
    findOne: vi.fn(async () => assignment),
    findAndCount: vi.fn(async () => [[assignment], 1]),
    update: vi.fn(async () => ({ affected: 1 })),
    create: vi.fn((x: any) => x),
    save: vi.fn(async (x: any) => ({ ...x, id: 'da-new' })),
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        addSelect: () => qb,
        leftJoinAndSelect: () => qb,
        where: () => qb,
        getOne: async () => assignment,
      };
      return qb;
    }),
  };
  const orderRepo = {
    findOne: vi.fn(async () => ({ id: 'o-1', sellerId: 's-1', regionCode: orderRegion })),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const productRepo = { findOne: vi.fn(async () => ({ id: 'pr-1', seller_id: 's-1' })) };
  const sellerRepo = { findOne: vi.fn(async () => ({ id: 's-1', regionCode: sellerRegion })) };
  const reportRepo = {
    findOne: vi.fn(async () => ({ id: 'rep-1', productId: 'pr-1', status: 'PENDING' })),
    update: vi.fn(async () => ({ affected: 1 })),
    createQueryBuilder: vi.fn(() => {
      const conditions: string[] = [];
      const qb: any = {
        conditions,
        leftJoinAndSelect: () => qb,
        leftJoin: () => qb,
        andWhere: (w: string) => {
          conditions.push(w);
          return qb;
        },
        orderBy: () => qb,
        skip: () => qb,
        take: () => qb,
        getManyAndCount: async () => [[], 0],
      };
      lastReportQuery = qb;
      return qb;
    }),
  };
  const trackingRepo = {
    create: vi.fn((x: any) => x),
    save: vi.fn(async (x: any) => ({ ...x, id: 'te-1' })),
  };
  const variantRepo = {
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        where: () => qb,
        andWhere: () => qb,
        orderBy: () => qb,
        getMany: async () => [],
      };
      return qb;
    }),
  };
  const returnRepo = {
    findOne: vi.fn(async () => ({ id: 'r-1', regionCode: 'IN' })),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const redis = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
    setJson: vi.fn(async () => undefined),
  };
  const svc = Object.create(
    MarketplaceFulfillmentService.prototype,
  ) as MarketplaceFulfillmentService;
  Object.assign(svc, {
    deliveryAssignmentRepo,
    orderRepo,
    productRepo,
    sellerRepo,
    reportRepo,
    trackingRepo,
    variantRepo,
    returnRepo,
    kafka,
    redis,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return {
    svc,
    deliveryAssignmentRepo,
    orderRepo,
    reportRepo,
    trackingRepo,
    returnRepo,
    kafka,
    redis,
  };
}

describe('delivery assignments respect the assignment market', () => {
  it('refuses a read, a status change and an OTP check on an IN assignment for a QA admin', async () => {
    for (const call of [
      (s: any) => s.getDeliveryAssignmentById('da-1', 'QA'),
      (s: any) => s.updateDeliveryStatus('da-1', { status: 'DELIVERED', scope: 'QA' }),
      (s: any) => s.verifyDeliveryOtp('da-1', '1234', 'QA'),
    ]) {
      const { svc, deliveryAssignmentRepo, kafka, redis } = logistics();
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      await expect(call(svc)).rejects.toThrow(
        'This delivery assignment belongs to IN, not to the QA market.',
      );
      expect(deliveryAssignmentRepo.update).not.toHaveBeenCalled();
      expect(kafka.publish).not.toHaveBeenCalled();
      // Not even the OTP attempt counter: a refused caller must not be able to
      // burn another market's delivery out of its five attempts.
      expect(redis.set).not.toHaveBeenCalled();
    }
  });

  it('allows the same three on a QA assignment — the control', async () => {
    const { svc, deliveryAssignmentRepo } = logistics({ assignmentRegion: 'QA' });
    await expect(svc.getDeliveryAssignmentById('da-1', 'QA')).resolves.toMatchObject({
      id: 'da-1',
    });
    await expect(
      svc.updateDeliveryStatus('da-1', { status: 'PICKED_UP', scope: 'QA' }),
    ).resolves.toMatchObject({ success: true });
    await expect(svc.verifyDeliveryOtp('da-1', '1234', 'QA')).resolves.toMatchObject({
      verified: true,
    });
    expect(deliveryAssignmentRepo.update).toHaveBeenCalled();
  });

  it('leaves a global admin (no scope) free in any market', async () => {
    const { svc } = logistics();
    await expect(svc.getDeliveryAssignmentById('da-1')).resolves.toMatchObject({ id: 'da-1' });
  });

  it('refuses an assignment that carries no market at all', async () => {
    const { svc } = logistics({ assignmentRegion: null });
    await expect(svc.getDeliveryAssignmentById('da-1', 'QA')).rejects.toThrow(
      'This delivery assignment belongs to every market, not to the QA market.',
    );
  });

  it('stamps the new assignment from the order, not from the body', async () => {
    const { svc, deliveryAssignmentRepo } = logistics({ orderRegion: 'IN' });
    const created: any = await svc.createDeliveryAssignment({
      orderId: 'o-1',
      partnerId: 'p-1',
      // A market the caller chose is not a market.
      regionCode: 'QA',
      region_code: 'QA',
    });
    expect(created).toMatchObject({ regionCode: 'IN' });
    expect(deliveryAssignmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'IN' }),
    );
    // The generated code never travels back to whoever created the assignment.
    expect(created).not.toHaveProperty('deliveryOtp');
  });

  it('refuses to create an assignment against another market order', async () => {
    const { svc, deliveryAssignmentRepo, kafka } = logistics({ orderRegion: 'IN' });
    await expect(
      svc.createDeliveryAssignment({ orderId: 'o-1', partnerId: 'p-1', scope: 'QA' }),
    ).rejects.toThrow('This order belongs to IN, not to the QA market.');
    expect(deliveryAssignmentRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('publishes the status event without the `scope` that authorised it', async () => {
    // An event carrying the caller's market invites a consumer to read
    // authorisation off the bus, and `scope` is not part of what happened.
    const { svc, kafka } = logistics({ assignmentRegion: 'QA' });
    await svc.updateDeliveryStatus('da-1', { status: 'DELIVERED', scope: 'QA' });
    expect(kafka.publish).toHaveBeenCalledWith(
      'delivery.status-updated',
      expect.not.objectContaining({ scope: 'QA' }),
    );
  });

  it('filters the list on the market the gateway resolved', async () => {
    const { svc, deliveryAssignmentRepo } = logistics();
    await svc.getDeliveryAssignments({ region: 'qa', status: 'PENDING' });
    expect(deliveryAssignmentRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING', regionCode: 'QA' } }),
    );
  });
});

describe('product reports respect the reported seller market', () => {
  it('refuses a QA admin resolving a report on an IN listing, and writes nothing', async () => {
    const { svc, reportRepo } = logistics({ sellerRegion: 'IN' });
    await expect(
      svc.resolveProductReport('rep-1', { status: 'DISMISSED', scope: 'QA' }, 'u-qa'),
    ).rejects.toThrow('This report belongs to IN, not to the QA market.');
    expect(reportRepo.update).not.toHaveBeenCalled();
  });

  it('allows the same resolution on a QA listing — the control', async () => {
    const { svc, reportRepo } = logistics({ sellerRegion: 'QA' });
    await expect(
      svc.resolveProductReport('rep-1', { status: 'DISMISSED', scope: 'QA' }, 'u-qa'),
    ).resolves.toMatchObject({ success: true, status: 'DISMISSED' });
    expect(reportRepo.update).toHaveBeenCalled();
  });

  it('predicates the queue on the seller market, and not at all for a global admin', async () => {
    const { svc } = logistics();
    await svc.listProductReports({ region: 'QA' });
    expect(lastReportQuery.conditions).toContain('s.region_code = :__market');
    await svc.listProductReports({});
    expect(lastReportQuery.conditions).not.toContain('s.region_code = :__market');
  });
});

describe('a tracking event respects the order market', () => {
  it('refuses a QA admin posting DELIVERED against an IN order, and settles nothing', async () => {
    const { svc, trackingRepo, orderRepo, kafka } = logistics({ orderRegion: 'IN' });
    await expect(
      svc.addTrackingEvent(
        { orderId: 'o-1', status: 'DELIVERED', location: 'Doha', scope: 'QA' },
        { ownerId: 'u-qa', role: 'ADMIN' },
      ),
    ).rejects.toThrow('This order belongs to IN, not to the QA market.');
    expect(trackingRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('saves the event without the `scope` key it was authorised by', async () => {
    const { svc, trackingRepo } = logistics({ orderRegion: 'QA' });
    await svc.addTrackingEvent(
      { orderId: 'o-1', status: 'IN_TRANSIT', location: 'Doha', scope: 'QA' },
      { ownerId: 'u-qa', role: 'ADMIN' },
    );
    expect(trackingRepo.create).toHaveBeenCalledWith(expect.not.objectContaining({ scope: 'QA' }));
  });
});

describe('a low-stock read respects the seller market', () => {
  it('refuses an IN seller stock levels to a QA admin', async () => {
    const { svc } = logistics({ sellerRegion: 'IN' });
    await expect(
      svc.getLowStockVariants('s-1', { ownerId: 'u-qa', role: 'ADMIN' }, 'QA'),
    ).rejects.toThrow('This seller account belongs to IN, not to the QA market.');
  });

  it('allows a QA seller — the control', async () => {
    const { svc } = logistics({ sellerRegion: 'QA' });
    await expect(
      svc.getLowStockVariants('s-1', { ownerId: 'u-qa', role: 'ADMIN' }, 'QA'),
    ).resolves.toMatchObject({ total: 0 });
  });
});

describe('a return pickup respects the return market', () => {
  it('refuses a QA admin scheduling a pickup on an IN return, and writes nothing', async () => {
    const { svc, returnRepo, kafka } = logistics();
    await expect(
      svc.assignReturnPickup('r-1', {
        pickupPartnerId: 'pp-1',
        pickupScheduledAt: '2026-09-20T10:00:00Z',
        scope: 'QA',
      }),
    ).rejects.toThrow('This return request belongs to IN, not to the QA market.');
    expect(returnRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('publishes the pickup event without the `scope` that authorised it', async () => {
    const { svc, kafka } = logistics();
    await svc.assignReturnPickup('r-1', {
      pickupPartnerId: 'pp-1',
      pickupScheduledAt: '2026-09-20T10:00:00Z',
      scope: 'IN',
    });
    expect(kafka.publish).toHaveBeenCalledWith(
      'return.pickup-assigned',
      expect.not.objectContaining({ scope: 'IN' }),
    );
  });
});
