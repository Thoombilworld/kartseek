import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  ADMIN_ORDER_STATUSES,
  ADMIN_PAYMENT_STATUSES,
  ADMIN_REFUND_STATUSES,
  ADMIN_RETURN_STATUSES,
} from '@app/common';
import {
  AdminOrdersQueryDto,
  AdminPaymentsQueryDto,
  AdminRefundsQueryDto,
  AdminReturnsQueryDto,
} from './admin-orders.dto';

/**
 * The status filter, as the admin console actually sends it.
 *
 * These five routes answered a literal until M1, so `?status=` never reached a
 * database and nobody discovered that three surfaces spell the same state three
 * ways. The values below are copied from the console's own option lists; if a
 * page's dropdown changes, this spec is where the mismatch surfaces, rather
 * than as an empty table nobody can explain.
 */
function parse<T extends object>(cls: new () => T, query: Record<string, unknown>) {
  const dto = plainToInstance(cls, query, { enableImplicitConversion: true });
  return { dto, errors: validateSync(dto as object, { whitelist: true }) };
}

const CONSOLE = {
  // apps/web/src/app/admin/marketplace/orders/page.tsx — the status dropdown
  orders: ['processing', 'delivered', 'pending', 'cancelled'],
  // apps/web/src/app/admin/marketplace/returns/page.tsx — the filter buttons
  returns: ['Requested', 'Approved', 'Picked Up', 'Refund Initiated', 'Completed', 'Rejected'],
  // apps/web/src/app/admin/marketplace/refunds/page.tsx — the filter buttons
  refunds: ['Pending', 'Processing', 'Completed', 'Failed', 'Rejected'],
};

describe('the status filter is folded to the wire before it is validated', () => {
  it("accepts the orders console's lowercase values and upper-cases them", () => {
    // Three of the console's four name a real order state in the wrong case.
    // Before the fold, every one of them was a 400 on the page this task exists
    // to fix — `order.service.ts` does `.toUpperCase()` and the DTO refused
    // before that line could run.
    for (const value of ['delivered', 'pending', 'cancelled']) {
      const { dto, errors } = parse(AdminOrdersQueryDto, { status: value });
      expect(errors, `console sends ?status=${value}`).toHaveLength(0);
      expect(dto.status).toBe(value.toUpperCase());
    }
  });

  it('turns a space into an underscore, so "Picked Up" is PICKED_UP', () => {
    const { dto, errors } = parse(AdminReturnsQueryDto, { status: 'Picked Up' });
    expect(errors).toHaveLength(0);
    expect(dto.status).toBe('PICKED_UP');
  });

  it('treats the "All" option — an empty string — as no filter at all', () => {
    // Every one of these pages uses `''` for All. `@IsOptional` only skips a
    // value that is absent, so without the fold to `undefined` the platform's
    // own "show everything" button would be a 400.
    for (const cls of [AdminOrdersQueryDto, AdminReturnsQueryDto, AdminRefundsQueryDto]) {
      const { dto, errors } = parse(cls, { status: '' });
      expect(errors).toHaveLength(0);
      expect((dto as { status?: string }).status).toBeUndefined();
    }
  });

  it('refuses a status this platform does not have, naming the set', () => {
    const { errors } = parse(AdminOrdersQueryDto, { status: 'shipped-ish' });
    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors[0].constraints)).toContain('DELIVERED');
  });

  it('bounds the search term and the requested market', () => {
    expect(parse(AdminOrdersQueryDto, { search: 'x'.repeat(200) }).errors).toHaveLength(1);
    expect(parse(AdminOrdersQueryDto, { country: 'x'.repeat(20) }).errors).toHaveLength(1);
    expect(parse(AdminOrdersQueryDto, { search: 'ORD-1', country: 'QA' }).errors).toHaveLength(0);
  });

  it('caps the page size instead of letting a caller ask for the whole table', () => {
    expect(parse(AdminOrdersQueryDto, { limit: 5000 }).errors).toHaveLength(1);
    expect(parse(AdminOrdersQueryDto, { page: 0 }).errors).toHaveLength(1);
    const ok = parse(AdminOrdersQueryDto, { page: '2', limit: '50' });
    expect(ok.errors).toHaveLength(0);
    expect(ok.dto.page).toBe(2);
    expect(ok.dto.limit).toBe(50);
  });

  it('accepts the payment statuses payment-service actually stores', () => {
    expect(parse(AdminPaymentsQueryDto, { status: 'success' }).dto.status).toBe('SUCCESS');
    expect(parse(AdminPaymentsQueryDto, { status: 'escrow hold' }).errors).toHaveLength(0);
  });

  /**
   * The two console vocabularies that name no state the platform has.
   *
   * Recorded as a test rather than a comment so the list cannot rot: each of
   * these is a 400 today, deliberately — silently matching nothing is the lie
   * M1 exists to remove — and repointing the pages is the CONSOLE task's work.
   * When a page is fixed, this test fails and the entry comes out.
   */
  it('records the console values that name no state, so the list stays honest', () => {
    const unknownOrders = CONSOLE.orders.filter(
      (v) => parse(AdminOrdersQueryDto, { status: v }).errors.length > 0,
    );
    // The order path's own word for this state is PREPARING.
    expect(unknownOrders).toEqual(['processing']);

    const unknownReturns = CONSOLE.returns.filter(
      (v) => parse(AdminReturnsQueryDto, { status: v }).errors.length > 0,
    );
    expect(unknownReturns).toEqual(['Refund Initiated', 'Completed']);

    const unknownRefunds = CONSOLE.refunds.filter(
      (v) => parse(AdminRefundsQueryDto, { status: v }).errors.length > 0,
    );
    expect(unknownRefunds).toEqual(['Processing', 'Completed', 'Failed']);
  });
});

