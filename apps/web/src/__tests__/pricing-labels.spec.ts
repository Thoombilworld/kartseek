/**
 * What each market calls the struck-through reference price.
 *
 * "MRP" is an Indian legal concept — the printed ceiling a product may be
 * sold at. Showing "You save (MRP)" to a shopper in Doha or Dubai names a
 * concept their market does not have; they expect a plain "was" price. The
 * database column keeps its name, only the wording changes.
 */

import { getListPriceLabels } from '@/lib/localization/pricing-labels';

describe('getListPriceLabels', () => {
  it('calls it MRP only in India', () => {
    const india = getListPriceLabels('IN');
    expect(india.short).toBe('M.R.P.');
    expect(india.savings).toMatch(/MRP/);
  });

  it('shows the Gulf markets a plain list price, never MRP', () => {
    for (const code of ['QA', 'AE', 'SA', 'BH', 'KW', 'OM']) {
      const labels = getListPriceLabels(code);
      expect(labels.short).toBe('Was');
      expect(JSON.stringify(labels)).not.toMatch(/MRP/i);
    }
  });

  it('uses each Western market’s own convention', () => {
    expect(getListPriceLabels('GB').short).toBe('RRP');
    expect(getListPriceLabels('US').short).toBe('List');
  });

  it('falls back to the default market for an unknown or missing code', () => {
    const fallback = getListPriceLabels(undefined);
    expect(fallback).toEqual(getListPriceLabels('ZZ'));
    expect(fallback.short).toBeTruthy();
  });
});
