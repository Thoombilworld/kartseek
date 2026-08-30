/// KARTSEEK — Region-aware payment methods
///
/// Which methods a customer is offered is a property of the region they are
/// checking out in, not of the module they are buying from. Offering UPI in
/// Doha or Himyan in Delhi is not a cosmetic problem: the gateway rejects the
/// charge, so the order fails at the last step.

import { getCountry } from './countries';
import { formatMoney } from './currency';
import type { PaymentMethodSpec, PaymentMethodType } from './types';

export interface PaymentContext {
  country?: string;
  language?: string;
  /** Order total, used to drop methods outside their supported range. */
  amount?: number;
  /** Module placing the order — some methods are not available everywhere. */
  module?: string;
  /** Available balance, so the wallet option can be hidden when empty. */
  walletBalance?: number;
}

/**
 * Modules where cash on delivery is never offered.
 *
 * A consultation or a hotel booking has no rider to hand cash to, and a taxi
 * settles in-vehicle rather than through checkout.
 */
const NO_COD_MODULES = new Set(['doctor', 'hotel-booking', 'taxi']);

/**
 * The payment methods available for a checkout.
 *
 * Returns them in display order with the region's default first, so the
 * checkout can render the list without knowing anything about the region.
 */
export function getPaymentMethods(ctx: PaymentContext = {}): PaymentMethodSpec[] {
  const country = getCountry(ctx.country);

  const methods = country.payments.filter((m) => {
    if (m.type === 'cod' && ctx.module && NO_COD_MODULES.has(ctx.module)) return false;
    if (m.type === 'wallet' && ctx.walletBalance !== undefined && ctx.walletBalance <= 0) return false;
    if (ctx.amount !== undefined) {
      if (m.minAmount !== undefined && ctx.amount < m.minAmount) return false;
      if (m.maxAmount !== undefined && ctx.amount > m.maxAmount) return false;
    }
    return true;
  });

  return [...methods].sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));
}

/** The method pre-selected at checkout — the region's default, or the first available. */
export function getDefaultPaymentMethod(ctx: PaymentContext = {}): PaymentMethodSpec | undefined {
  const methods = getPaymentMethods(ctx);
  return methods.find((m) => m.isDefault) ?? methods[0];
}

export function getPaymentMethod(type: PaymentMethodType, country?: string): PaymentMethodSpec | undefined {
  return getCountry(country).payments.find((m) => m.type === type);
}

/** Guard used before submitting an order — a method must be live in the region. */
export function isPaymentMethodAvailable(type: string, ctx: PaymentContext = {}): boolean {
  return getPaymentMethods(ctx).some((m) => m.type === type);
}

export function getPaymentLabel(method: PaymentMethodSpec, language?: string): string {
  return language === 'ar' && method.labelAr ? method.labelAr : method.label;
}

/** Domestic schemes (Himyan/NAPS in Qatar, UPI in India, KNET in Kuwait). */
export function getLocalPaymentMethods(country?: string): PaymentMethodSpec[] {
  return getCountry(country).payments.filter((m) => m.isLocal);
}

/**
 * The wire value the payment service expects for a method.
 *
 * The backend records a coarse settlement channel, not the consumer-facing
 * brand, so the domestic debit schemes all map onto `CARD` while cash, wallet
 * and bank transfer stay distinct.
 */
const WIRE_METHOD: Record<PaymentMethodType, string> = {
  card: 'CARD',
  debit_national: 'CARD',
  mada: 'CARD',
  knet: 'CARD',
  benefit: 'CARD',
  apple_pay: 'WALLET_APPLE',
  google_pay: 'WALLET_GOOGLE',
  samsung_pay: 'WALLET_SAMSUNG',
  telecom_wallet: 'WALLET_TELECOM',
  wallet: 'WALLET',
  cod: 'COD',
  bank_transfer: 'BANK_TRANSFER',
  upi: 'UPI',
  netbanking: 'NETBANKING',
  sadad: 'BANK_TRANSFER',
  paynow: 'BANK_TRANSFER',
  grabpay: 'WALLET',
  ach: 'BANK_TRANSFER',
};

export function toWirePaymentMethod(type: string): string {
  return WIRE_METHOD[type as PaymentMethodType] ?? 'ONLINE';
}

/** Gateway that settles a method in a region — used to route the charge. */
export function getGatewayFor(type: string, country?: string): string {
  return getPaymentMethod(type as PaymentMethodType, country)?.gateway ?? 'stripe';
}

/**
 * Cash-on-delivery ceiling per region.
 *
 * Riders carry the float, so the cap is an operational limit rather than a
 * regulatory one. Expressed in the region's own currency.
 */
const COD_LIMITS: Record<string, number> = {
  QA: 5000, AE: 5000, SA: 5000, BH: 500, KW: 400, OM: 500, IN: 50000,
};

export function getCodLimit(country?: string): number | null {
  return COD_LIMITS[getCountry(country).code] ?? null;
}

/** Human-readable reason a method cannot be used for this order, if any. */
export function getPaymentRestriction(
  method: PaymentMethodSpec,
  ctx: PaymentContext = {},
): string | null {
  const country = getCountry(ctx.country);

  if (method.type === 'cod' && ctx.amount !== undefined) {
    const limit = getCodLimit(country.code);
    if (limit !== null && ctx.amount > limit) {
      return `Cash on delivery is available on orders up to ${formatMoney(limit, { country: country.code, language: ctx.language })}`;
    }
  }
  if (method.type === 'wallet' && ctx.walletBalance !== undefined && ctx.amount !== undefined && ctx.walletBalance < ctx.amount) {
    return `Wallet balance ${formatMoney(ctx.walletBalance, { country: country.code, language: ctx.language })} does not cover this order`;
  }
  if (method.minAmount !== undefined && ctx.amount !== undefined && ctx.amount < method.minAmount) {
    return `Minimum order for ${method.label} is ${formatMoney(method.minAmount, { country: country.code, language: ctx.language })}`;
  }
  return null;
}
