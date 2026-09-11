/**
 * `/admin/kyc-verification` shows the identity checks admin-service is holding,
 * and sends the two fields `KycDecisionDto` declares.
 *
 * What it used to show: `MOCK_QUEUE`, three invented applications seeded
 * straight into state, and — for every applicant, whatever they had submitted —
 * three hard-coded document cards with filenames and sizes under a heading that
 * counted them as "(3)". What it used to send: `adminId`, read from the
 * `adminUserId` localStorage key nothing writes, which the gateway's pipe now
 * answers with `property adminId should not exist`.
 *
 * Rendered with `react-dom/server` — this workspace's Jest runs
 * `testEnvironment: 'node'` and has neither `@testing-library/react` nor
 * `jest-environment-jsdom`. See `audit-logs-render.spec.ts`.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const getPendingKyc = jest.fn();
const approveKyc = jest.fn();
const rejectKyc = jest.fn();
const addAuditLog = jest.fn();

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    getPendingKyc: (...a: unknown[]) => getPendingKyc(...a),
    approveKyc: (...a: unknown[]) => approveKyc(...a),
    rejectKyc: (...a: unknown[]) => rejectKyc(...a),
    addAuditLog: (...a: unknown[]) => addAuditLog(...a),
  },
}));

let hookResult: { data: unknown; loading: boolean; error: string | null };

jest.mock('@/hooks/useAdminData', () => ({
  useAdminData: (fetcher: () => Promise<unknown>) => {
    void Promise.resolve(fetcher()).catch(() => undefined);
    return { ...hookResult, refetch: jest.fn(), toast: null, showToast: jest.fn() };
  },
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
  AdminToast: () => null,
  AdminLoadingSkeleton: () => React.createElement('div', null, 'loading-skeleton'),
  AdminErrorBanner: ({ error }: { error: string }) => React.createElement('div', null, error),
}));

const {
  default: Page,
  loadKycQueue,
  normalizeKycRow,
  keyOf,
} = require('../app/admin/kyc-verification/page');

/** A row shaped the way admin-service returns one. */
const ROW = {
  entityId: 'e-9001',
  entityType: 'pharmacy',
  businessName: 'Doha Wellness Pharmacy',
  ownerName: 'Noor Al-Sulaiti',
  country: 'QA',
  submittedAt: '2026-09-10T08:30:00.000Z',
  documents: [{ name: 'Trade licence', type: 'licence', url: 'https://files/x.pdf', size: '1 MB' }],
};

/** Strings that only ever existed in the deleted `MOCK_QUEUE` and its document cards. */
const FIXTURE_STRINGS = [
  'MediCare Plus Pharmacy',
  'Dr. Suresh Mehta',
  'The Spice Route Kitchen',
  'Priya Sharma',
  'CityRide Fleet Services',
  'Vikram S.',
  'PHRM-9921',
  'REST-8122',
  'TAXI-1102',
  '27AADCB2230M1Z2',
  'Drug License (Form 20/21)',
  'GST Registration Certificate',
  'Owner PAN Card',
  'license_doc_2025.pdf',
  'gst_cert.pdf',
  'pan_front.jpg',
  'PDF Preview Area',
  'Required for Pharmacy Operations',
];

const render = () => renderToStaticMarkup(React.createElement(Page));

beforeEach(() => {
  jest.clearAllMocks();
  getPendingKyc.mockResolvedValue({ success: true, data: { data: [ROW], total: 1 } });
  approveKyc.mockResolvedValue({ success: true, data: {} });
  rejectKyc.mockResolvedValue({ success: true, data: {} });
  addAuditLog.mockResolvedValue({ success: true, data: {} });
  hookResult = {
    data: { ok: true, records: [normalizeKycRow(ROW)], total: 1, undecidable: 0 },
    loading: false,
    error: null,
  };
});

