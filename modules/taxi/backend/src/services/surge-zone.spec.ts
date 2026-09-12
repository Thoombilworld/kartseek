import { describe, it, expect, vi } from 'vitest';
import { FareCalculationService } from './fare-calculation.service';
import { getH3Zone } from './h3-zone';

const DOHA = { lat: 25.2854, lng: 51.531 };
const MUMBAI = { lat: 19.076, lng: 72.8777 };

function service(demand: Record<string, string>, nearby = 1) {
  const reads: string[] = [];
  const redis = {
    get: vi.fn(async (k: string) => {
      reads.push(k);
      return demand[k] ?? null;
    }),
    georadius: vi.fn(async () => Array.from({ length: nearby }, (_, i) => `d-${i}`)),
  };
  const svc = Object.create(FareCalculationService.prototype) as FareCalculationService;
  Object.assign(svc, {
    redis,
    taxiConfig: { getRateCard: vi.fn(async () => null) },
    logger: { warn: vi.fn() },
  });
  return { svc, reads };
}

describe('surge is derived from the coordinates, not from a client zone id', () => {
  it('never reads the DEFAULT_ZONE bucket', async () => {
    const { svc, reads } = service({});
    await (svc as any).getSurgeForZone(DOHA.lat, DOHA.lng);
    expect(reads.some((k) => k.includes('DEFAULT_ZONE'))).toBe(false);
  });

  it('reads the same cell key ride-matching writes', async () => {
    const cell = getH3Zone(DOHA.lat, DOHA.lng);
    const { svc, reads } = service({ [`zone:demand:${cell}`]: '20' });
    await (svc as any).getSurgeForZone(DOHA.lat, DOHA.lng);
    expect(reads).toContain(`zone:demand:${cell}`);
  });

  it('a Mumbai demand spike does not raise the surge quoted in Doha', async () => {
    const mumbaiCell = getH3Zone(MUMBAI.lat, MUMBAI.lng);
    const dohaCell = getH3Zone(DOHA.lat, DOHA.lng);
    expect(mumbaiCell).not.toBe(dohaCell);
    const { svc } = service({ [`zone:demand:${mumbaiCell}`]: '500' }, 1);
    // Doha's own cell has no demand recorded, so the multiplier is the floor.
    await expect((svc as any).getSurgeForZone(DOHA.lat, DOHA.lng)).resolves.toBe(1.0);
  });

  it('the same spike in the rider own cell does raise it — the control', async () => {
    const dohaCell = getH3Zone(DOHA.lat, DOHA.lng);
    const { svc } = service({ [`zone:demand:${dohaCell}`]: '500' }, 1);
    await expect((svc as any).getSurgeForZone(DOHA.lat, DOHA.lng)).resolves.toBeGreaterThan(1.0);
  });

  it('takes no zoneId parameter at all', () => {
    const { svc } = service({});
    expect((svc as any).getSurgeForZone.length).toBe(2);
  });
});
