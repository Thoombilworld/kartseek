/**
 * `matchesRegion` is the pure predicate `useMarketplaceRegionFilter` filters
 * with. Its default branch used to INCLUDE a row with no region-related field
 * — a Super Admin "viewing QA" saw every unattributable row under a QA
 * heading and could not tell which figures were actually Qatar's (audit
 * V13/F-32). This flips the default to exclusion and pins the field
 * spellings a row's market has shown up under across the admin console.
 */
import { matchesRegion } from '@/hooks/useMarketplaceRegionFilter';

describe('useMarketplaceRegionFilter', () => {
  it('excludes a row with no region-related field when a region is selected', () => {
    expect(matchesRegion({ id: 'x' }, 'QA')).toBe(false);
  });

  it('includes a row in the selected region, by any of the field spellings', () => {
    for (const row of [
      { regionCode: 'QA' },
      { region_code: 'qa' },
      { countryCode: 'QA' },
      { country: 'QA' },
    ]) {
      expect(matchesRegion(row, 'QA')).toBe(true);
    }
  });

  it('includes everything when no region is selected', () => {
    expect(matchesRegion({ id: 'x' }, undefined)).toBe(true);
  });

  it('excludes a row from another market', () => {
    expect(matchesRegion({ regionCode: 'IN' }, 'QA')).toBe(false);
  });

  it("treats 'ALL' the same as no region selected", () => {
    expect(matchesRegion({ id: 'x' }, 'ALL')).toBe(true);
  });

  it('resolves a human-readable country name, not only an ISO code', () => {
    expect(matchesRegion({ country: 'Qatar' }, 'QA')).toBe(true);
    expect(matchesRegion({ country: 'India' }, 'QA')).toBe(false);
  });
});
