/// KARTSEEK — Region-aware money formatting
///
/// Every price the platform renders goes through here, so the active region is
/// the only thing that decides the symbol, the decimals and the grouping.
/// In Qatar that means `QR 1,234.50` in English and `١٬٢٣٤٫٥٠ ر.ق` in Arabic.

import { getCountry } from './countries';
import { getLanguage } from './languages';
import type { CountryCode, LanguageCode } from './types';

export interface MoneyFormatOptions {
  /** Region whose currency and grouping to use. Defaults to the active region. */
  country?: string;
  /** Language the amount is rendered in — decides symbol form and digit shapes. */
  language?: string;
  /** Force a currency different from the country's own (e.g. an admin GMV roll-up). */
  currencyCode?: string;
  /** `QAR 1,234.50` instead of `QR 1,234.50`. */
  showCode?: boolean;
  /** `QR 1.2K` for dashboard tiles. */
  compact?: boolean;
  /** Override the currency's natural minor units. */
  decimals?: number;
  /** Render Arabic-Indic digits when the language is Arabic. Off by default —
   *  prices read better in Latin digits even in Arabic Gulf storefronts. */
  nativeDigits?: boolean;
}

/**
 * Format an amount as money for a region.
 *
 * @example
 * formatMoney(1234.5, { country: 'QA' })                  // "QR 1,234.50"
 * formatMoney(1234.5, { country: 'QA', language: 'ar' })  // "1,234.50 ر.ق"
 * formatMoney(1234.5, { country: 'QA', showCode: true })  // "QAR 1,234.50"
 * formatMoney(1234.5, { country: 'IN' })                  // "₹ 1,234.50"
 * formatMoney(1.2345, { country: 'KW' })                  // "KD 1.235"  (3 minor units)
 */
