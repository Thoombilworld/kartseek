import { describe, it, expect } from 'vitest';
import { getH3Zone, getAdjacentZones } from './h3-zone';

const DOHA = { lat: 25.2854, lng: 51.531 };
const MUMBAI = { lat: 19.076, lng: 72.8777 };

describe('getH3Zone', () => {
  it('never puts two coordinates ~2,000km apart in the same cell', () => {
    expect(getH3Zone(MUMBAI.lat, MUMBAI.lng)).not.toBe(getH3Zone(DOHA.lat, DOHA.lng));
  });

  it('is stable — the same coordinate always derives the same cell', () => {
    const first = getH3Zone(DOHA.lat, DOHA.lng);
    const second = getH3Zone(DOHA.lat, DOHA.lng);
    expect(first).toBe(second);
  });
});

describe('getAdjacentZones', () => {
  it('returns self plus six neighbours, with self first', () => {
    const zones = getAdjacentZones(DOHA.lat, DOHA.lng);
    expect(zones).toHaveLength(7);
    expect(zones[0]).toBe(getH3Zone(DOHA.lat, DOHA.lng));
  });
});
