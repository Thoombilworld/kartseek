import { of, throwError } from 'rxjs';
import { MarketplaceCatalogService } from './marketplace-catalog.service';

/**
 * The TCP fallback is invisible to callers by design — a dead gRPC channel costs
 * latency, not correctness. These tests pin the telemetry that makes it visible,
 * because without it a permanently-broken channel looks like "fine, just slower".
 */
describe('MarketplaceCatalogService', () => {
  let grpcImpl: any;
  let service: MarketplaceCatalogService;

  const build = (impl: any) => {
    const client: any = { getService: () => impl };
    const svc = new MarketplaceCatalogService(client);
    svc.onModuleInit();
    return svc;
  };

  beforeEach(() => {
    delete process.env.MARKETPLACE_GRPC_ENABLED;
    grpcImpl = {
      getCategories: jest.fn().mockReturnValue(of({ data: [{ id: 'c1' }] })),
      getHome: jest.fn().mockReturnValue(of({ categories: [] })),
      searchProducts: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
    };
    service = build(grpcImpl);
  });

  it('returns the gRPC payload when the channel is healthy', async () => {
    await expect(service.getCategories()).resolves.toEqual({ data: [{ id: 'c1' }] });
    expect(service.stats()).toMatchObject({ status: 'up', attempts: 1, failures: 0 });
  });

  it('returns null on failure so the caller falls back to TCP', async () => {
    grpcImpl.getCategories.mockReturnValue(throwError(() => new Error('UNAVAILABLE')));
    await expect(service.getCategories()).resolves.toBeNull();
  });

  it('reports degraded after a failure and recovers on the next success', async () => {
    grpcImpl.getCategories.mockReturnValue(throwError(() => new Error('UNAVAILABLE')));
    await service.getCategories();

    let stats = service.stats();
    expect(stats.status).toBe('degraded');
    expect(stats.failures).toBe(1);
    expect(stats.lastError).toContain('GetCategories');

    grpcImpl.getCategories.mockReturnValue(of({ data: [] }));
    await service.getCategories();

    stats = service.stats();
    expect(stats.status).toBe('up');
    expect(stats.consecutiveFailures).toBe(0);
    expect(stats.lastSuccessAt).toBeDefined();
  });

  it('reports down once failures pass the threshold', async () => {
    grpcImpl.getCategories.mockReturnValue(throwError(() => new Error('UNAVAILABLE')));
    for (let i = 0; i < 5; i++) await service.getCategories();

    const stats = service.stats();
    expect(stats.status).toBe('down');
    expect(stats.consecutiveFailures).toBe(5);
    expect(stats.fallbackRate).toBe(1);
  });

  it('tracks fallback rate across mixed outcomes', async () => {
    grpcImpl.getCategories
      .mockReturnValueOnce(of({ data: [] }))
      .mockReturnValueOnce(throwError(() => new Error('boom')))
      .mockReturnValueOnce(of({ data: [] }))
      .mockReturnValueOnce(of({ data: [] }));

    for (let i = 0; i < 4; i++) await service.getCategories();

    expect(service.stats()).toMatchObject({ attempts: 4, failures: 1, fallbackRate: 0.25 });
  });

  it('reports disabled and never calls gRPC when switched off', async () => {
    process.env.MARKETPLACE_GRPC_ENABLED = 'false';
    const off = build(grpcImpl);

    await expect(off.getCategories()).resolves.toBeNull();
    expect(off.stats().status).toBe('disabled');
  });

  it('reports disabled when no gRPC client is bound at all', async () => {
    const none = new MarketplaceCatalogService(undefined);
    none.onModuleInit();

    await expect(none.getHome()).resolves.toBeNull();
    expect(none.stats().status).toBe('disabled');
  });

  it('passes search arguments through to the RPC', async () => {
    await service.searchProducts('phone', 2, 50);
    expect(grpcImpl.searchProducts).toHaveBeenCalledWith({ query: 'phone', page: 2, limit: 50 });
  });
});
