/**
 * Which payment methods can actually settle an order.
 *
 * Checkout used to offer every method the market supports and mark the order
 * placed whichever was chosen — but nothing on the platform initiates a card,
 * wallet-brand or bank payment, and the customer had no way to pay afterwards.
 * These pin the client-side half of the rule; the gateway enforces the same
 * list in marketplace-payment-policy.ts.
 */
import { getPaymentMethods, getPaymentRestriction, isSettleable } from '@/lib/localization';

describe('settleable payment methods', () => {
  it('only cash on delivery can settle an order until a PSP is connected', () => {
    expect(isSettleable('cod')).toBe(true);
    for (const t of [
      'card',
      'apple_pay',
      'google_pay',
      'bank_transfer',
      'debit_national',
      'wallet',
      'upi',
    ]) {
      expect(isSettleable(t)).toBe(false);
    }
  });

  it('marks every other method as unavailable when settlement is required', () => {
    const ctx = { country: 'QA', amount: 100, requireSettleable: true };
    const methods = getPaymentMethods(ctx);
    const blocked = methods.filter((m) => m.type !== 'cod');
    expect(blocked.length).toBeGreaterThan(0);
    for (const m of blocked) {
      expect(getPaymentRestriction(m, ctx)).toMatch(/not available yet/i);
    }
    const cod = methods.find((m) => m.type === 'cod');
    expect(cod).toBeDefined();
    expect(getPaymentRestriction(cod!, ctx)).toBeNull();
  });

  it('does not change other modules that do not ask for settlement', () => {
    const card = getPaymentMethods({ country: 'QA', amount: 100 }).find((m) => m.type === 'card');
    expect(card).toBeDefined();
    expect(getPaymentRestriction(card!, { country: 'QA', amount: 100 })).toBeNull();
  });

  it('still applies the cash-on-delivery ceiling', () => {
    const cod = getPaymentMethods({ country: 'QA' }).find((m) => m.type === 'cod')!;
    expect(
      getPaymentRestriction(cod, { country: 'QA', amount: 5960, requireSettleable: true }),
    ).toMatch(/up to/);
  });
});
