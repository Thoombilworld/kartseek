import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MarketplaceFulfillmentService } from './fulfillment.service';

/**
 * The admin returns queue is one market's, not the platform's.
 *
 * `return_requests` has carried `region_code` since it was created, and the
 * DECISION path already asserts it (`updateReturnStatus`) — so a QA admin could
 * not approve an Indian return but could read every one of them in a list
 * headed "Returns". The list did not filter at all, because it had no `scope`
 * parameter to filter on; the gateway's own route was a literal `{ data: [] }`,
 * which is how a missing filter stayed invisible.
 */
function service(rows: any[] = []) {
  const captured: any = {};
  const returnRepo = {
    findAndCount: vi.fn(async (opts: any) => {
      captured.where = opts.where;
      return [rows, rows.length];
    }),
  };
  const svc = Object.create(
    MarketplaceFulfillmentService.prototype,
  ) as MarketplaceFulfillmentService;
  Object.assign(svc, {
    returnRepo,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, captured, returnRepo };
}

describe('MarketplaceFulfillmentService.getReturnRequests — market scope', () => {
  it('narrows the queue to the locked market and ignores a conflicting request', async () => {
    const { svc, captured } = service();
    await svc.getReturnRequests({ page: 1, limit: 20, region: 'IN', scope: 'QA' });
    expect(captured.where).toMatchObject({ regionCode: 'QA' });
  });

  it("applies a global admin's requested market, and none when they ask for none", async () => {
    const a = service();
    await a.svc.getReturnRequests({ region: 'in' });
    expect(a.captured.where).toMatchObject({ regionCode: 'IN' });
    const b = service();
    await b.svc.getReturnRequests({});
    expect(b.captured.where.regionCode).toBeUndefined();
  });

  it('keeps the seller and status filters it already had', async () => {
    const { svc, captured } = service();
    await svc.getReturnRequests({ sellerId: 's-1', status: 'REQUESTED', scope: 'QA' });
    expect(captured.where).toMatchObject({
      sellerId: 's-1',
      status: 'REQUESTED',
      regionCode: 'QA',
    });
  });

  it('refuses a scope that is not a market this platform knows', async () => {
    const { svc, returnRepo } = service();
    await expect(svc.getReturnRequests({ scope: 'NOT-A-COUNTRY' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(returnRepo.findAndCount).not.toHaveBeenCalled();
  });
});
