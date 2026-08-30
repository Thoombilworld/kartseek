import type { TranslationKeys } from '../types';

/**
 * Qatar — English wording that differs from base English.
 *
 * Applied over `en` by `useTranslation` when the active region is QA. Only keys
 * that genuinely differ belong here; everything else falls through to `en`.
 * Namespaces are merged key-by-key, so a partial namespace is fine.
 */
const enQa: Partial<TranslationKeys> = {
  common: {
    currency: 'Qatari Riyal (QR)',
    country: 'Qatar',
  } as TranslationKeys['common'],

  cart: {
    // Qatar has not implemented VAT, so a tax line would be misleading.
    tax: 'Tax',
    taxIncluded: 'No VAT applies in Qatar',
    taxExcluded: 'No VAT applies in Qatar',
  } as TranslationKeys['cart'],
};

export default enQa;
