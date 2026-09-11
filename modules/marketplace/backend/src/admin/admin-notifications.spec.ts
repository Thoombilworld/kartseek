import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MarketplaceAdminService } from './admin.service';

/**
 * `getAdminNotifications` returns rows, or nothing, and never invents any.
 *
 * Two defects met in this method and hid each other:
 *
 *  1. it queried `where: { userId: IsNull() }`, but
 *     `MarketplaceNotification.userId` is a plain `@Column()` — NOT NULL — so
 *     the query could never match; and
 *  2. the branch below it, commented "If no DB records, return system-generated
 *     admin notifications", returned four hand-written objects.
 *
 * Because (1) always matched nothing, (2) was not a fallback but the only
 * reachable path: every administrator's header rendered "3 new sellers awaiting
 * approval" and "Weekly payout batch of ₹2.3L ready for processing" — a rupee
 * figure on a Qatar-first platform — on every page, forever. Deleting the
 * literals alone would have made the feature silently dead, so the rows are now
 * addressed to the signed-in administrator, which is what the column can express.
 */

const admin = (rows: unknown[] = [], unread = 0) => {
  const notificationRepo = {
    findAndCount: vi.fn(async () => [rows, rows.length]),
    count: vi.fn(async () => unread),
  };
  const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
  Object.assign(svc, { notificationRepo, logger: { log: vi.fn(), warn: vi.fn() } });
  return { svc, notificationRepo };
};

const ROW = {
  id: 'n-1',
  userId: 'u-super',
  type: 'SYSTEM',
  title: 'Seller approved',
  message: 'Al Meera Stores is live',
  isRead: false,
  createdAt: '2026-09-11T19:00:00.000Z',
};

describe('getAdminNotifications', () => {
  it("asks for the signed-in administrator's rows, newest first", async () => {
    const { svc, notificationRepo } = admin([ROW], 1);
    const out = await svc.getAdminNotifications('u-super');

    expect(notificationRepo.findAndCount).toHaveBeenCalledWith({
      where: { userId: 'u-super' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    expect(out.data).toEqual([ROW]);
    expect(out.total).toBe(1);
  });

  it('counts unread in the database, not across the page it fetched', async () => {
    // 50 rows is the page; an unread row older than that still has to reach the
    // header's badge, so the count is its own query.
    const { svc, notificationRepo } = admin([ROW], 7);
    expect((await svc.getAdminNotifications('u-super')).unreadCount).toBe(7);
    expect(notificationRepo.count).toHaveBeenCalledWith({
      where: { userId: 'u-super', isRead: false },
    });
  });

  it('returns an empty list rather than inventing one', async () => {
    const { svc } = admin([], 0);
    const out = await svc.getAdminNotifications('u-super');
    expect(out).toEqual({ data: [], total: 0, unreadCount: 0 });
  });

  it.each([
    'New Seller Registration',
    '3 new sellers awaiting approval',
    'Low Stock Alert',
    '12 products below reorder threshold',
    'Return Spike Detected',
    'Payout Batch Ready',
    '₹2.3L',
    'sn-1',
  ])('never fabricates the row %s for an empty table', async (needle) => {
    const { svc } = admin([], 0);
    const out = await svc.getAdminNotifications('u-super');
    expect(JSON.stringify(out)).not.toContain(needle);
  });

  it('refuses an actorless request loudly instead of answering "you have none"', async () => {
    const { svc, notificationRepo } = admin([ROW], 1);
    await expect(svc.getAdminNotifications(undefined)).rejects.toThrow(BadRequestException);
    expect(notificationRepo.findAndCount).not.toHaveBeenCalled();
  });

  /**
   * A market-locked administrator reads their own inbox.
   *
   * The method used to call `refuseUnattributable(scope, 'platform
   * notification')`, which was right while the list was the platform's and
   * wrong the moment it became personal: it denied a regional admin the
   * messages addressed to them. There is no market dimension left to confine —
   * `userId` is the whole scope — so there is no `scope` parameter either.
   */
  it('answers a market-locked administrator with their own rows', async () => {
    const { svc, notificationRepo } = admin([{ ...ROW, userId: 'u-qa' }], 1);
    const out = await svc.getAdminNotifications('u-qa');
    expect(out.total).toBe(1);
    expect(notificationRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-qa' } }),
    );
  });

  it('takes no market argument at all, so no caller can filter the inbox by one', () => {
    // One parameter. A second would be a market filter on a personal feed,
    // which could only hide rows addressed to the reader.
    expect(svcMethodArity()).toBe(1);
  });
});

/** `getAdminNotifications`'s declared parameter count, read off the prototype. */
function svcMethodArity(): number {
  return MarketplaceAdminService.prototype.getAdminNotifications.length;
}
