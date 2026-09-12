import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { PaymentGatewayController } from './payment.controller';

/**
 * `POST /payments/refund` and the four invoice routes are administrative.
 *
 * The gap this pins shut (whole-branch review, finding A-7): the class binds
 * `@UseGuards(JwtAuthGuard, RolesGuard)`, but these five routes declared no
 * `@Roles` — and the gateway guard returns `true` when there is no metadata
 * (`guards/roles.guard.ts:32-34`). So **any authenticated caller** could read
 * any invoice by id, void any invoice, and initiate a refund on any payment,
 * across every market: `payment.service.ts` `initiateRefund` checks only the
 * payment's status and refundable amount, never ownership, role or market. The
 * six settlement and reconciliation routes directly below them were correctly
 * gated, which is what made the gap easy to read past — and the class comment
 * asserted refunds were among them.
 *
 * Neither regression collector can see this shape: the paths carry no `admin`
 * segment, and the class carries no class-level `@Roles`. "Every route in a
 * `RolesGuard`-bound class declares a role" was measured as a candidate rule
 * and reports 80 routes, almost all legitimate (the restaurant storefront,
 * customer payment routes, `libs/gdpr`'s subject-scoped routes) — so the five
 * are pinned here, by name, against the controller's own source.
 */
const SOURCE = fs.readFileSync(path.join(__dirname, 'payment.controller.ts'), 'utf8');

/** The declaration block of one route: from its `@<Verb>('path')` to the body. */
function blockFor(decorator: string): string {
  const at = SOURCE.indexOf(decorator);
  expect(at, `${decorator} is no longer a route on payment.controller.ts`).toBeGreaterThan(-1);
  // Back up over the decorators that sit ABOVE the verb line (@Roles goes
  // there), then forward far enough to reach the handler body.
  const from = SOURCE.lastIndexOf('\n\n', at);
  return SOURCE.slice(from, at + 900);
}

const ADMIN_ROLE =
  /@Roles\([^)]*UserRole\.(?:ADMIN|SUPER_ADMIN)[^)]*UserRole\.(?:ADMIN|SUPER_ADMIN)/;
const PERM_KEY = /@Roles\([^)]*'perm:[a-z.]+'/;

describe('the five administrative payment routes declare a role', () => {
  it.each([
    ["@Post('refund')", 'perm:orders.refund'],
    ["@Get('invoices/:invoiceId')", 'perm:finance.view'],
    ["@Get('invoices/payment/:paymentId')", 'perm:finance.view'],
    ["@Post('invoices/:invoiceId/pdf')", 'perm:finance.reports'],
    ["@Post('invoices/:invoiceId/void')", 'perm:finance.payouts'],
  ])('%s carries both admin roles and %s', (decorator, key) => {
    const block = blockFor(decorator);
    expect(block).toMatch(ADMIN_ROLE);
    expect(block).toMatch(PERM_KEY);
    expect(block).toContain(`'${key}'`);
  });

  it.each([
    ["@Post('refund')"],
    ["@Get('invoices/:invoiceId')"],
    ["@Get('invoices/payment/:paymentId')"],
    ["@Post('invoices/:invoiceId/pdf')"],
    ["@Post('invoices/:invoiceId/void')"],
  ])('%s resolves the caller market and forwards the scope', (decorator) => {
    const block = blockFor(decorator);
    expect(block).toContain('this.scopeOf(');
    expect(block).toMatch(/\bscope,/);
  });

  it('no longer claims in its class comment that refunds are gated when they are not', () => {
    // The wrong comment is why the gap survived two review rounds: it named
    // refunds as one of the gated routes, so a reader checking the class had
    // already been told the answer.
    expect(SOURCE).not.toContain('routes (refunds, settlements, reconciliation)');
  });
});

