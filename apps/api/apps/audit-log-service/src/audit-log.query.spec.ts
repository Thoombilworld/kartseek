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

/**
 * An `'ALL'` row's PAYLOAD is not a locked reader's to see.
 *
 * The scope filter is `country ∈ [scope, 'ALL']`, as the B5 plan ruled: a
 * global action should be visible to a regional administrator rather than
 * invisible, because "nothing happened here" is the lie the trail exists to
 * prevent. That ruling stands — and it is a reason to disclose the FACT of the
 * action, not its contents (whole-branch review, finding A-4).
 *
 * A console row is stamped `scope ?? x-region-code ?? 'ALL'`
 * (`admin-audit.controller.ts:181`), so a global administrator acting with no
 * market selected files under `'ALL'` — and every regional administrator then
 * read that row's `metadata`, `reason`, `oldValue` and `newValue`: entity ids,
 * stated reasons and before/after values for actions taken in other markets.
 *
 * So an `'ALL'` row reaches a locked reader with its payload withheld and a
 * marker saying so, and with everything that makes it visible intact: who,
 * what action, on what kind of entity, when. A row in the reader's OWN market
 * is untouched.
 */
const rowsForRedaction = () => [
  {
    _id: 'a1',
    actionType: 'console.settings.update',
    actorId: 'u-global',
    actorEmail: 'ops@kartseek.com',
    actorRole: 'SUPER_ADMIN',
    entityType: 'settings',
    entityId: 'e-1',
    reason: 'raised the IN commission rate',
    metadata: { source: 'console', details: { from: 10, to: 12 } },
    oldValue: { rate: 10 },
    newValue: { rate: 12 },
    country: 'ALL',
  },
  {
    _id: 'a2',
    actionType: 'console.seller.approve',
    actorId: 'u-qa',
    actorEmail: 'qa@kartseek.com',
    entityType: 'sellers',
    entityId: 'e-2',
    reason: 'documents verified',
    metadata: { source: 'console' },
    oldValue: { status: 'PENDING' },
    newValue: { status: 'ACTIVE' },
    country: 'QA',
  },
];

describe('query withholds an ALL row payload from a locked reader', () => {
  it('keeps the fact of the action and drops the payload', async () => {
    const { model } = modelWith(rowsForRedaction());
    const res = await serviceWith(model).query({ scope: 'QA' });
    const [global] = res.data as any[];
    // Visible: who, what, on what, when — the reason the row is included.
    expect(global.actionType).toBe('console.settings.update');
    expect(global.actorId).toBe('u-global');
    expect(global.entityType).toBe('settings');
    expect(global.country).toBe('ALL');
    // Withheld, with a marker rather than a silent absence.
    expect(global.metadata).toEqual({
      withheld: 'platform-wide action; payload not in your market',
    });
    expect(global.reason).toBeUndefined();
    expect(global.oldValue).toBeUndefined();
    expect(global.newValue).toBeUndefined();
    expect(global.entityId).toBeUndefined();
  });

  it('leaves a row in the reader own market completely alone', async () => {
    const { model } = modelWith(rowsForRedaction());
    const res = await serviceWith(model).query({ scope: 'QA' });
    const own = (res.data as any[])[1];
    expect(own.reason).toBe('documents verified');
    expect(own.metadata).toEqual({ source: 'console' });
    expect(own.oldValue).toEqual({ status: 'PENDING' });
    expect(own.entityId).toBe('e-2');
  });

  it('leaves everything alone for a global reader', async () => {
    const { model } = modelWith(rowsForRedaction());
    const res = await serviceWith(model).query({});
    for (const row of res.data as any[]) {
      expect(row.metadata).not.toMatchObject({ withheld: expect.anything() });
    }
    expect((res.data as any[])[0].reason).toBe('raised the IN commission rate');
  });

  it('still counts the withheld row — the total is not a second leak in reverse', async () => {
    // Redacting in the projection rather than in the filter is deliberate: a
    // filter change would make the row vanish, and a locked admin comparing
    // page totals would learn nothing about whether a global action happened.
    const { model } = modelWith(rowsForRedaction());
    const res = await serviceWith(model).query({ scope: 'QA' });
    expect(res.total).toBe(2);
    expect(res.data).toHaveLength(2);
  });

  it('keeps the B5 filter exactly as ruled', async () => {
    const { model, calls } = modelWith(rowsForRedaction());
    await serviceWith(model).query({ scope: 'qa' });
    expect(calls[0].country).toEqual({ $in: ['QA', 'ALL'] });
  });
});