export function formatMoney(amount: number | string, opts: MoneyFormatOptions = {}): string {
  const country = getCountry(opts.country);
  const currency = country.currency;
  const language = opts.language ?? country.defaultLanguage;
  const lang = getLanguage(language);

  const decimals = opts.decimals ?? currency.decimals;
  // Coerce before the finite check. Postgres `numeric`/`decimal` columns come
  // back from TypeORM as strings ("134900.00"), and every price on the wire —
  // `mrp`, `sellingPrice`, order totals — is one of those. `Number.isFinite`
  // does not coerce, so a perfectly good price string used to fall through to
  // the `0` branch and render as "QR 0.00" / "₹ 0.00" with no error anywhere.
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  const value = Number.isFinite(numeric) ? numeric : 0;

  // Arabic renders the symbol after the number and, when asked, in Arabic-Indic
  // digits. `ar` alone gives Arabic-Indic digits, so pin the numbering system
  // explicitly rather than relying on the locale default.
  const useArabic = lang.rtl && !!currency.symbolAr;
  const numberLocale = useArabic
    ? (opts.nativeDigits ? 'ar-QA' : 'ar-QA-u-nu-latn')
    : currency.grouping === 'indian' ? 'en-IN' : 'en-US';

  let formatted: string;
  if (opts.compact && Math.abs(value) >= 1000) {
    formatted = new Intl.NumberFormat(numberLocale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } else {
    formatted = new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  const unit = opts.showCode
    ? (opts.currencyCode ?? currency.code)
    : useArabic
      ? currency.symbolAr!
      : currency.symbol;

  // Arabic puts the currency after the amount; everything here puts it before.
  const after = useArabic || currency.position === 'after';
  return after ? `${formatted} ${unit}` : `${unit} ${formatted}`;
}

/** The symbol alone, in the form appropriate to the active language. */
export function getCurrencySymbolFor(country?: string, language?: string): string {
  const c = getCountry(country);
  const useArabic = getLanguage(language ?? c.defaultLanguage).rtl && !!c.currency.symbolAr;
  return useArabic ? c.currency.symbolAr! : c.currency.symbol;
}

export function getCurrencyCode(country?: string): string {
  return getCountry(country).currency.code;
}

export function getCurrencyDecimals(country?: string): number {
  return getCountry(country).currency.decimals;
}

/**
 * Round to the currency's minor unit.
 *
 * The Gulf dinars have three minor units, so a 2-decimal round would silently
 * drop a fils from every Kuwaiti or Bahraini total.
 */
export function roundToCurrency(amount: number, country?: string): number {
  const factor = 10 ** getCurrencyDecimals(country);
  return Math.round(amount * factor) / factor;
}

/** Plain number, region-grouped, with no currency unit. */
export function formatNumberFor(value: number, country?: string, decimals = 0): string {
  const c = getCountry(country);
  const locale = c.currency.grouping === 'indian' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

// ─── Tax ─────────────────────────────────────────────────────────────────────

export interface TaxBreakdown {
  /** Price excluding tax. */
  netAmount: number;
  taxAmount: number;
  /** What the customer pays. */
  grossAmount: number;
  label: string;
  rate: number;
  inclusive: boolean;
  /** False in Qatar — no consumption tax applies, so no tax line is shown. */
  applies: boolean;
}

/**
 * Tax breakdown for an amount in a region.
 *
 * Qatar has no VAT, so this returns `applies: false` and the checkout omits the
 * tax row entirely rather than printing a misleading "VAT 0.00".
 */
export function calculateTaxFor(amount: number, country?: string): TaxBreakdown {
  const { tax } = getCountry(country);
  const value = Number.isFinite(amount) ? amount : 0;

  if (tax.rate === 0) {
    return {
      netAmount: value, taxAmount: 0, grossAmount: value,
      label: tax.name, rate: 0, inclusive: tax.inclusive, applies: false,
    };
  }

  const rate = tax.rate / 100;
  if (tax.inclusive) {
    const net = value / (1 + rate);
    return {
      netAmount: roundToCurrency(net, country),
      taxAmount: roundToCurrency(value - net, country),
      grossAmount: value,
      label: `${tax.name} (${tax.rate}%)`, rate: tax.rate, inclusive: true, applies: true,
    };
  }

  const taxAmount = roundToCurrency(value * rate, country);
  return {
    netAmount: value,
    taxAmount,
    grossAmount: roundToCurrency(value + taxAmount, country),
    label: `${tax.name} (${tax.rate}%)`, rate: tax.rate, inclusive: false, applies: true,
  };
}

export function getTaxLabelFor(country?: string): string {
  const { tax } = getCountry(country);
  return tax.rate === 0 ? '' : `${tax.name} (${tax.rate}%)`;
}

// ─── Cross-region conversion (admin roll-ups) ────────────────────────────────

/**
 * Indicative USD rates, used only so the Super Admin panel can add up GMV
 * across regions. Never used on a customer-facing price — those are always
 * quoted and settled in the region's own currency.
 *
 * QAR, SAR, AED and the Gulf dinars are pegged, so these are stable; the
 * floating ones are refreshed from `/localization/exchange-rates`.
 */
export const INDICATIVE_USD_RATES: Record<string, number> = {
  QAR: 0.2747, SAR: 0.2667, AED: 0.2723, BHD: 2.6596, KWD: 3.2600,
  OMR: 2.5974, INR: 0.0120, GBP: 1.2700, USD: 1.0000, SGD: 0.7400,
};

export function convertToUsd(amount: number, fromCurrency: string, rates = INDICATIVE_USD_RATES): number {
  return amount * (rates[fromCurrency.toUpperCase()] ?? 1);
}

/** Sum amounts held in different regional currencies into one USD total. */
export function sumAcrossRegions(
  entries: Array<{ amount: number; country: CountryCode | string }>,
  rates = INDICATIVE_USD_RATES,
): number {
  return entries.reduce(
    (sum, e) => sum + convertToUsd(e.amount, getCurrencyCode(e.country), rates),
    0,
  );
}
