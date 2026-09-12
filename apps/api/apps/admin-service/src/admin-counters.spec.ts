import { describe, it, expect, vi } from 'vitest';
import { AdminService } from './admin.service';

function svcWithRedis() {
  const keys: string[] = [];
  const redis = {
    get: vi.fn(async () => '0'),
    set: vi.fn(async (k: string) => void keys.push(k)),
    incrbyfloat: vi.fn(async (k: string) => void keys.push(k)),
    getJson: vi.fn(async () => null),
    setJson: vi.fn(async () => undefined),
  };
  const svc = Object.create(AdminService.prototype) as AdminService;
  Object.assign(svc, { redis, logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } });
  return { svc, redis, keys };
}

describe('dashboard counters carry a market', () => {
  it('buckets revenue and orders per market', async () => {
    const { svc, keys } = svcWithRedis();
    await (svc as any).incrementCounter('revenue', 100, 'QA');
    await (svc as any).incrementCounter('orders', 1, 'IN');
    expect(keys.some((k) => k.includes(':QA:'))).toBe(true);
    expect(keys.some((k) => k.includes(':IN:'))).toBe(true);
  });

  it('buckets an event with no market under GLOBAL rather than mixing it in', async () => {
    const { svc, keys } = svcWithRedis();
    await (svc as any).incrementCounter('revenue', 5);
    expect(keys.every((k) => k.includes(':GLOBAL:'))).toBe(true);
  });

  it('never writes the old unsegmented key shape', async () => {
    const { svc, keys } = svcWithRedis();
    await (svc as any).incrementCounter('revenue', 5, 'QA');
    expect(keys.some((k) => /^admin:counter:revenue:\d{4}-\d{2}-\d{2}$/.test(k))).toBe(false);
  });
});
