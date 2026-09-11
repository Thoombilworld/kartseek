import { describe, it, expect, vi } from 'vitest';
import { AuditLogService } from './audit-log.service';

/**
 * `AuditLogService.query` — the one filtered read the admin console uses.
 *
 * The service could already answer "the last N entries", "one actor's entries"
 * and "one entity's entries", each as its own method with its own hardcoded
 * filter. None of them took a market, so a region-locked administrator asking
 * for the audit trail saw every market's administrative actions — the console's
 * own audit page was rendering a seed array precisely because no endpoint could
 * answer the question it needed to ask.
 *
 * Scoping is enforced here rather than at the gateway because the gateway can
 * only ask; a filter it forgets to pass is a filter Mongo never applies. The
 * `scope` key overrides whatever `country` the caller named.
 */
function modelWith(rows: unknown[]) {
  const calls: Record<string, any>[] = [];
  /** What `.skip()` / `.limit()` were actually handed, so the clamp is observable. */
  const paging: { skip?: number; limit?: number } = {};
  const chain: any = {
    sort: () => chain,
    skip: (n: number) => {
      paging.skip = n;
      return chain;
    },
    limit: (n: number) => {
      paging.limit = n;
      return chain;
    },
    lean: async () => rows,
  };
  const model = {
    find: vi.fn((f: Record<string, any>) => {
      calls.push(f);
      return chain;
    }),
    countDocuments: vi.fn(async () => rows.length),
  };
  return { model, calls, paging };
}

/**
 * The service without its constructor: `query` needs only the model, and
 * building the Nest module would drag in a live Mongo connection for a test
 * about which filter object is handed to `find`.
 *
 * `paginate` is deliberately **not** stubbed. It is the server-side clamp — the
 * only thing standing between a non-gateway caller asking for `limit: 1e6` and
 * the whole collection — so replacing it with an identity function would have
 * left the one defence that does not exist at the gateway asserted nowhere.
 */
function serviceWith(model: unknown): AuditLogService {
  const svc = Object.create(AuditLogService.prototype) as AuditLogService;
  Object.assign(svc, { auditModel: model });
  return svc;
}

/** Run `logEvent` against a capturing model and return the document it wrote. */
async function logEventOn(dto: Record<string, unknown>): Promise<Record<string, any>> {
  const created: Record<string, any>[] = [];
  const svc = Object.create(AuditLogService.prototype) as AuditLogService;
  Object.assign(svc, {
    auditModel: {
      create: async (doc: Record<string, any>) => {
        created.push(doc);
        return { _id: 'x1', get: () => undefined };
      },
    },
    redis: { getJson: async () => null, setJson: async () => 'OK' },
    logger: { warn: () => undefined },
  });
  await svc.logEvent(dto);
  return created[0];
}