/**
 * The gateway holds a copy of three vocabularies it cannot import — the return
 * enum is declared on a marketplace entity, the refund and payment ones on
 * their own services' enums. A copy is only honest while something compares it
 * to the original, so this reads those files and fails when they drift.
 *
 * Each source is asserted to exist first: a path that silently resolves to
 * nothing would make every one of these pass by reading an empty string.
 */
const REPO = path.join(__dirname, '..', '..', '..', '..', '..', '..');
function source(...parts: string[]): string {
  const file = path.join(REPO, ...parts);
  expect(fs.existsSync(file), `expected to find ${file}`).toBe(true);
  return fs.readFileSync(file, 'utf8');
}
/** The UPPER_SNAKE string literals inside one `enum: [...]` array or enum body. */
function members(block: string): string[] {
  return [...block.matchAll(/'([A-Z][A-Z0-9_]*)'/g)].map((m) => m[1]);
}

describe("the gateway's copy of each status vocabulary matches its owner", () => {
  it('orders come from the shared constant, so there is no copy to drift', () => {
    const dto = source('apps/api/apps/order-service/src/dto/admin-order.dto.ts');
    expect(dto).toContain("from '@app/common'");
    expect(ADMIN_ORDER_STATUSES).toContain('DELIVERED');
  });

  it('returns match marketplace.return_requests.status', () => {
    const entity = source('modules/marketplace/backend/src/entities/return-request.entity.ts');
    const block = entity.slice(entity.indexOf("enum: [\n      'REQUESTED'"));
    const declared = members(block.slice(0, block.indexOf(']')));
    expect(declared.length).toBeGreaterThan(5);
    expect([...ADMIN_RETURN_STATUSES]).toEqual(declared);
  });

  it("refunds match refund-service's RefundStatus", () => {
    const svc = source('apps/api/apps/refund-service/src/refund.service.ts');
    const block = svc.slice(svc.indexOf('export enum RefundStatus'));
    const declared = members(block.slice(0, block.indexOf('}')));
    expect(declared.length).toBeGreaterThan(3);
    expect([...ADMIN_REFUND_STATUSES]).toEqual(declared);
  });

  it("payments match payment-service's PaymentStatus", () => {
    const entity = source('apps/api/apps/payment-service/src/entities/payment.entity.ts');
    const block = entity.slice(entity.indexOf('export enum PaymentStatus'));
    const declared = members(block.slice(0, block.indexOf('}')));
    expect(declared.length).toBeGreaterThan(5);
    expect([...ADMIN_PAYMENT_STATUSES]).toEqual(declared);
  });
});
