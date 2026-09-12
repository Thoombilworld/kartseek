import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PaymentOrchestratorService } from '../payment.service';

/**
 * A refund and an invoice belong to a market, and the row is what says so.
 *
 * The gateway resolves the caller's market and forwards `scope`; that is the
 * claim, and this service is where it is checked against the row. Until the
 * final fix wave neither `POST /payments/refund` nor any of the four invoice
 * routes declared a role at all (whole-branch review, finding A-7), so there
 * was nothing to check them for. Now that the gateway forwards a scope, the
 * assert has to exist here too — a gateway-only check is one URL away from
 * being no check, and this service is reachable directly over TCP.
 *
 * `payments.countryCode` and `invoices.countryCode` have carried the market
 * since they were created (`entities/payment.entity.ts:204`,
 * `entities/invoice.entity.ts:169`) — the same columns the R6/R11 settlement
 * and dashboard predicates read. `assertInMarket` normalises both sides, so a
 * sub-region ('QA-DOH') resolves to its country and a code the registry cannot
 * read is treated as unattributed and refused for a locked caller.
 */

function invoiceSvc(invoice: any) {
  const invoiceRepo = {
    findOne: vi.fn(async () => invoice),
    save: vi.fn(async (i: any) => i),
  };
  const svc = Object.create(InvoiceService.prototype) as InvoiceService;
  Object.assign(svc, {
    invoiceRepo,
    paymentRepo: { findOne: vi.fn(async () => null) },
    kafka: { publish: vi.fn(async () => undefined) },
    redis: { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) },
    logger: { warn: vi.fn(), log: vi.fn(), error: vi.fn() },
  });
  return { svc, invoiceRepo };
}

const qaInvoice = {
  id: 'i-1',
  invoiceNumber: 'INV-QA1',
  countryCode: 'QA',
  status: 'ISSUED',
  pdfStorageKey: 'invoices/i-1.pdf',
};
const inInvoice = { ...qaInvoice, id: 'i-2', invoiceNumber: 'INV-IN1', countryCode: 'IN' };

describe('an invoice read is refused outside the caller market', () => {
  it('getInvoiceById returns the invoice to an admin locked to its market', async () => {
    const { svc } = invoiceSvc(qaInvoice);
    await expect(svc.getInvoiceById('i-1', 'QA')).resolves.toMatchObject({ id: 'i-1' });
  });

  it('getInvoiceById refuses an invoice in another market', async () => {
    const { svc } = invoiceSvc(inInvoice);
    await expect(svc.getInvoiceById('i-2', 'QA')).rejects.toThrow(ForbiddenException);
  });

  it('getInvoiceById is unchanged for a global caller', async () => {
    const { svc } = invoiceSvc(inInvoice);
    await expect(svc.getInvoiceById('i-2')).resolves.toMatchObject({ id: 'i-2' });
  });

  it('normalises a sub-region on the row, like every other market comparison', async () => {
    const { svc } = invoiceSvc({ ...qaInvoice, countryCode: 'QA-DOH' });
    await expect(svc.getInvoiceById('i-1', 'QA')).resolves.toMatchObject({ id: 'i-1' });
  });

  it('refuses a row whose market the registry cannot read, rather than widening', async () => {
    const { svc } = invoiceSvc({ ...qaInvoice, countryCode: 'NOT-A-COUNTRY' });
    await expect(svc.getInvoiceById('i-1', 'QA')).rejects.toThrow(ForbiddenException);
  });

  it('getInvoiceByPayment refuses another market and keeps returning null for a miss', async () => {
    const { svc } = invoiceSvc(inInvoice);
    await expect(svc.getInvoiceByPayment('p-2', 'QA')).rejects.toThrow(ForbiddenException);
    const { svc: none } = invoiceSvc(null);
    await expect(none.getInvoiceByPayment('p-9', 'QA')).resolves.toBeNull();
  });

  it('voidInvoice refuses another market and does not save', async () => {
    const { svc, invoiceRepo } = invoiceSvc(inInvoice);
    await expect(svc.voidInvoice('i-2', 'duplicate', 'QA')).rejects.toThrow(ForbiddenException);
    expect(invoiceRepo.save).not.toHaveBeenCalled();
  });

  it('generatePdf refuses another market and does not save a signed url', async () => {
    const { svc, invoiceRepo } = invoiceSvc(inInvoice);
    await expect(svc.generatePdf('i-2', 'QA')).rejects.toThrow(ForbiddenException);
    expect(invoiceRepo.save).not.toHaveBeenCalled();
  });

  it('still 404s a missing invoice before it says anything about a market', async () => {
    const { svc } = invoiceSvc(null);
    await expect(svc.getInvoiceById('nope', 'QA')).rejects.toThrow(NotFoundException);
  });
});

function refundSvc(payment: any) {
  const svc = Object.create(PaymentOrchestratorService.prototype) as PaymentOrchestratorService;
  const adapter = { refund: vi.fn(async () => ({ success: false, error: 'stub' })) };
  Object.assign(svc, {
    paymentRepo: { findOne: vi.fn(async () => payment), save: vi.fn(async (p: any) => p) },
    gatewayFactory: { getAdapterByName: () => adapter },
    kafka: { publish: vi.fn(async () => undefined) },
    redis: { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) },
    logger: { warn: vi.fn(), log: vi.fn(), error: vi.fn() },
  });
  return { svc, adapter };
}

const qaPayment = {
  id: 'p-1',
  paymentNumber: 'PAY-QA1',
  countryCode: 'QA',
  status: 'SUCCESS',
  amount: 100,
  refundedAmount: 0,
  currency: 'QAR',
  gateway: 'stripe',
  gatewayPaymentId: 'ch_1',
};

describe('a refund is refused outside the caller market', () => {
  it('refuses a payment in another market before the gateway adapter is reached', async () => {
    const { svc, adapter } = refundSvc({ ...qaPayment, countryCode: 'IN', currency: 'INR' });
    await expect(
      (svc as any).initiateRefund({
        paymentId: 'p-1',
        amount: 10,
        reason: 'r',
        initiatedBy: 'u-qa',
        scope: 'QA',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(adapter.refund).not.toHaveBeenCalled();
  });

  it('allows a payment in the caller own market through to the adapter', async () => {
    const { svc, adapter } = refundSvc(qaPayment);
    await (svc as any)
      .initiateRefund({
        paymentId: 'p-1',
        amount: 10,
        reason: 'r',
        initiatedBy: 'u-qa',
        scope: 'QA',
      })
      .catch(() => undefined);
    expect(adapter.refund).toHaveBeenCalled();
  });

  it('refuses a payment with no readable market for a locked caller', async () => {
    const { svc, adapter } = refundSvc({ ...qaPayment, countryCode: null });
    await expect(
      (svc as any).initiateRefund({
        paymentId: 'p-1',
        amount: 10,
        reason: 'r',
        initiatedBy: 'u-qa',
        scope: 'QA',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(adapter.refund).not.toHaveBeenCalled();
  });

  it('is unchanged for a global caller', async () => {
    const { svc, adapter } = refundSvc({ ...qaPayment, countryCode: 'IN' });
    await (svc as any)
      .initiateRefund({ paymentId: 'p-1', amount: 10, reason: 'r', initiatedBy: 'u-g' })
      .catch(() => undefined);
    expect(adapter.refund).toHaveBeenCalled();
  });
});
