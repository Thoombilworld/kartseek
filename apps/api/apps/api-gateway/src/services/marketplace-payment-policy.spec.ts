import { describe, expect, it } from 'vitest';
import { HttpException } from '@nestjs/common';
import { assertSettleablePayment, getCodLimit } from './marketplace-payment-policy';

/**
 * Checkout used to accept any payment method and mark the order placed — with
 * no PSP, no wallet debit and no way for the customer to pay later. These pin
 * the server-side half of the rule; the browser hides the same methods.
 */
describe('assertSettleablePayment', () => {
  it('accepts cash on delivery within the regional ceiling', () => {
    expect(() => assertSettleablePayment('COD', 4999, 'QA')).not.toThrow();
    expect(() => assertSettleablePayment('cod', 100, 'in')).not.toThrow();
  });

  it('refuses cash on delivery above the ceiling', () => {
    expect(() => assertSettleablePayment('COD', 5960, 'QA')).toThrow(HttpException);
    expect(() => assertSettleablePayment('COD', 50001, 'IN')).toThrow(HttpException);
  });

  it('refuses every method that nothing settles', () => {
    for (const m of [
      'CARD',
      'WALLET_APPLE',
      'WALLET_GOOGLE',
      'BANK_TRANSFER',
      'ONLINE',
      'WALLET',
      'UPI',
      '',
      undefined,
    ]) {
      expect(() => assertSettleablePayment(m, 100, 'QA')).toThrow(HttpException);
    }
  });

  it('falls back to the home market ceiling when no region is known', () => {
    expect(getCodLimit(undefined)).toBe(5000);
    expect(getCodLimit('ZZ')).toBe(5000);
    expect(() => assertSettleablePayment('COD', 5001, undefined)).toThrow(HttpException);
  });
});
