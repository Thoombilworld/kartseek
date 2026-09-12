import { describe, it, expect, vi } from 'vitest';
import { GroceryService } from './grocery.service';

function service() {
  const purged: string[] = [];
  const redis = {
    del: vi.fn(async (k: string) => void purged.push(k)),
    delPattern: vi.fn(async (p: string) => (purged.push(p), 0)),
    getJson: vi.fn(async () => null),
    setJson: vi.fn(async () => undefined),
  };
  const svc = Object.create(GroceryService.prototype) as GroceryService;
  Object.assign(svc, {
    redis,
    categoryRepo: { find: vi.fn(async () => [{ id: 'c-1' }]), save: vi.fn() },
    kafka: { publish: vi.fn(async () => undefined) },
    logger: { log: vi.fn(), warn: vi.fn() },
  });
  return { svc, purged };
}

describe('grocery category invalidation reaches the per-market keys', () => {
  it('purges stocked and tree alongside the unscoped key', async () => {
    const { svc, purged } = service();
    await svc.invalidateCategoryCache();
    expect(purged).toContain('grocery:categories:all');
    // Without these two, every region's narrowed category view stayed stale for
    // the full 300 s after a rename or a deactivation (audit C §3).
    expect(purged).toContain('grocery:categories:stocked:*');
    expect(purged).toContain('grocery:categories:tree:*');
  });

  it('the taxonomy migration purges the same three — it had the larger blast radius', async () => {
    const { svc, purged } = service();
    await (svc as any).purgeCategoryKeys();
    expect(purged).toEqual(
      expect.arrayContaining([
        'grocery:categories:all',
        'grocery:categories:stocked:*',
        'grocery:categories:tree:*',
      ]),
    );
  });
});
