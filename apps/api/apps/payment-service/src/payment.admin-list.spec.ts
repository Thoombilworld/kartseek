import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PaymentOrchestratorService } from './payment.service';

/**
 * `GET /admin/marketplace/payments` answered `{ data: [], total: 0, message:
 * 'Payment gateway config' }` inline — a literal empty page with a caption, for
 * a service that has held every payment with a `country_code` on the row since
 * it was written.
 *
 * The market column here is `countryCode`, not `region_code`: payment is one of
 * the four modules that predate the convention, which is exactly why the
 * predicate is asserted against the query rather than assumed.
 */
function makeService() {
  const captured: any = {};
  const paymentRepo: any = {
    findAndCount: vi.fn(async (opts: any) => {
      captured.opts = opts;
      return [[], 0];
    }),
  };
  const svc = new PaymentOrchestratorService(
    paymentRepo,
    {} as any, // gateway factory
    {} as any, // billing
    { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) } as any,
    { publish: vi.fn(async () => undefined) } as any,
  );
  return { svc, captured, paymentRepo };
}

describe('PaymentOrchestratorService.listPaymentsForAdmin', () => {
  it("filters on the payment's own market column, and the lock beats the request", async () => {
    const { svc, captured } = makeService();
    await svc.listPaymentsForAdmin({ page: 1, limit: 20, region: 'IN', scope: 'QA' });
    expect(captured.opts.where).toMatchObject({ countryCode: 'QA' });
  });

  it("applies a global admin's requested market, and none when they ask for none", async () => {
    const a = makeService();
    await a.svc.listPaymentsForAdmin({ region: 'in' });
    expect(a.captured.opts.where).toMatchObject({ countryCode: 'IN' });
    const b = makeService();
    await b.svc.listPaymentsForAdmin({});
    expect(b.captured.opts.where.countryCode).toBeUndefined();
  });

  it('clamps the page size and orders newest first', async () => {
    const { svc, captured } = makeService();
    await svc.listPaymentsForAdmin({ page: 2, limit: 900 });
    expect(captured.opts.take).toBe(100);
    expect(captured.opts.skip).toBe(100);
    expect(captured.opts.order).toMatchObject({ createdAt: 'DESC' });
  });

  it('refuses a scope that is not a market this platform knows', async () => {
    const { svc, paymentRepo } = makeService();
    await expect(svc.listPaymentsForAdmin({ scope: 'ZZ' })).rejects.toThrow(ForbiddenException);
    expect(paymentRepo.findAndCount).not.toHaveBeenCalled();
  });
});
