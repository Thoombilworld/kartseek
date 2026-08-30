import type { TranslationKeys } from '../types';

/**
 * Qatar — Arabic wording that differs from base Arabic.
 *
 * Applied over `ar` by `useTranslation` when the active region is QA.
 */
const arQa: Partial<TranslationKeys> = {
  common: {
    currency: 'ريال قطري (ر.ق)',
    country: 'قطر',
  } as TranslationKeys['common'],

  cart: {
    tax: 'الضريبة',
    taxIncluded: 'لا تُطبّق ضريبة القيمة المضافة في قطر',
    taxExcluded: 'لا تُطبّق ضريبة القيمة المضافة في قطر',
  } as TranslationKeys['cart'],
};

export default arQa;
