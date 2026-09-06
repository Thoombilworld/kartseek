import { getRegionConfig } from '@app/region';

export interface TaxLine {
  taxType: string;
  rate: number;
  amount: number;
}

const toCents = (value: number): number => Math.round(value * 100) / 100;

/**
 * Tax lines for the platform commission on one payment.
 *
 * Rates and labels come from the region registry (`REGION_CONFIGS[code].tax`
 * in `@app/region`), which exists so that a market's tax rule lives in one
 * place. The private table this replaced had drifted from it: it keyed on
 * 'UK' although `payment.countryCode` is the ISO code 'GB', carried a dead
 * duplicate `case 'IN'`, put Saudi Arabia at 5 % against the registered 15 %,
 * and knew nothing of Bahrain, Kuwait, Oman or the US.
 *
 * India's GST is invoiced as two equal halves, CGST and SGST; every other
 * market gets one line under the registry's label. A zero rate (Qatar,
 * Kuwait) or an unknown code yields no lines.
 *
 * The tax is added on top of the commission for every market, as it always
 * was here. The registry's `isInclusive` flag describes how consumer prices
 * are displayed and is deliberately not applied to commission invoices.
 */
export function calculateTaxBreakdown(commissionAmount: number, countryCode: string): TaxLine[] {
  const tax = getRegionConfig(countryCode)?.tax;
  if (!tax || tax.rate <= 0) return [];
  const rate = tax.rate / 100;

  if (countryCode === 'IN') {
    const half = rate / 2;
    const amount = toCents(commissionAmount * half);
    return [
      { taxType: 'CGST', rate: half, amount },
      { taxType: 'SGST', rate: half, amount },
    ];
  }

  return [{ taxType: tax.name, rate, amount: toCents(commissionAmount * rate) }];
}
