import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RefundService, RefundStatus, type RefundRequest } from './refund.service';

/**
 * A refund's market.
 *
 * `GET /admin/marketplace/refunds` refused every region-locked administrator
 * outright, and the reason was recorded honestly: a refund is a Redis key with
 * a 30-day TTL, there is no row, and nothing on the stored object said which
 * market the refunded order was placed in. Showing the whole platform's queue
 * to a QA admin under a QA heading is the leak, so the route was closed instead.
 *
 * The blocker was a missing FIELD, not a missing table: the stored object is
 * JSON this service writes, so it can carry the market the same way every other
 * record does. It is stamped at request time and filtered here, and a refund
 * written before this field exists has no market — so it stays invisible to a
 * scoped admin (fail closed) and visible to a global one.
 */
function makeService(stored: Partial<RefundRequest>[]) {
  const db = new Map<string, any>();
  for (const r of stored) db.set(`refund:${r.id}`, r);
  const redis: any = {
    getJson: vi.fn(async (k: string) => db.get(k) ?? null),
    setJson: vi.fn(async (k: string, v: any) => {
      db.set(k, v);
    }),
    scanKeys: vi.fn(async () => [...db.keys()].filter((k) => k.startsWith('refund:RFD-'))),
  };
  const kafka: any = { publish: vi.fn(async () => undefined) };
  return { svc: new RefundService(redis, kafka), redis, db };
}

const pending = (id: string, regionCode: string | null | undefined): Partial<RefundRequest> => ({
  id,
  orderId: `o-${id}`,
  userId: 'u1',
  amount: 10,
  reason: 'DAMAGED',
  status: RefundStatus.PENDING,
  isPartial: false,
  requestedAt: new Date(Date.now() - 1000).toISOString(),
  // Far enough out that the expiry sweep never fires during the test.
  expiresAt: new Date(Date.now() + 86400_000).toISOString(),
  statusHistory: [],
  ...(regionCode === undefined ? {} : { regionCode }),
});

describe('RefundService — the pending queue carries a market', () => {
  let svc: RefundService;
  beforeEach(() => {
    svc = makeService([
      pending('RFD-1', 'QA'),
      pending('RFD-2', 'IN'),
      pending('RFD-3', undefined), // written before the field existed
      pending('RFD-4', null), // written with no market resolved
    ]).svc;
  });

  it('gives a QA-scoped admin only QA refunds', async () => {
    const res = await svc.getPendingRefunds(1, 20, 'QA');
    expect(res.data.map((r) => r.id)).toEqual(['RFD-1']);
    expect(res.total).toBe(1);
  });

  it('hides an unattributable refund from a scoped admin and shows it to a global one', async () => {
    const scoped = await svc.getPendingRefunds(1, 20, 'IN');
    expect(scoped.data.map((r) => r.id)).toEqual(['RFD-2']);
    const global = await svc.getPendingRefunds(1, 20);
    expect(global.data.map((r) => r.id).sort()).toEqual(['RFD-1', 'RFD-2', 'RFD-3', 'RFD-4']);
    expect(global.total).toBe(4);
  });

  it('counts the market-filtered total, not the platform total', async () => {
    // `total` drives the console's pager. Filtering the page but not the count
    // is how a one-row market shows four pages of nothing.
    const res = await svc.getPendingRefunds(1, 20, 'qa');
    expect(res.total).toBe(1);
  });

  it('refuses a scope that is not a market this platform knows', async () => {
    await expect(svc.getPendingRefunds(1, 20, 'NOT-A-COUNTRY')).rejects.toThrow(ForbiddenException);
  });

  it("applies a global admin's requested market — the console's region picker", async () => {
    // The gateway has always sent `region`; this handler's signature had no
    // slot for it, so a SUPER_ADMIN selecting Qatar got every market's refunds
    // under a Qatar heading. Not a leak — the caller is global — but the same
    // lie in the other direction, and the other four routes all honour it.
    const res = await svc.getPendingRefunds(1, 20, undefined, 'qa');
    expect(res.data.map((r) => r.id)).toEqual(['RFD-1']);
    expect(res.total).toBe(1);
  });

  it('lets the lock beat a conflicting requested market', async () => {
    const res = await svc.getPendingRefunds(1, 20, 'QA', 'IN');
    expect(res.data.map((r) => r.id)).toEqual(['RFD-1']);
  });

  it('refuses a requested market it cannot read rather than widening', async () => {
    await expect(svc.getPendingRefunds(1, 20, undefined, 'QQ')).rejects.toThrow(ForbiddenException);
  });
});

describe('RefundService — the queue is the decidable states unless one is named', () => {
  it('answers PENDING and UNDER_REVIEW when no status is asked for', async () => {
    const { svc } = makeService([
      pending('RFD-1', 'QA'),
      { ...pending('RFD-2', 'QA'), status: RefundStatus.UNDER_REVIEW },
      { ...pending('RFD-3', 'QA'), status: RefundStatus.REJECTED },
    ]);
    const res = await svc.getPendingRefunds(1, 20);
    expect(res.data.map((r) => r.id).sort()).toEqual(['RFD-1', 'RFD-2']);
  });

  it('answers exactly the state named, so the queue also reads as a history', async () => {
    const { svc } = makeService([
      pending('RFD-1', 'QA'),
      { ...pending('RFD-3', 'QA'), status: RefundStatus.REJECTED },
    ]);
    const res = await svc.getPendingRefunds(1, 20, undefined, undefined, 'REJECTED');
    expect(res.data.map((r) => r.id)).toEqual(['RFD-3']);
  });

  it('never expires a refund somebody has already decided', async () => {
    // The expiry sweep belongs to the decision queue. Running it over an
    // APPROVED refund would rewrite a decision from inside a read.
    const decided = {
      ...pending('RFD-9', 'QA'),
      status: RefundStatus.APPROVED,
      expiresAt: new Date(Date.now() - 86400_000).toISOString(),
    };
    const { svc, db } = makeService([decided]);
    const res = await svc.getPendingRefunds(1, 20, undefined, undefined, 'APPROVED');
    expect(res.data.map((r) => r.id)).toEqual(['RFD-9']);
    expect(db.get('refund:RFD-9').status).toBe(RefundStatus.APPROVED);
  });
});

describe('RefundService — a refund is stamped with its market at request time', () => {
  it('persists the market the caller resolved', async () => {
    const { svc, db } = makeService([]);
    const res: any = await svc.requestRefund({
      orderId: 'o-9',
      userId: 'u-9',
      amount: 25,
      reason: 'DAMAGED',
      regionCode: 'in',
    });
    expect(res.success).toBe(true);
    const saved = db.get(`refund:${res.refund.id}`);
    // Normalised on the way in, so the queue filter is a plain comparison and
    // 'in', 'IN' and 'IN-MH' are not three different markets in the store.
    expect(saved.regionCode).toBe('IN');
  });

  it('stores no market rather than a wrong one when the caller resolved none', async () => {
    const { svc, db } = makeService([]);
    const res: any = await svc.requestRefund({
      orderId: 'o-10',
      userId: 'u-10',
      amount: 5,
      reason: 'OTHER',
    });
    expect(db.get(`refund:${res.refund.id}`).regionCode).toBeNull();
  });
});
