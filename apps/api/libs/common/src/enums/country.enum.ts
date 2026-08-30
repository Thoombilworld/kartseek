export enum Country {
  INDIA = 'IN',
  UAE = 'AE',
  SAUDI_ARABIA = 'SA',
  QATAR = 'QA',
  KUWAIT = 'KW',
  OMAN = 'OM',
  BAHRAIN = 'BH',
  UK = 'GB',
  USA = 'US',
}

export const COUNTRY_CURRENCIES: Record<Country, string> = {
  [Country.INDIA]: 'INR',
  [Country.UAE]: 'AED',
  [Country.SAUDI_ARABIA]: 'SAR',
  [Country.QATAR]: 'QAR',
  [Country.KUWAIT]: 'KWD',
  [Country.OMAN]: 'OMR',
  [Country.BAHRAIN]: 'BHD',
  [Country.UK]: 'GBP',
  [Country.USA]: 'USD',
};

export const COUNTRY_TAX_LABELS: Record<Country, string> = {
  [Country.INDIA]: 'GST',
  [Country.UAE]: 'VAT',
  [Country.SAUDI_ARABIA]: 'VAT',
  [Country.QATAR]: 'Tax',
  [Country.KUWAIT]: 'CR',
  [Country.OMAN]: 'CR',
  [Country.BAHRAIN]: 'CR',
  [Country.UK]: 'VAT',
  [Country.USA]: 'Sales Tax',
};