describe('/admin/kyc-verification renders the API', () => {
  it('asks the queue route', async () => {
    render();
    await Promise.resolve();
    expect(getPendingKyc).toHaveBeenCalledWith({ limit: 100 });
  });

  it('renders the applicant the API returned', () => {
    const html = render();
    expect(html).toContain('Doha Wellness Pharmacy');
    expect(html).toContain('Noor Al-Sulaiti');
    expect(html).toContain('e-9001');
    expect(html).toContain('Trade licence');
  });

  it.each(FIXTURE_STRINGS)('no longer renders the fixture string %s', (needle) => {
    expect(render()).not.toContain(needle);
  });

  it('counts the documents the record carries, not three', () => {
    expect(render()).toContain('Submitted documents (1)');
    hookResult = {
      data: {
        ok: true,
        records: [normalizeKycRow({ ...ROW, documents: [] })],
        total: 1,
        undecidable: 0,
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('Submitted documents (0)');
    expect(html).toContain('carries no document list');
  });

  it('says the queue is empty rather than drawing an applicant', () => {
    hookResult = {
      data: { ok: true, records: [], total: 0, undecidable: 0 },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('No identity checks are waiting for a decision.');
    expect(html).toContain('Nothing selected');
  });

  it('names the rows it cannot decide instead of listing them as decidable', () => {
    hookResult = {
      data: { ok: true, records: [normalizeKycRow(ROW)], total: 2, undecidable: 1 },
      loading: false,
      error: null,
    };
    expect(render()).toContain('cannot be decided from here');
  });
});

describe('/admin/kyc-verification failure states', () => {
  it('shows a forbidden panel when the server answered and refused', () => {
    hookResult = {
      data: { ok: false, kind: 'forbidden', message: 'Missing required permissions: kyc.review' },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('You cannot open the identity-check queue.');
    expect(html).toContain('kyc.review');
    expect(html).not.toContain('is not connected.');
  });

  it('names the route when nobody answered', () => {
    hookResult = {
      data: { ok: false, kind: 'unreachable', message: 'Admin service unavailable' },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('The identity-check queue is not connected.');
    expect(html).toContain('GET /admin/kyc/pending');
  });

  it('shows the skeleton while asking, not an empty queue', () => {
    hookResult = { data: null, loading: true, error: null };
    const html = render();
    expect(html).toContain('loading-skeleton');
    expect(html).not.toContain('No identity checks are waiting');
  });
});

describe('a record is identified by type AND id', () => {
  /**
   * The Redis key is `admin:kyc:pending:<type>:<id>`, so the pair is the
   * identity. Selecting on `entityId` alone let two queued records under
   * different verticals pick each other — and `decide()` would then approve or
   * reject the wrong one under the right-looking name.
   */
  const A = { entityId: 'dup-1', entityType: 'pharmacy', businessName: 'Alpha Pharmacy' };
  const B = { entityId: 'dup-1', entityType: 'restaurant', businessName: 'Beta Kitchen' };

  it('keyOf distinguishes two records that share an entityId', () => {
    expect(keyOf(normalizeKycRow(A))).toBe('pharmacy:dup-1');
    expect(keyOf(normalizeKycRow(B))).toBe('restaurant:dup-1');
    expect(keyOf(normalizeKycRow(A))).not.toBe(keyOf(normalizeKycRow(B)));
  });

  it('renders both, and selects exactly one of them', () => {
    hookResult = {
      data: {
        ok: true,
        records: [normalizeKycRow(A), normalizeKycRow(B)],
        total: 2,
        undecidable: 0,
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('Alpha Pharmacy');
    expect(html).toContain('Beta Kitchen');
    // One row carries the selected border, not both.
    expect(html.match(/border-l-indigo-600/g)).toHaveLength(1);
  });

  it('never compares selections on entityId alone', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'admin', 'kyc-verification', 'page.tsx'),
      'utf8',
    );
    expect(source).not.toContain('r.entityId === selectedId');
  });
});

describe('normalizeKycRow', () => {
  it('drops a record with no id or type — it cannot be approved or rejected', () => {
    expect(normalizeKycRow({ businessName: 'Nameless' })).toBeNull();
    expect(normalizeKycRow({ entityId: 'x' })).toBeNull();
    expect(normalizeKycRow({ entityType: 'seller' })).toBeNull();
  });

  it('accepts the alternative key names a Redis record may carry', () => {
    const r = normalizeKycRow({ id: 'e-1', type: 'seller', name: 'Shop', regionCode: 'QA' });
    expect(r).toMatchObject({
      entityId: 'e-1',
      entityType: 'seller',
      businessName: 'Shop',
      country: 'QA',
    });
  });

  it('never invents a document list', () => {
    expect(normalizeKycRow({ entityId: 'e', entityType: 'seller' })!.documents).toEqual([]);
  });
});

describe('loadKycQueue', () => {
  it('classifies a refusal as forbidden and an outage as unreachable', async () => {
    getPendingKyc.mockResolvedValue({
      success: false,
      data: null,
      error: 'Missing required permissions: kyc.review',
    });
    expect(await loadKycQueue()).toMatchObject({ ok: false, kind: 'forbidden' });

    getPendingKyc.mockResolvedValue({
      success: false,
      data: null,
      error: 'Admin service unavailable',
    });
    expect(await loadKycQueue()).toMatchObject({ ok: false, kind: 'unreachable' });
  });

  it('counts the rows it had to drop', async () => {
    getPendingKyc.mockResolvedValue({
      success: true,
      data: { data: [ROW, { businessName: 'no id' }], total: 2 },
    });
    const res = await loadKycQueue();
    expect(res).toMatchObject({ ok: true, undecidable: 1 });
    expect(res.records).toHaveLength(1);
  });
});

/**
 * The bodies, against the real client rather than the mock: this is the
 * assertion that would have caught `adminId`.
 */
describe('the KYC bodies match KycDecisionDto', () => {
  const actual = jest.requireActual(
    '@/lib/api/admin-core',
  ) as typeof import('@/lib/api/admin-core');
  let sent: Array<{ url: string; method?: string; body: Record<string, unknown> | null }>;

  beforeEach(() => {
    sent = [];
    global.fetch = jest.fn(async (url: unknown, init: RequestInit = {}) => {
      sent.push({
        url: String(url),
        method: init.method,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
      });
      return { ok: true, json: async () => ({ success: true, data: {} }) } as unknown as Response;
    }) as unknown as typeof fetch;
  });

  it('approve posts entityType and nothing else', async () => {
    await actual.adminCoreApi.approveKyc('e-9001', 'pharmacy');
    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toContain('/admin/kyc/e-9001/approve');
    expect(sent[0].body).toEqual({ entityType: 'pharmacy' });
    expect(sent[0].body).not.toHaveProperty('adminId');
  });

  it('reject posts entityType and reason, and no adminId', async () => {
    await actual.adminCoreApi.rejectKyc('e-9001', 'pharmacy', 'Licence expired');
    expect(sent[0].body).toEqual({ entityType: 'pharmacy', reason: 'Licence expired' });
    expect(sent[0].body).not.toHaveProperty('adminId');
  });
});

describe('the page source', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'admin', 'kyc-verification', 'page.tsx'),
    'utf8',
  );

  // Declarations, not mentions: the file's own comment says what was deleted,
  // and that sentence is the record of why the page looks as it does.
  it('declares no fixture queue and reads no phantom localStorage key', () => {
    expect(source).not.toMatch(/const\s+MOCK_QUEUE/);
    expect(source).not.toContain('adminUserId');
    expect(source).not.toContain('localStorage');
  });

  it('builds no body carrying adminId', () => {
    expect(source).not.toMatch(/adminId\s*[,:}]/);
  });
});
