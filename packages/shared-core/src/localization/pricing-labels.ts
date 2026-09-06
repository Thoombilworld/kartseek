import { getCountry } from './countries';

/**
 * What a market calls the struck-through reference price.
 *
 * "MRP" (Maximum Retail Price) is an Indian legal concept — the printed
 * ceiling a product may be sold at — and Indian shoppers expect to see it.
 * Nowhere else does it exist: Qatar, the UAE and Saudi Arabia price
 * tax-inclusive with a plain "was" / list price and a discount off it, and a
 * British or American shopper reads "RRP" / "list price". The database column
 * keeps its historical name (`mrp`); only the customer-facing wording changes.
 */
export interface ListPriceLabels {
  /** Short label beside the struck-through figure, e.g. "M.R.P." / "Was". */
  short: string;
  /** Full noun for sentences, e.g. "maximum retail price" / "list price". */
  noun: string;
  /** Savings line, e.g. "You save (MRP)" / "You save on list price". */
  savings: string;
}

const LABELS: Record<string, ListPriceLabels> = {
  IN: { short: 'M.R.P.', noun: 'maximum retail price', savings: 'You save (MRP)' },
  GB: { short: 'RRP', noun: 'recommended retail price', savings: 'You save on RRP' },
  US: { short: 'List', noun: 'list price', savings: 'You save on list price' },
};

const GCC_DEFAULT: ListPriceLabels = {
  short: 'Was',
  noun: 'list price',
  savings: 'You save on list price',
};

export function getListPriceLabels(country?: string): ListPriceLabels {
  return LABELS[getCountry(country).code] ?? GCC_DEFAULT;
}