/** A controller with a stub client, so the forwarded payload is observable. */
function build() {
  const sent: Array<{ cmd: string; data: any }> = [];
  const ctrl = Object.create(PaymentGatewayController.prototype) as any;
  Object.assign(ctrl, {
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    paymentClient: {},
  });
  ctrl.send = vi.fn(async (cmd: string, data: any) => {
    sent.push({ cmd, data });
    return { ok: true };
  });
  return { ctrl, sent };
}

const req = (user: object, url = '/payments/refund') => ({
  user,
  method: 'POST',
  originalUrl: url,
  headers: {},
});
const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };

describe('an administrative payment route forwards the caller market', () => {
  it('sends the locked admin market as the scope on a refund', async () => {
    const { ctrl, sent } = build();
    await ctrl.initiateRefund(req(qaAdmin), { paymentId: 'p-1', amount: 10, reason: 'r' });
    expect(sent[0].cmd).toBe('initiate_refund');
    expect(sent[0].data.scope).toBe('QA');
    expect(sent[0].data.countryCode).toBe('QA');
  });

  it('sends no scope for a global admin, and no market predicate either', async () => {
    const { ctrl, sent } = build();
    await ctrl.initiateRefund(req(globalAdmin), { paymentId: 'p-1', amount: 10, reason: 'r' });
    expect(sent[0].data.scope).toBeUndefined();
    expect(sent[0].data.countryCode).toBeUndefined();
  });

  it('does not let the body carry its own scope past the gateway', async () => {
    // `scope` is the gateway's own word for "this caller is locked", and it is
    // written from the token, never read from the body: a body key of that name
    // reaching payment-service would be indistinguishable from one the gateway
    // resolved. `countryCode` is different — it is a declared filter, and a
    // GLOBAL admin naming a market is exactly what it is for, so it survives.
    // The locked caller's case is the invoice test below: refused, not filtered.
    const { ctrl, sent } = build();
    await ctrl.initiateRefund(req(globalAdmin), {
      paymentId: 'p-1',
      amount: 10,
      reason: 'r',
      scope: 'QA',
      countryCode: 'IN',
    } as any);
    expect(sent[0].data.scope).toBeUndefined();
    expect(sent[0].data.countryCode).toBe('IN');
  });

  it('takes the refund actor from the token, not from the body', async () => {
    const { ctrl, sent } = build();
    await ctrl.initiateRefund(
      { ...req({ ...globalAdmin, userId: 'u-real' }), body: {} } as any,
      { paymentId: 'p-1', amount: 10, reason: 'r', initiatedBy: 'someone-else' } as any,
    );
    expect(sent[0].data.initiatedBy).toBe('u-real');
  });

  it('refuses a locked admin who names another market on an invoice read', async () => {
    const { ctrl, sent } = build();
    await expect(
      ctrl.getInvoice(req(qaAdmin, '/payments/invoices/i-1'), 'i-1', 'IN'),
    ).rejects.toThrow(ForbiddenException);
    expect(sent).toHaveLength(0);
  });

  it('forwards the scope on a void so the invoice market is asserted by the service', async () => {
    const { ctrl, sent } = build();
    await ctrl.voidInvoice(req(qaAdmin, '/payments/invoices/i-1/void'), 'i-1', 'duplicate');
    expect(sent[0].cmd).toBe('void_invoice');
    expect(sent[0].data.scope).toBe('QA');
  });

  it('forwards the scope on an invoice pdf and on an invoice-by-payment read', async () => {
    const { ctrl, sent } = build();
    await ctrl.generateInvoicePdf(req(qaAdmin, '/payments/invoices/i-1/pdf'), 'i-1');
    await ctrl.getInvoiceByPayment(req(qaAdmin, '/payments/invoices/payment/p-1'), 'p-1');
    expect(sent.map((s) => `${s.cmd}:${s.data.scope}`)).toEqual([
      'generate_invoice_pdf:QA',
      'get_invoice_by_payment:QA',
    ]);
  });
});
