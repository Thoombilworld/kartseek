import { describe, expect, it } from 'vitest';
import { calculateTaxBreakdown } from './tax-breakdown';

describe('calculateTaxBreakdown', () => {
  it('splits India GST into equal CGST and SGST halves of the registered 18 %', () => {
    expect(calculateTaxBreakdown(1000, 'IN')).toEqual([
      { taxType: 'CGST', rate: 0.09, amount: 90 },
      { taxType: 'SGST', rate: 0.09, amount: 90 },
    ]);
  });

  it("uses each market's registered rate and label", () => {
    expect(calculateTaxBreakdown(1000, 'GB')).toEqual([{ taxType: 'VAT', rate: 0.2, amount: 200 }]);
    expect(calculateTaxBreakdown(1000, 'SA')).toEqual([{ taxType: 'VAT', rate: 0.15, amount: 150 }]);
    expect(calculateTaxBreakdown(1000, 'BH')).toEqual([{ taxType: 'VAT', rate: 0.1, amount: 100 }]);
    expect(calculateTaxBreakdown(1000, 'AE')).toEqual([{ taxType: 'VAT', rate: 0.05, amount: 50 }]);
    expect(calculateTaxBreakdown(1000, 'SG')).toEqual([{ taxType: 'GST', rate: 0.09, amount: 90 }]);
    expect(calculateTaxBreakdown(1000, 'US')).toEqual([{ taxType: 'Sales Tax', rate: 0.08875, amount: 88.75 }]);
  });

  it('returns no lines where the market levies no tax', () => {
    expect(calculateTaxBreakdown(1000, 'QA')).toEqual([]);
    expect(calculateTaxBreakdown(1000, 'KW')).toEqual([]);
  });

  it('returns no lines for a code the platform does not operate in', () => {
    expect(calculateTaxBreakdown(1000, 'KE')).toEqual([]);
    // The ISO code for the United Kingdom is GB; 'UK' never arrives from RegionService.
    expect(calculateTaxBreakdown(1000, 'UK')).toEqual([]);
    expect(calculateTaxBreakdown(1000, '')).toEqual([]);
  });

  it('rounds each line to the cent', () => {
    expect(calculateTaxBreakdown(1234.56, 'AE')).toEqual([{ taxType: 'VAT', rate: 0.05, amount: 61.73 }]);
    expect(calculateTaxBreakdown(1234.56, 'IN')).toEqual([
      { taxType: 'CGST', rate: 0.09, amount: 111.11 },
      { taxType: 'SGST', rate: 0.09, amount: 111.11 },
    ]);
  });
});
