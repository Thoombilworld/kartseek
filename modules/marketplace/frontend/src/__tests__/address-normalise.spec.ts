/**
 * The address book renders whatever user-service stored, which is not the
 * shape the page's own form produces: rows carry `label` instead of `type`, and
 * an address saved in another market carries that market's fields. Both used
 * to crash or garble the page; these cases pin the normaliser that sits between
 * the API row and the card.
 */
import { normaliseSavedAddress } from '@/app/addresses/normalise';

const INDIAN = {
  id: 'ADDR-1',
  label: 'Home',
  fullName: 'Test Customer',
  phone: '+919999999999',
  line1: '14 MG Road',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
  country: 'IN',
  isDefault: true,
};
const QATARI = {
  id: 'ADDR-2',
  type: 'work',
  fullName: 'Test Customer',
  phone: '66301482',
  buildingNumber: '12',
  streetNumber: '223',
  zoneNumber: '55',
  area: 'Al Sadd',
  city: 'Doha',
  country: 'QA',
};

describe('normaliseSavedAddress', () => {
  it('maps label→type and never yields an unknown type', () => {
    expect(normaliseSavedAddress(INDIAN, 'QA').type).toBe('home');
    expect(normaliseSavedAddress(QATARI, 'QA').type).toBe('work');
    expect(normaliseSavedAddress({ id: 'x' }, 'QA').type).toBe('other');
  });

  it('renders an address in its own country format, marked foreign for the viewer', () => {
    const row = normaliseSavedAddress(INDIAN, 'QA');
    expect(row.foreign).toBe(true);
    expect(row.country).toBe('IN');
    const text = row.lines.join(' | ');
    expect(text).toContain('Mumbai');
    expect(text).toContain('400001');
    expect(text).toContain('India');
    expect(row.name).toBe('Test Customer');
    expect(row.isDefault).toBe(true);
  });

  it('renders a home-market address without a country line', () => {
    const row = normaliseSavedAddress(QATARI, 'QA');
    expect(row.foreign).toBe(false);
    expect(row.lines.some((l) => /Zone 55/.test(l))).toBe(true);
    expect(row.lines.some((l) => /Qatar/.test(l))).toBe(false);
    expect(row.isDefault).toBe(false);
  });

  it('treats a row with no country as the viewer market', () => {
    const row = normaliseSavedAddress({ id: 'ADDR-3', fullName: 'A', line1: 'Somewhere' }, 'qa');
    expect(row.country).toBe('QA');
    expect(row.foreign).toBe(false);
  });

  it('survives rows with no address fields at all', () => {
    expect(() => normaliseSavedAddress({ id: 'empty' }, 'QA')).not.toThrow();
    expect(normaliseSavedAddress({ id: 'empty' }, 'QA').lines).toEqual([]);
  });
});