describe('AuditLogService.query', () => {
  it('forces a locked admin onto their market, plus rows that belong to every market', async () => {
    const { model, calls } = modelWith([]);
    // A Qatar-locked admin asking for India: `scope` wins, `country` is ignored.
    await serviceWith(model).query({ country: 'IN', scope: 'QA' });
    // Deliberately not `'UNKNOWN'`: rows recorded without a market are a global
    // admin's activity the gateway could not attribute, and a locked admin has
    // no claim on them. Plan A fails closed on unattributable records; so does
    // the trail that records it.
    expect(calls[0].country).toEqual({ $in: ['QA', 'ALL'] });
  });

  it('lets an unscoped caller filter by market, uppercased', async () => {
    const { model, calls } = modelWith([]);
    await serviceWith(model).query({ country: 'in' });
    expect(calls[0].country).toBe('IN');
  });

  it('applies actor, entity and date filters', async () => {
    const { model, calls } = modelWith([]);
    await serviceWith(model).query({
      actorId: 'u1',
      entityType: 'sellers',
      from: '2026-09-01',
      to: '2026-09-02',
    });
    expect(calls[0]).toMatchObject({ actorId: 'u1', entityType: 'sellers' });
    expect(calls[0].createdAt.$gte).toBeInstanceOf(Date);
    expect(calls[0].createdAt.$lte).toBeInstanceOf(Date);
  });

  it('matches an action type as a prefix, with regex metacharacters escaped', async () => {
    const { model, calls } = modelWith([]);
    // `http.post./admin/...` is the shape the gateway interceptor writes; the
    // dots are literal, so an unescaped pattern would match far more than asked.
    await serviceWith(model).query({ actionType: 'http.post.' });
    expect(calls[0].actionType).toEqual({ $regex: '^http\\.post\\.' });
  });

  it('lower-cases an actor email so a filter typed in the console still matches', async () => {
    const { model, calls } = modelWith([]);
    await serviceWith(model).query({ actorEmail: 'QA-Admin@Kartseek.com' });
    expect(calls[0].actorEmail).toBe('qa-admin@kartseek.com');
  });

  it('normalises the market and the actor email on the way in', async () => {
    // The read path upper-cases `country` and lower-cases `actorEmail`. A writer
    // that sent `x-region-code: qa` therefore stored a row matching neither
    // `{ $in: ['QA', 'ALL'] }` nor `'QA'` — written, durable, and invisible to
    // every scoped query, which on an audit trail is the same as not written.
    const created = await logEventOn({
      actionType: 'console.note',
      actorId: 'u1',
      actorEmail: 'QA-Admin@Kartseek.com',
      country: 'qa',
    });
    expect(created.country).toBe('QA');
    expect(created.actorEmail).toBe('qa-admin@kartseek.com');
  });

  it("files a row that names no market as 'UNKNOWN', not as the empty string", async () => {
    const created = await logEventOn({ actionType: 'x', actorId: 'u1' });
    expect(created.country).toBe('UNKNOWN');
  });

  it('keeps a request id that arrived inside metadata', async () => {
    // Both real writers — the gateway's AuditInterceptor and the admin console —
    // nest `requestId` under `metadata`. `logEvent` used to assign the
    // *top-level* `dto.requestId` over it unconditionally, so every stored row
    // lost the id that correlates it with the gateway's log line for the same
    // request.
    const created = await logEventOn({
      actionType: 'console.note',
      actorId: 'u1',
      country: 'QA',
      metadata: { requestId: 'req-1', userAgent: 'Chrome', source: 'console' },
    });
    expect(created.metadata).toEqual({
      requestId: 'req-1',
      userAgent: 'Chrome',
      source: 'console',
    });
  });

  it('returns the page envelope the gateway forwards', async () => {
    const { model, paging } = modelWith([{ actionType: 'console.note' }]);
    const out = await serviceWith(model).query({ page: 2, limit: 10 });
    expect(out).toEqual({
      data: [{ actionType: 'console.note' }],
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(paging).toEqual({ skip: 10, limit: 10 });
  });

  it('clamps the page size in the service, not only at the gateway', async () => {
    // The gateway caps at 200 as well, but it is not the only caller that can
    // reach `audit.query` over TCP — and this service says in its own doc
    // comment that it is the enforcement point.
    const { model, paging } = modelWith([]);
    const out = await serviceWith(model).query({ limit: 1_000_000 });
    expect(out.limit).toBe(200);
    expect(paging.limit).toBe(200);
  });

  it('refuses a nonsense page or limit rather than paging from a NaN offset', async () => {
    const { model, paging } = modelWith([]);
    const out = await serviceWith(model).query({ page: -3, limit: 0 } as any);
    expect(out).toMatchObject({ page: 1, limit: 50 });
    expect(paging).toEqual({ skip: 0, limit: 50 });
  });

  it('drops a filter that is not a string instead of handing Mongo an operator', async () => {
    // `query` is reached over TCP, so its payload is whatever the caller
    // serialised. An object here would become a field-level operator
    // (`{ entityType: { $ne: 'x' } }`), and `.toLowerCase()` on a number threw a
    // TypeError the gateway reported as "Audit service unavailable".
    const { model, calls } = modelWith([]);
    await serviceWith(model).query({
      entityType: { $ne: 'sellers' },
      actorId: { $gt: '' },
      actorEmail: 42,
      actionType: ['x'],
      country: { $ne: 'QA' },
      scope: 'QA',
    } as any);
    expect(calls[0]).toEqual({ country: { $in: ['QA', 'ALL'] } });
  });

  it('ignores a date that does not parse rather than matching nothing', async () => {
    // An Invalid Date matches no document at all, so a typo in the console's
    // date box would empty the table and read as "no administrative activity".
    const { model, calls } = modelWith([]);
    await serviceWith(model).query({ from: 'not-a-date', to: '2026-09-02' });
    expect(calls[0].createdAt.$gte).toBeUndefined();
    expect(calls[0].createdAt.$lte).toBeInstanceOf(Date);
  });
});
