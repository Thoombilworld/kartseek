import { HttpException, HttpStatus } from '@nestjs/common';
import { DEFAULT_REGION } from '@app/region';

/**
 * Wire methods the platform can actually settle today.
 *
 * Mirrors `SETTLEABLE_METHODS` in `packages/shared-core/src/localization/payments.ts`.
 * Nothing calls `POST /payments/initiate`, order-service does not debit the
 * customer wallet, and no PSP is configured — so a card, Apple Pay or bank
 * transfer "payment" used to place an order that nobody ever paid for and that
 * the customer had no way to pay afterwards. Grow this list only when the
 * corresponding settlement path exists (wallet debit → add `WALLET`; a PSP →
 * add `CARD` and the wallet brands).
 */
export const SETTLEABLE_WIRE_METHODS: readonly string[] = ['COD'];

/**
 * Cash-on-delivery ceiling per market, in that market's own currency.
 * Mirrors `COD_LIMITS` in shared-core; riders carry the float, so this is an
 * operational limit rather than a regulatory one.
 */
const COD_LIMITS: Record<string, number> = {
  QA: 5000,
  AE: 5000,
  SA: 5000,
  BH: 500,
  KW: 400,
  OM: 500,
  IN: 50000,
};

export function getCodLimit(regionCode: string | undefined): number {
  const region = String(regionCode || DEFAULT_REGION).toUpperCase();
  return COD_LIMITS[region] ?? COD_LIMITS[DEFAULT_REGION];
}

/**
 * Refuse an order whose payment nothing will collect.
 *
 * The browser hides such methods too, but a request can name any method it
 * likes; this is the check that keeps an unpaid order out of the system.
 * `amount` is what the customer owes after discounts and gift cards.
 */
export function assertSettleablePayment(
  method: string | undefined,
  amount: number,
  regionCode: string | undefined,
): void {
  const wire = String(method ?? '')
    .trim()
    .toUpperCase();
  if (!SETTLEABLE_WIRE_METHODS.includes(wire)) {
    throw new HttpException(
      'This payment method is not available yet. Please choose cash on delivery.',
      HttpStatus.BAD_REQUEST,
    );
  }
  const limit = getCodLimit(regionCode);
  if (wire === 'COD' && Number(amount) > limit) {
    throw new HttpException(
      `Cash on delivery is available on orders up to ${limit} in ${String(regionCode || DEFAULT_REGION).toUpperCase()}.`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
