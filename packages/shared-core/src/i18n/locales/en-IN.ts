import type { TranslationKeys } from '../types';

/**
 * India — English wording that differs from base English.
 *
 * Applied over `en` by `useTranslation` when the active region is IN.
 */
const enIN: Partial<TranslationKeys> = {
  common: {
    currency: 'Indian Rupee (₹)',
    country: 'India',
  } as TranslationKeys['common'],

  cart: {
    tax: 'GST',
    taxIncluded: 'Inclusive of all taxes',
    taxExcluded: 'GST will be added at checkout',
  } as TranslationKeys['cart'],
};

export default enIN;
